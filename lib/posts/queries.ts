import { count, desc, eq } from "drizzle-orm";
import { posts } from "@/db/schema";
import { db } from "@/lib/db";

export type PostStatus =
  | "open"
  | "under_review"
  | "planned"
  | "in_progress"
  | "done"
  | "declined";

export async function listBoardPosts(
  boardId: string,
  sort: "newest" | "top" = "newest"
) {
  return db
    .select({
      id: posts.id,
      title: posts.title,
      body: posts.body,
      status: posts.status,
      upvotes: posts.upvotes,
      isPinned: posts.isPinned,
      authorName: posts.authorName,
      authorEmail: posts.authorEmail,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .where(eq(posts.boardId, boardId))
    .orderBy(
      desc(posts.isPinned),
      sort === "top" ? desc(posts.upvotes) : desc(posts.createdAt)
    );
}

export async function getPost(postId: string) {
  const [row] = await db
    .select()
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);
  return row ?? null;
}

export async function countBoardPosts(boardId: string): Promise<number> {
  const [{ value }] = await db
    .select({ value: count() })
    .from(posts)
    .where(eq(posts.boardId, boardId));
  return value;
}

export async function countWorkspacePosts(
  workspaceId: string
): Promise<number> {
  const [{ value }] = await db
    .select({ value: count() })
    .from(posts)
    .where(eq(posts.workspaceId, workspaceId));
  return value;
}

// ─── Write operations ─────────────────────────────────────────────────────────

export async function createPost(input: {
  boardId: string;
  workspaceId: string;
  title: string;
  body?: string | null;
  authorId: string;
  authorName: string | null;
  authorEmail: string;
}) {
  const [post] = await db
    .insert(posts)
    .values({
      boardId: input.boardId,
      workspaceId: input.workspaceId,
      title: input.title.trim(),
      body: input.body ?? null,
      authorId: input.authorId,
      authorName: input.authorName,
      authorEmail: input.authorEmail,
    })
    .returning({ id: posts.id });
  return post!;
}

export async function updatePostStatus(postId: string, status: PostStatus) {
  await db
    .update(posts)
    .set({ status, updatedAt: new Date() })
    .where(eq(posts.id, postId));
}

export async function deletePost(postId: string) {
  await db.delete(posts).where(eq(posts.id, postId));
}
