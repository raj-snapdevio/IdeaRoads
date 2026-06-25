import { and, asc, eq } from "drizzle-orm";
import { postComments } from "@/db/schema";
import { db } from "@/lib/db";

export async function listPostComments(postId: string) {
  return db
    .select({
      id: postComments.id,
      postId: postComments.postId,
      authorId: postComments.authorId,
      authorName: postComments.authorName,
      authorEmail: postComments.authorEmail,
      content: postComments.content,
      createdAt: postComments.createdAt,
    })
    .from(postComments)
    .where(eq(postComments.postId, postId))
    .orderBy(asc(postComments.createdAt));
}

export async function addComment(input: {
  postId: string;
  authorId: string;
  authorName: string | null;
  authorEmail: string;
  content: string;
}) {
  const [comment] = await db
    .insert(postComments)
    .values({
      postId: input.postId,
      authorId: input.authorId,
      authorName: input.authorName,
      authorEmail: input.authorEmail,
      content: input.content.trim(),
    })
    .returning({ id: postComments.id });
  return comment!;
}

export async function getComment(commentId: string) {
  const [row] = await db
    .select()
    .from(postComments)
    .where(eq(postComments.id, commentId))
    .limit(1);
  return row ?? null;
}

export async function deleteComment(commentId: string) {
  await db.delete(postComments).where(eq(postComments.id, commentId));
}

export async function countPostComments(postId: string): Promise<number> {
  const rows = await db
    .select({ id: postComments.id })
    .from(postComments)
    .where(eq(postComments.postId, postId));
  return rows.length;
}
