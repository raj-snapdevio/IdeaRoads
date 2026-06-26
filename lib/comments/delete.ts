import { eq, sql } from "drizzle-orm";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { comments, posts } from "@/db/schema";
import { db } from "@/lib/db";

export class CommentDeleteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommentDeleteError";
  }
}

export async function deleteComment(
  commentId: string,
  requesterId: string,
  requesterRole: string
): Promise<void> {
  const comment = await db
    .select()
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!comment) {
    throw new CommentDeleteError("Comment not found.");
  }

  const isAdminOrOwner = requesterRole !== WORKSPACE_MEMBER;
  const isAuthor = comment.authorId === requesterId;

  if (!isAdminOrOwner && !isAuthor) {
    throw new CommentDeleteError(
      "You don't have permission to delete this comment."
    );
  }

  await db.transaction(async (tx) => {
    // Hard delete — cascade removes child replies and reactions
    await tx.delete(comments).where(eq(comments.id, commentId));

    // Decrement comment_count only if it was approved and not already deleted
    if (comment.isApproved && !comment.isDeleted) {
      await tx
        .update(posts)
        .set({ commentCount: sql`GREATEST(${posts.commentCount} - 1, 0)` })
        .where(eq(posts.id, comment.postId));
    }
  });
}
