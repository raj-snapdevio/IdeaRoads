import { and, asc, eq } from "drizzle-orm";
import { workspaceStatuses } from "@/db/schema";
import { db } from "@/lib/db";

export async function getWorkspaceStatuses(workspaceId: string) {
  return db
    .select()
    .from(workspaceStatuses)
    .where(eq(workspaceStatuses.workspaceId, workspaceId))
    .orderBy(asc(workspaceStatuses.displayOrder), asc(workspaceStatuses.name));
}

export async function getActiveWorkspaceStatuses(workspaceId: string) {
  return db
    .select()
    .from(workspaceStatuses)
    .where(
      and(
        eq(workspaceStatuses.workspaceId, workspaceId),
        eq(workspaceStatuses.isArchived, false)
      )
    )
    .orderBy(asc(workspaceStatuses.displayOrder), asc(workspaceStatuses.name));
}

export async function getWorkspaceStatusBySlug(
  workspaceId: string,
  slug: string
) {
  const [row] = await db
    .select()
    .from(workspaceStatuses)
    .where(
      and(
        eq(workspaceStatuses.workspaceId, workspaceId),
        eq(workspaceStatuses.slug, slug)
      )
    )
    .limit(1);
  return row ?? null;
}

export async function getWorkspaceStatusById(id: string) {
  const [row] = await db
    .select()
    .from(workspaceStatuses)
    .where(eq(workspaceStatuses.id, id))
    .limit(1);
  return row ?? null;
}
