import { and, eq, sql } from "drizzle-orm";
import { postVotes, posts } from "@/db/schema";
import { db } from "@/lib/db";

export async function getUserVote(
  postId: string,
  userId: string
): Promise<boolean> {
  const [row] = await db
    .select({ id: postVotes.id })
    .from(postVotes)
    .where(and(eq(postVotes.postId, postId), eq(postVotes.userId, userId)))
    .limit(1);
  return !!row;
}

export async function getBatchUserVotes(
  postIds: string[],
  userId: string
): Promise<Set<string>> {
  if (postIds.length === 0) return new Set();

  const rows = await db
    .select({ postId: postVotes.postId })
    .from(postVotes)
    .where(and(eq(postVotes.userId, userId)));

  return new Set(
    rows.map((r) => r.postId).filter((id) => postIds.includes(id))
  );
}

export async function addVote(postId: string, userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.insert(postVotes).values({ postId, userId }).onConflictDoNothing();

    await tx
      .update(posts)
      .set({ upvotes: sql`${posts.upvotes} + 1` })
      .where(eq(posts.id, postId));
  });
}

export async function removeVote(
  postId: string,
  userId: string
): Promise<void> {
  await db.transaction(async (tx) => {
    const [deleted] = await tx
      .delete(postVotes)
      .where(and(eq(postVotes.postId, postId), eq(postVotes.userId, userId)))
      .returning({ id: postVotes.id });

    if (deleted) {
      await tx
        .update(posts)
        .set({ upvotes: sql`GREATEST(${posts.upvotes} - 1, 0)` })
        .where(eq(posts.id, postId));
    }
  });
}
