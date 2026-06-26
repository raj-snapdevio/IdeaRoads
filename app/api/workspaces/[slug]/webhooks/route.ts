import { createId } from "@paralleldrive/cuid2";
import { type NextRequest, NextResponse } from "next/server";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { outboundWebhookEndpoints } from "@/db/schema";
import { audit } from "@/lib/audit";
import { getCurrentSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { encrypt, isEncryptionAvailable } from "@/lib/encrypt";
import { ALL_WEBHOOK_EVENTS } from "@/lib/webhooks/events";
import { listWebhookEndpoints } from "@/lib/webhooks/queries";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;

  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const member = await getWorkspaceMember(workspace.id, session.user.id);
  if (!member || member.role === WORKSPACE_MEMBER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const endpoints = await listWebhookEndpoints(workspace.id);
  // Never expose encrypted secret in list response
  const safe = endpoints.map(({ encryptedSecret: _, ...rest }) => rest);
  return NextResponse.json(
    { endpoints: safe },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params;

  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const member = await getWorkspaceMember(workspace.id, session.user.id);
  if (!member || member.role === WORKSPACE_MEMBER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isEncryptionAvailable()) {
    return NextResponse.json(
      { error: "Webhook signing is not available" },
      { status: 503 }
    );
  }

  let body: { url?: string; events?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.url || !body.url.startsWith("https://")) {
    return NextResponse.json(
      { error: "url must be a valid HTTPS URL" },
      { status: 400 }
    );
  }
  const events = body.events?.filter((e) =>
    (ALL_WEBHOOK_EVENTS as string[]).includes(e)
  );
  if (!events?.length) {
    return NextResponse.json(
      { error: "events must be a non-empty array of valid event types" },
      { status: 400 }
    );
  }

  const rawSecret = `whsec_${createId()}`;
  const encryptedSecret = encrypt(rawSecret);

  const [row] = await db
    .insert(outboundWebhookEndpoints)
    .values({
      workspaceId: workspace.id,
      url: body.url,
      encryptedSecret,
      events,
      isEnabled: true,
    })
    .returning({ id: outboundWebhookEndpoints.id });

  audit({
    workspaceId: workspace.id,
    action: "webhook.created",
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: "webhook",
    entityId: row!.id,
    entityName: body.url,
    description: `Webhook endpoint created: ${body.url}`,
    metadata: { url: body.url, events },
  });

  return NextResponse.json({ id: row!.id, secret: rawSecret }, { status: 201 });
}
