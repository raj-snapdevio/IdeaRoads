import { eq, sql } from "drizzle-orm";
import { posts, votes } from "@/db/schema";
import { db } from "@/lib/db";

/**
 * Merge the source post into the target post:
 *  - votes transfer to the target (a voter who already voted on the target is
 *    de-duplicated, never double-counted),
 *  - both posts' denormalised vote counts are recomputed,
 *  - the source is locked and marked merged (it leaves active lists and points
 *    to the target).
 *
 * Comments remain on the source post, which stays viewable with a "merged into"
 * notice. Both posts are assumed to belong to the same workspace (enforced by
 * the caller).
 */
export async function mergePost(
  sourceId: string,
  targetId: string
): Promise<void> {
  await db.transaction(async (tx) => {
    // 1. Drop source votes that would duplicate an existing target vote.
    await tx.execute(sql`
      DELETE FROM votes AS s
      WHERE s.post_id = ${sourceId}
        AND EXISTS (
          SELECT 1 FROM votes t
          WHERE t.post_id = ${targetId}
            AND (
              (s.user_id IS NOT NULL AND t.user_id = s.user_id)
              OR (s.user_email IS NOT NULL AND t.user_email = s.user_email)
            )
        )
    `);

    // 2. Move the remaining source votes onto the target.
    await tx
      .update(votes)
      .set({ postId: targetId })
      .where(eq(votes.postId, sourceId));

    // 3. Recompute the denormalised vote counts for both posts.
    await tx.execute(sql`
      UPDATE posts
      SET upvotes = (SELECT COUNT(*) FROM votes WHERE votes.post_id = posts.id),
          updated_at = now()
      WHERE posts.id IN (${sourceId}, ${targetId})
    `);

    // 4. Lock and mark the source as merged.
    await tx
      .update(posts)
      .set({ mergedIntoId: targetId, isLocked: true, updatedAt: new Date() })
      .where(eq(posts.id, sourceId));
  });
}
