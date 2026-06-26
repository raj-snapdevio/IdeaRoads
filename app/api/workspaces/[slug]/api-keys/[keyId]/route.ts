import { type NextRequest, NextResponse } from "next/server";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { revokeApiKey } from "@/lib/api-keys/queries";
import { audit } from "@/lib/audit";
import { getCurrentSession } from "@/lib/authz";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";

interface Params {
  params: Promise<{ slug: string; keyId: string }>;
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { slug, keyId } = await params;

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

  const name = await revokeApiKey(keyId, workspace.id);
  if (!name) {
    return NextResponse.json({ error: "API key not found" }, { status: 404 });
  }

  audit({
    workspaceId: workspace.id,
    action: "api_key.revoked",
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: "api_key",
    entityId: keyId,
    entityName: name,
    description: `API key revoked: ${name}`,
    metadata: { keyId },
  });

  return NextResponse.json({ ok: true });
}
