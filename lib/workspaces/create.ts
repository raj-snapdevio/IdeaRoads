import { createId } from "@paralleldrive/cuid2";
import {
  DEFAULT_BOARD_DESCRIPTION,
  DEFAULT_BOARD_NAME,
  DEFAULT_BOARD_SLUG,
  WORKSPACE_OWNER,
} from "@/config/platform";
import { boards, workspaceMembers, workspaces } from "@/db/schema";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";

export interface CreateWorkspaceInput {
  name: string;
  slug: string;
  description?: string | null;
  ownerId: string;
  ownerEmail: string;
}

export async function createWorkspace(
  input: CreateWorkspaceInput
): Promise<string> {
  const workspaceId = createId();

  await db.transaction(async (tx) => {
    await tx.insert(workspaces).values({
      id: workspaceId,
      slug: input.slug,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      ownerId: input.ownerId,
    });

    await tx.insert(workspaceMembers).values({
      workspaceId,
      userId: input.ownerId,
      role: WORKSPACE_OWNER,
    });

    await tx.insert(boards).values({
      workspaceId,
      slug: DEFAULT_BOARD_SLUG,
      name: DEFAULT_BOARD_NAME,
      description: DEFAULT_BOARD_DESCRIPTION,
      createdBy: input.ownerId,
    });
  });

  audit({
    action: "workspace.created",
    actorId: input.ownerId,
    actorEmail: input.ownerEmail,
    description: `Workspace created: ${input.name}`,
    entityType: "workspace",
    entityId: workspaceId,
    metadata: { name: input.name, slug: input.slug },
  });

  return workspaceId;
}
