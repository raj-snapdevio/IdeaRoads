import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { boards, categories, posts, votes } from "@/db/schema";
import { db } from "@/lib/db";

export const ROADMAP_STATUSES = [
  "planned",
  "in_progress",
  "completed",
] as const;
export type RoadmapStatus = (typeof ROADMAP_STATUSES)[number];

export interface RoadmapPost {
  boardId: string;
  boardName: string;
  boardSlug: string;
  categoryColor: string | null;
  categoryId: string | null;
  categoryName: string | null;
  commentCount: number;
  createdAt: Date;
  hasVoted: boolean;
  id: string;
  isPinned: boolean;
  slug: string;
  status: string;
  title: string;
  upvotes: number;
}

export interface RoadmapData {
  completed: RoadmapPost[];
  in_progress: RoadmapPost[];
  planned: RoadmapPost[];
}

export async function listPostsForRoadmap(
  workspaceId: string,
  opts: { isAdmin?: boolean; userId?: string } = {}
): Promise<RoadmapData> {
  const { isAdmin = false, userId } = opts;

  const conditions = [
    eq(posts.workspaceId, workspaceId),
    inArray(posts.status, [...ROADMAP_STATUSES]),
  ];

  // Public view excludes private and archived boards
  if (!isAdmin) {
    conditions.push(eq(boards.isPublic, true));
  }
  conditions.push(eq(boards.isArchived, false));

  let rows: RoadmapPost[];

  if (userId) {
    const userVoteAlias = db
      .select({ postId: votes.postId, id: votes.id })
      .from(votes)
      .where(eq(votes.userId, userId))
      .as("user_vote");

    rows = await db
      .select({
        id: posts.id,
        slug: posts.slug,
        title: posts.title,
        status: posts.status,
        upvotes: posts.upvotes,
        commentCount: posts.commentCount,
        isPinned: posts.isPinned,
        hasVoted: sql<boolean>`${userVoteAlias.id} IS NOT NULL`,
        createdAt: posts.createdAt,
        boardId: boards.id,
        boardSlug: boards.slug,
        boardName: boards.name,
        categoryId: posts.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
      })
      .from(posts)
      .innerJoin(boards, eq(posts.boardId, boards.id))
      .leftJoin(categories, eq(posts.categoryId, categories.id))
      .leftJoin(userVoteAlias, eq(posts.id, userVoteAlias.postId))
      .where(and(...conditions))
      .orderBy(desc(posts.isPinned), desc(posts.upvotes));
  } else {
    rows = await db
      .select({
        id: posts.id,
        slug: posts.slug,
        title: posts.title,
        status: posts.status,
        upvotes: posts.upvotes,
        commentCount: posts.commentCount,
        isPinned: posts.isPinned,
        hasVoted: sql<boolean>`false`,
        createdAt: posts.createdAt,
        boardId: boards.id,
        boardSlug: boards.slug,
        boardName: boards.name,
        categoryId: posts.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
      })
      .from(posts)
      .innerJoin(boards, eq(posts.boardId, boards.id))
      .leftJoin(categories, eq(posts.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(desc(posts.isPinned), desc(posts.upvotes));
  }

  return {
    planned: rows.filter((r) => r.status === "planned"),
    in_progress: rows.filter((r) => r.status === "in_progress"),
    completed: rows.filter((r) => r.status === "completed"),
  };
}
