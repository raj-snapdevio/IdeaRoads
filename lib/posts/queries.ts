import { and, count, desc, eq, ilike, inArray, isNull, sql } from "drizzle-orm";
import { postStatusChanges, posts, votes } from "@/db/schema";
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
  if (!taken.has(base)) {
    return base;
  }

  let i = 2;
  while (taken.has(`${base}-${i}`)) {
    i++;
  }
  return `${base}-${i}`;
}

// ─── Read operations ──────────────────────────────────────────────────────────

export async function listBoardPosts(
  boardId: string,
  opts: {
    sort?: "newest" | "top";
    status?: string;
    categoryId?: string;
    search?: string;
    userId?: string;
    myVotes?: boolean;
    includeUnapproved?: boolean;
  } = {}
) {
  const {
    sort = "newest",
    status,
    categoryId,
    search,
    userId,
    myVotes,
    includeUnapproved = false,
  } = opts;

  // Merged posts are hidden from active lists (Feature 05).
  const conditions = [eq(posts.boardId, boardId), isNull(posts.mergedIntoId)];

  // Moderation-held (unapproved) feedback is visible only to the team
  // (Brand Admins and Team Members); the public sees approved posts only
  // (Feature 05). Callers opt in to pending posts via `includeUnapproved`.
  if (!includeUnapproved) {
    conditions.push(eq(posts.isApproved, true));
  }

  if (status) {
    conditions.push(eq(posts.status, status));
  }

  if (categoryId) {
    conditions.push(eq(posts.categoryId, categoryId));
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
        categoryId: posts.categoryId,
        upvotes: posts.upvotes,
        commentCount: posts.commentCount,
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
      categoryId: posts.categoryId,
      upvotes: posts.upvotes,
      commentCount: posts.commentCount,
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
  for (const row of rows) {
    map[row.status] = row.count;
  }
  return map;
}

// ─── Write operations ─────────────────────────────────────────────────────────

export async function createPost(input: {
  boardId: string;
  workspaceId: string;
  slug: string;
  title: string;
  body?: string | null;
  categoryId?: string | null;
  authorId: string;
  authorName: string | null;
  authorEmail: string;
  isApproved?: boolean;
}) {
  const [post] = await db
    .insert(posts)
    .values({
      boardId: input.boardId,
      workspaceId: input.workspaceId,
      slug: input.slug,
      title: input.title.trim(),
      body: input.body ?? null,
      categoryId: input.categoryId ?? null,
      authorId: input.authorId,
      authorName: input.authorName,
      authorEmail: input.authorEmail,
      isApproved: input.isApproved ?? true,
    })
    .returning({
      id: posts.id,
      slug: posts.slug,
      isApproved: posts.isApproved,
    });
  return post!;
}

export async function updatePost(
  postId: string,
  input: { title: string; body: string | null }
) {
  await db
    .update(posts)
    .set({
      title: input.title.trim(),
      body: input.body,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, postId));
}

export async function approvePost(postId: string): Promise<void> {
  await db
    .update(posts)
    .set({ isApproved: true, updatedAt: new Date() })
    .where(eq(posts.id, postId));
}

export async function getPendingPosts(workspaceId: string) {
  return db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      body: posts.body,
      boardId: posts.boardId,
      workspaceId: posts.workspaceId,
      authorId: posts.authorId,
      authorName: posts.authorName,
      authorEmail: posts.authorEmail,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .where(and(eq(posts.workspaceId, workspaceId), eq(posts.isApproved, false)))
    .orderBy(desc(posts.createdAt));
}

export async function updatePostStatus(postId: string, status: string) {
  await db
    .update(posts)
    .set({ status, updatedAt: new Date() })
    .where(eq(posts.id, postId));
}

export async function updatePostCategory(
  postId: string,
  categoryId: string | null
) {
  await db
    .update(posts)
    .set({ categoryId, updatedAt: new Date() })
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

// ─── Status history ─────────────────────────────────────────────────────────

export async function recordStatusChange(input: {
  postId: string;
  fromStatus: string | null;
  toStatus: string;
  changedBy: string | null;
  changedByName?: string | null;
  note?: string | null;
}): Promise<void> {
  await db.insert(postStatusChanges).values({
    postId: input.postId,
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    changedBy: input.changedBy,
    changedByName: input.changedByName ?? null,
    note: input.note ?? null,
  });
}

export async function listStatusHistory(postId: string) {
  return db
    .select()
    .from(postStatusChanges)
    .where(eq(postStatusChanges.postId, postId))
    .orderBy(desc(postStatusChanges.createdAt));
}

// ─── Merge target search ──────────────────────────────────────────────────────

/** Candidate posts to merge into: same workspace, approved, not merged, not self. */
export async function searchPostsForMerge(
  workspaceId: string,
  query: string,
  excludePostId: string
) {
  const conditions = [
    eq(posts.workspaceId, workspaceId),
    eq(posts.isApproved, true),
    isNull(posts.mergedIntoId),
    sql`${posts.id} <> ${excludePostId}`,
  ];
  if (query.trim()) {
    conditions.push(ilike(posts.title, `%${query.trim()}%`));
  }
  return db
    .select({
      id: posts.id,
      title: posts.title,
      upvotes: posts.upvotes,
    })
    .from(posts)
    .where(and(...conditions))
    .orderBy(desc(posts.upvotes), desc(posts.createdAt))
    .limit(10);
}
