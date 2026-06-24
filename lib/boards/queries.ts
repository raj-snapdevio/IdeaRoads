import { and, eq } from "drizzle-orm";
import { boards } from "@/db/schema";
import { db } from "@/lib/db";

export async function getBoardBySlug(workspaceId: string, slug: string) {
  const [row] = await db
    .select()
    .from(boards)
    .where(and(eq(boards.workspaceId, workspaceId), eq(boards.slug, slug)))
    .limit(1);
  return row ?? null;
}
