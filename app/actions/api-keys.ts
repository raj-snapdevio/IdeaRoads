"use server";

import { z } from "zod";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { generateApiKey } from "@/lib/api-keys/create";
import { listApiKeys, revokeApiKey } from "@/lib/api-keys/queries";
import { audit } from "@/lib/audit";
import { requireSession } from "@/lib/authz";
import { getWorkspaceMember } from "@/lib/workspaces/queries";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string; field?: string };

// ─── Generate API Key ─────────────────────────────────────────────────────────

const generateSchema = z.object({
  workspaceId: z.string().min(1),
  name: z
    .string()
    .min(1, "Name is required.")
    .max(64, "Name must be 64 characters or fewer."),
});

export async function generateApiKeyAction(input: {
  workspaceId: string;
  name: string;
}): Promise<ActionResult<{ id: string; name: string; rawKey: string }>> {
  const session = await requireSession();

  const parsed = generateSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      success: false,
      error: first?.message ?? "Invalid input.",
      field: first?.path[0] as string | undefined,
    };
  }

  const member = await getWorkspaceMember(
    parsed.data.workspaceId,
    session.user.id
  );
  if (!member || member.role === WORKSPACE_MEMBER) {
    return {
      success: false,
      error: "Only admins and owners can manage API keys.",
    };
  }

  const result = await generateApiKey(
    parsed.data.workspaceId,
    session.user.id,
    parsed.data.name.trim()
  );

  return { success: true, data: result };
}

// ─── List API Keys ────────────────────────────────────────────────────────────

export async function listApiKeysAction(input: {
  workspaceId: string;
}): Promise<
  ActionResult<
    {
      id: string;
      name: string;
      lastUsedAt: Date | null;
      isEnabled: boolean;
      createdAt: Date;
    }[]
  >
> {
  const session = await requireSession();

  const member = await getWorkspaceMember(input.workspaceId, session.user.id);
  if (!member || member.role === WORKSPACE_MEMBER) {
    return {
      success: false,
      error: "Only admins and owners can view API keys.",
    };
  }

  const keys = await listApiKeys(input.workspaceId);
  return { success: true, data: keys };
}

// ─── Revoke API Key ───────────────────────────────────────────────────────────

export async function revokeApiKeyAction(input: {
  keyId: string;
  workspaceId: string;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  const member = await getWorkspaceMember(input.workspaceId, session.user.id);
  if (!member || member.role === WORKSPACE_MEMBER) {
    return {
      success: false,
      error: "Only admins and owners can revoke API keys.",
    };
  }

  const name = await revokeApiKey(input.keyId, input.workspaceId);
  if (!name) {
    return { success: false, error: "API key not found." };
  }

  audit({
    workspaceId: input.workspaceId,
    action: "api_key.revoked",
    actorId: session.user.id,
    actorEmail: session.user.email,
    actorName: session.user.name ?? null,
    entityType: "api_key",
    entityId: input.keyId,
    entityName: name,
    description: `API key revoked: ${name}`,
    metadata: { keyId: input.keyId },
  });

  return { success: true, data: undefined };
}
