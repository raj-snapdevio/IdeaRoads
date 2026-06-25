"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { WORKSPACE_MEMBER, WORKSPACE_OWNER } from "@/config/platform";
import { audit } from "@/lib/audit";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { workspaces } from "@/db/schema";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

const updateWorkspaceSettingsSchema = z.object({
  workspaceId: z.string().min(1),
  roadmapPublic: z.boolean().optional(),
  changelogPublic: z.boolean().optional(),
});

export async function updateWorkspaceSettingsAction(input: {
  workspaceId: string;
  roadmapPublic?: boolean;
  changelogPublic?: boolean;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  const parsed = updateWorkspaceSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid input." };
  }

  const member = await getWorkspaceMember(
    parsed.data.workspaceId,
    session.user.id
  );
  if (!member || member.role === WORKSPACE_MEMBER) {
    return {
      success: false,
      error: "Only admins and owners can update workspace settings.",
    };
  }

  const updates: Partial<{
    roadmapPublic: boolean;
    changelogPublic: boolean;
    updatedAt: Date;
  }> = {
    updatedAt: new Date(),
  };

  if (parsed.data.roadmapPublic !== undefined) {
    updates.roadmapPublic = parsed.data.roadmapPublic;
  }
  if (parsed.data.changelogPublic !== undefined) {
    updates.changelogPublic = parsed.data.changelogPublic;
  }

  await db
    .update(workspaces)
    .set(updates)
    .where(eq(workspaces.id, parsed.data.workspaceId));

  audit({
    action: "workspace.settings_updated",
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: "workspace",
    entityId: parsed.data.workspaceId,
    description: "Workspace settings updated",
    metadata: {
      roadmapPublic: parsed.data.roadmapPublic,
      changelogPublic: parsed.data.changelogPublic,
    },
  });

  return { success: true, data: undefined };
}
