import { and, count, desc, eq, ilike, sql } from "drizzle-orm";
import { changelogEntries, changelogPosts, posts } from "@/db/schema";
import { db } from "@/lib/db";

export type ChangelogEntryRow = {
  id: string;
  workspaceId: string;
  title: string;
  body: string;
  label: string;
  isPublished: boolean;
  publishedAt: Date | null;
  notifiedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  linkedPostCount: number;
};

export type LinkedPost = {
  id: string;
  title: string;
  slug: string;
  status: string;
  upvotes: number;
  boardSlug: string;
  boardName: string;
};

export type ChangelogEntryWithPosts = ChangelogEntryRow & {
  linkedPosts: LinkedPost[];
};

export async function listChangelogEntries(
  workspaceId: string,
  opts: { includeDrafts?: boolean; page?: number; limit?: number } = {}
): Promise<{ entries: ChangelogEntryRow[]; total: number; hasMore: boolean }> {
  const { includeDrafts = false, page = 1, limit = 20 } = opts;
  const offset = (page - 1) * limit;

  const conditions = [eq(changelogEntries.workspaceId, workspaceId)];
  if (!includeDrafts) {
    conditions.push(eq(changelogEntries.isPublished, true));
  }

  const linkedPostCountSq = db
    .select({ count: count() })
    .from(changelogPosts)
    .where(eq(changelogPosts.changelogEntryId, changelogEntries.id))
    .as("linked_count");

  const [rows, [{ value: total }]] = await Promise.all([
    db
      .select({
        id: changelogEntries.id,
        workspaceId: changelogEntries.workspaceId,
        title: changelogEntries.title,
        body: changelogEntries.body,
        label: changelogEntries.label,
        isPublished: changelogEntries.isPublished,
        publishedAt: changelogEntries.publishedAt,
        notifiedAt: changelogEntries.notifiedAt,
        createdBy: changelogEntries.createdBy,
        createdAt: changelogEntries.createdAt,
        updatedAt: changelogEntries.updatedAt,
        linkedPostCount: sql<number>`(
          SELECT COUNT(*) FROM changelog_posts
          WHERE changelog_posts.changelog_entry_id = ${changelogEntries.id}
        )`,
      })
      .from(changelogEntries)
      .where(and(...conditions))
      .orderBy(
        desc(changelogEntries.isPublished),
        desc(changelogEntries.publishedAt),
        desc(changelogEntries.updatedAt)
      )
      .limit(limit)
      .offset(offset),
    db
      .select({ value: count() })
      .from(changelogEntries)
      .where(and(...conditions)),
  ]);

  return {
    entries: rows as ChangelogEntryRow[],
    total: Number(total),
    hasMore: offset + rows.length < Number(total),
  };
}

export async function getChangelogEntryById(
  entryId: string,
  workspaceId: string
): Promise<ChangelogEntryWithPosts | null> {
  const [entry] = await db
    .select()
    .from(changelogEntries)
    .where(
      and(
        eq(changelogEntries.id, entryId),
        eq(changelogEntries.workspaceId, workspaceId)
      )
    )
    .limit(1);

  if (!entry) return null;

  const linkedPosts = await getLinkedPosts(entryId);

  const linkedCount = linkedPosts.length;

  return {
    ...entry,
    linkedPostCount: linkedCount,
    linkedPosts,
  };
}

export async function getLinkedPosts(entryId: string): Promise<LinkedPost[]> {
  const { boards } = await import("@/db/schema/boards");

  return db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      status: posts.status,
      upvotes: posts.upvotes,
      boardSlug: boards.slug,
      boardName: boards.name,
    })
    .from(changelogPosts)
    .innerJoin(posts, eq(changelogPosts.postId, posts.id))
    .innerJoin(boards, eq(posts.boardId, boards.id))
    .where(eq(changelogPosts.changelogEntryId, entryId));
}

export async function searchWorkspacePosts(
  workspaceId: string,
  query: string,
  limit = 10
) {
  const { boards } = await import("@/db/schema/boards");

  return db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      status: posts.status,
      upvotes: posts.upvotes,
      boardSlug: boards.slug,
      boardName: boards.name,
    })
    .from(posts)
    .innerJoin(boards, eq(posts.boardId, boards.id))
    .where(
      and(
        eq(posts.workspaceId, workspaceId),
        query.trim() ? ilike(posts.title, `%${query.trim()}%`) : undefined
      )
    )
    .orderBy(desc(posts.upvotes))
    .limit(limit);
}
