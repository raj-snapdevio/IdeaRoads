import { and, count, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import { posts, votes } from "@/db/schema";
import { db } from "@/lib/db";
import { POST_STATUSES, type PostStatus } from "@/lib/posts/constants";

export type { PostStatus };
export { POST_STATUSES };

// ─── Slug generation ──────────────────────────────────────────────────────────

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80) || "post"
  );
}

export async function generatePostSlug(
  boardId: string,
  title: string
): Promise<string> {
  const base = slugify(title);

  const existing = await db
    .select({ slug: posts.slug })
    .from(posts)
    .where(
      and(eq(posts.boardId, boardId), sql`${posts.slug} LIKE ${base + "%"}`)
    );

  const taken = new Set(existing.map((r) => r.slug));
  if (!taken.has(base)) return base;

  let i = 2;
  while (taken.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

// ─── Read operations ──────────────────────────────────────────────────────────

export async function listBoardPosts(
  boardId: string,
  opts: {
    sort?: "newest" | "top";
    status?: string;
    search?: string;
    userId?: string;
    myVotes?: boolean;
  } = {}
) {
  const { sort = "newest", status, search, userId, myVotes } = opts;

  const conditions = [eq(posts.boardId, boardId)];

  if (status && (POST_STATUSES as string[]).includes(status)) {
    conditions.push(eq(posts.status, status as PostStatus));
  }

  if (search?.trim()) {
    conditions.push(ilike(posts.title, `%${search.trim()}%`));
  }

  if (myVotes && userId) {
    const votedPostIds = db
      .select({ id: votes.postId })
      .from(votes)
      .where(eq(votes.userId, userId));

    conditions.push(inArray(posts.id, votedPostIds));
  }

  if (userId) {
    // LEFT JOIN to get hasVoted per post
    const userVoteAlias = db
      .select({ postId: votes.postId, id: votes.id })
      .from(votes)
      .where(eq(votes.userId, userId))
      .as("user_vote");

    return db
      .select({
        id: posts.id,
        slug: posts.slug,
        title: posts.title,
        body: posts.body,
        status: posts.status,
        upvotes: posts.upvotes,
        isPinned: posts.isPinned,
        authorName: posts.authorName,
        authorEmail: posts.authorEmail,
        createdAt: posts.createdAt,
        hasVoted: sql<boolean>`${userVoteAlias.id} IS NOT NULL`,
      })
      .from(posts)
      .leftJoin(userVoteAlias, eq(posts.id, userVoteAlias.postId))
      .where(and(...conditions))
      .orderBy(
        desc(posts.isPinned),
        sort === "top" ? desc(posts.upvotes) : desc(posts.createdAt)
      );
  }

  return db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      body: posts.body,
      status: posts.status,
      upvotes: posts.upvotes,
      isPinned: posts.isPinned,
      authorName: posts.authorName,
      authorEmail: posts.authorEmail,
      createdAt: posts.createdAt,
      hasVoted: sql<boolean>`false`,
    })
    .from(posts)
    .where(and(...conditions))
    .orderBy(
      desc(posts.isPinned),
      sort === "top" ? desc(posts.upvotes) : desc(posts.createdAt)
    );
}

export async function getPostBySlug(boardId: string, slug: string) {
  const [row] = await db
    .select()
    .from(posts)
    .where(and(eq(posts.boardId, boardId), eq(posts.slug, slug)))
    .limit(1);
  return row ?? null;
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

export async function countWorkspacePostsByStatus(workspaceId: string) {
  const rows = await db
    .select({ status: posts.status, count: count() })
    .from(posts)
    .where(eq(posts.workspaceId, workspaceId))
    .groupBy(posts.status);

  const map: Record<string, number> = {};
  for (const row of rows) map[row.status] = row.count;
  return map;
}

// ─── Write operations ─────────────────────────────────────────────────────────

export async function createPost(input: {
  boardId: string;
  workspaceId: string;
  slug: string;
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
      slug: input.slug,
      title: input.title.trim(),
      body: input.body ?? null,
      authorId: input.authorId,
      authorName: input.authorName,
      authorEmail: input.authorEmail,
    })
    .returning({ id: posts.id, slug: posts.slug });
  return post!;
}

export async function updatePostStatus(postId: string, status: PostStatus) {
  await db
    .update(posts)
    .set({ status, updatedAt: new Date() })
    .where(eq(posts.id, postId));
}

export async function setPinned(postId: string, isPinned: boolean) {
  await db
    .update(posts)
    .set({ isPinned, updatedAt: new Date() })
    .where(eq(posts.id, postId));
}

export async function deletePost(postId: string) {
  await db.delete(posts).where(eq(posts.id, postId));
}
