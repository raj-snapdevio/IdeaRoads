import { and, eq, ne } from "drizzle-orm";
import { workspaceStatuses } from "@/db/schema";
import { db } from "@/lib/db";

export async function deleteWorkspaceStatus(statusId: string) {
  const status = await db
    .select()
    .from(workspaceStatuses)
    .where(eq(workspaceStatuses.id, statusId))
    .limit(1);

  if (!status[0]) return;

  // Ensure at least one status remains and we're not deleting the last one
  const remaining = await db
    .select({ id: workspaceStatuses.id })
    .from(workspaceStatuses)
    .where(
      and(
        eq(workspaceStatuses.workspaceId, status[0].workspaceId),
        ne(workspaceStatuses.id, statusId),
        eq(workspaceStatuses.isArchived, false)
      )
    );

  if (remaining.length === 0) {
    throw new Error("Cannot delete the only active status.");
  }

  await db.delete(workspaceStatuses).where(eq(workspaceStatuses.id, statusId));
}
