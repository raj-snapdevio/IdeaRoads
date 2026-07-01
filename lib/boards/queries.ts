import { and, asc, count, eq } from "drizzle-orm";
import { boards, posts } from "@/db/schema";
import { db } from "@/lib/db";

export async function getBoardBySlug(workspaceId: string, slug: string) {
  const [row] = await db
    .select()
    .from(boards)
    .where(and(eq(boards.workspaceId, workspaceId), eq(boards.slug, slug)))
    .limit(1);
  return row ?? null;
}

export async function getBoardById(id: string) {
  const [row] = await db
    .select()
    .from(boards)
    .where(eq(boards.id, id))
    .limit(1);
  return row ?? null;
}

export interface BoardListItem {
  description: string | null;
  displayOrder: number;
  id: string;
  isArchived: boolean;
  isPublic: boolean;
  name: string;
  postCount: number;
  slug: string;
}

/** All boards for a workspace (active + archived), ordered, with post counts. */
export async function listBoardsForWorkspace(
  workspaceId: string
): Promise<BoardListItem[]> {
  const rows = await db
    .select({
      id: boards.id,
      slug: boards.slug,
      name: boards.name,
      description: boards.description,
      isPublic: boards.isPublic,
      isArchived: boards.isArchived,
      displayOrder: boards.displayOrder,
      postCount: count(posts.id),
    })
    .from(boards)
    .leftJoin(posts, eq(posts.boardId, boards.id))
    .where(eq(boards.workspaceId, workspaceId))
    .groupBy(boards.id)
    .orderBy(asc(boards.displayOrder), asc(boards.name));
  return rows;
}

/** Count of active (non-archived) boards — the value the board limit applies to. */
export async function countActiveBoards(workspaceId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(boards)
    .where(
      and(eq(boards.workspaceId, workspaceId), eq(boards.isArchived, false))
    );
  return row?.value ?? 0;
}
