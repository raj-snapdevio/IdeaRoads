import { and, eq, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
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
  voter: { userId?: string; userEmail?: string; userName?: string }
) {
  const { userId, userEmail, userName } = voter;
  if (!userId && !userEmail) {
    throw new Error("userId or userEmail is required.");
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

  if (!post) throw new VoteNotFoundError();
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

  if (userId) {
    // Check if already voted by userId
    const existing = await db
      .select({ id: votes.id })
      .from(votes)
      .where(and(eq(votes.postId, postId), eq(votes.userId, userId)))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (existing) return existing;

    // De-duplicate: if user has a guest vote with same email, remove it first
    // We need to look up the user's email for this. Skip this for now — handled at a higher level.

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

  // Guest path (email-based)
  const existing = await db
    .select({ id: votes.id })
    .from(votes)
    .where(and(eq(votes.postId, postId), eq(votes.userEmail, userEmail!)))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (existing) return existing;

  return await db.transaction(async (tx) => {
    const [vote] = await tx
      .insert(votes)
      .values({
        id: createId(),
        postId,
        workspaceId,
        userId: null,
        userEmail: userEmail!,
        userName: userName ?? null,
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
