import { createId } from "@paralleldrive/cuid2";
import { and, eq, sql } from "drizzle-orm";
import { boards, posts, votes } from "@/db/schema";
import { db } from "@/lib/db";

export class VoteBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VoteBlockedError";
  }
}

export class VoteNotFoundError extends Error {
  constructor() {
    super("Post not found.");
    this.name = "VoteNotFoundError";
  }
}

export async function castVote(
  postId: string,
  workspaceId: string,
  voter: { userId: string }
) {
  const { userId } = voter;
  if (!userId) {
    throw new Error("userId is required.");
  }

  // Pre-flight checks
  const post = await db
    .select({
      id: posts.id,
      isLocked: posts.isLocked,
      boardId: posts.boardId,
    })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.workspaceId, workspaceId)))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!post) {
    throw new VoteNotFoundError();
  }
  if (post.isLocked) {
    throw new VoteBlockedError(
      "This post is locked and no longer accepting votes."
    );
  }

  const board = await db
    .select({ isArchived: boards.isArchived })
    .from(boards)
    .where(eq(boards.id, post.boardId))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (board?.isArchived) {
    throw new VoteBlockedError("This board is archived.");
  }

  // Check if already voted by userId
  const existing = await db
    .select({ id: votes.id })
    .from(votes)
    .where(and(eq(votes.postId, postId), eq(votes.userId, userId)))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (existing) {
    return existing;
  }

  return await db.transaction(async (tx) => {
    const [vote] = await tx
      .insert(votes)
      .values({
        id: createId(),
        postId,
        workspaceId,
        userId,
        userEmail: null,
        userName: null,
      })
      .onConflictDoNothing()
      .returning({ id: votes.id });

    if (vote) {
      await tx
        .update(posts)
        .set({ upvotes: sql`${posts.upvotes} + 1` })
        .where(eq(posts.id, postId));
    }

    return vote ?? existing;
  });
}
