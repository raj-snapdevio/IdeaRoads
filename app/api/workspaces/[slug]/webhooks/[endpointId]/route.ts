import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { outboundWebhookEndpoints } from "@/db/schema";
import { audit } from "@/lib/audit";
import { getCurrentSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { ALL_WEBHOOK_EVENTS } from "@/lib/webhooks/events";
import { getWebhookEndpoint } from "@/lib/webhooks/queries";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";

interface Params {
  params: Promise<{ slug: string; endpointId: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { slug, endpointId } = await params;

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

  const endpoint = await getWebhookEndpoint(endpointId);
  if (!endpoint || endpoint.workspaceId !== workspace.id) {
    return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
  }

  let body: { url?: string; events?: string[]; isEnabled?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  type EndpointUpdate = {
    url?: string;
    events?: string[];
    isEnabled?: boolean;
    disabledReason?: string | null;
    consecutiveFailures?: number;
    updatedAt: Date;
  };
  const updates: EndpointUpdate = { updatedAt: new Date() };

  if (body.url !== undefined) {
    if (!body.url.startsWith("https://")) {
      return NextResponse.json({ error: "url must be HTTPS" }, { status: 400 });
    }
    updates.url = body.url;
  }
  if (body.events !== undefined) {
    const valid = body.events.filter((e) =>
      (ALL_WEBHOOK_EVENTS as string[]).includes(e)
    );
    if (!valid.length) {
      return NextResponse.json(
        { error: "No valid events provided" },
        { status: 400 }
      );
    }
    updates.events = valid;
  }
  if (body.isEnabled !== undefined) {
    updates.isEnabled = body.isEnabled;
    if (body.isEnabled) {
      updates.disabledReason = null;
      updates.consecutiveFailures = 0;
    }
  }

  await db
    .update(outboundWebhookEndpoints)
    .set(updates)
    .where(
      and(
        eq(outboundWebhookEndpoints.id, endpointId),
        eq(outboundWebhookEndpoints.workspaceId, workspace.id)
      )
    );

  audit({
    workspaceId: workspace.id,
    action: "webhook.updated",
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: "webhook",
    entityId: endpointId,
    entityName: endpoint.url,
    description: `Webhook endpoint updated: ${endpoint.url}`,
    metadata: { url: body.url, events: body.events, isEnabled: body.isEnabled },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { slug, endpointId } = await params;

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

  const endpoint = await getWebhookEndpoint(endpointId);
  if (!endpoint || endpoint.workspaceId !== workspace.id) {
    return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
  }

  await db
    .delete(outboundWebhookEndpoints)
    .where(
      and(
        eq(outboundWebhookEndpoints.id, endpointId),
        eq(outboundWebhookEndpoints.workspaceId, workspace.id)
      )
    );

  audit({
    workspaceId: workspace.id,
    action: "webhook.deleted",
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: "webhook",
    entityId: endpointId,
    entityName: endpoint.url,
    description: `Webhook endpoint deleted: ${endpoint.url}`,
    metadata: { url: endpoint.url },
  });

  return NextResponse.json({ ok: true });
}
