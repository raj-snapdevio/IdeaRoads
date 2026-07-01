import { and, eq } from "drizzle-orm";
import { boards } from "@/db/schema";
import { db } from "@/lib/db";

export async function updateBoard(
  boardId: string,
  input: {
    name?: string;
    slug?: string;
    description?: string | null;
    isPublic?: boolean;
    isArchived?: boolean;
  }
) {
  await db
    .update(boards)
    .set({
      ...input,
      name: input.name?.trim(),
      updatedAt: new Date(),
    })
    .where(eq(boards.id, boardId));
}

export async function reorderBoards(workspaceId: string, orderedIds: string[]) {
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx
        .update(boards)
        .set({ displayOrder: i, updatedAt: new Date() })
        .where(
          and(
            eq(boards.id, orderedIds[i]!),
            eq(boards.workspaceId, workspaceId)
          )
        );
    }
  });
}
