import { and, eq, sql } from "drizzle-orm";
import { posts, votes } from "@/db/schema";
import { db } from "@/lib/db";

export async function removeVote(
  postId: string,
  voter: { userId: string }
): Promise<void> {
  const { userId } = voter;
  if (!userId) {
    return;
  }

  const condition = and(eq(votes.postId, postId), eq(votes.userId, userId));

  await db.transaction(async (tx) => {
    const [deleted] = await tx
      .delete(votes)
      .where(condition)
      .returning({ id: votes.id });

    if (deleted) {
      await tx
        .update(posts)
        .set({ upvotes: sql`GREATEST(${posts.upvotes} - 1, 0)` })
        .where(eq(posts.id, postId));
    }
  });
}
