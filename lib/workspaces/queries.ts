import { and, asc, eq } from "drizzle-orm";
import { workspaceMembers, workspaces } from "@/db/schema";
import { db } from "@/lib/db";

export async function getWorkspaceBySlug(slug: string) {
  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);
  return workspace ?? null;
}

export async function getWorkspaceMember(workspaceId: string, userId: string) {
  const [member] = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      )
    )
    .limit(1);
  return member ?? null;
}

export async function getFirstUserWorkspace(userId: string) {
  const [row] = await db
    .select({
      slug: workspaces.slug,
      name: workspaces.name,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaces.isSuspended, false)
      )
    )
    .orderBy(asc(workspaceMembers.joinedAt))
    .limit(1);
  return row ?? null;
}
