import { and, eq } from "drizzle-orm";
import { posts } from "@/db/schema";
import { db } from "@/lib/db";
import { generatePostSlug, getPost } from "@/lib/posts/queries";

/**
 * Move a post to another board in the same workspace. The slug is preserved
 * when it is still unique in the destination board, otherwise a fresh unique
 * slug is generated from the title. Returns the (possibly new) slug.
 */
export async function movePost(
  postId: string,
  targetBoardId: string
): Promise<{ slug: string }> {
  const post = await getPost(postId);
  if (!post) {
    throw new Error("Post not found.");
  }

  let slug = post.slug;
  const clash = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.boardId, targetBoardId), eq(posts.slug, post.slug)))
    .limit(1);
  if (clash.length > 0) {
    slug = await generatePostSlug(targetBoardId, post.title);
  }

  await db
    .update(posts)
    .set({ boardId: targetBoardId, slug, updatedAt: new Date() })
    .where(eq(posts.id, postId));

  return { slug };
}
