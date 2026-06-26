import { and, asc, count, eq, isNull } from "drizzle-orm";
import { comments } from "@/db/schema";
import { db } from "@/lib/db";

export interface CommentRow {
  authorAvatar: string | null;
  authorId: string | null;
  authorName: string | null;
  body: string;
  createdAt: Date;
  id: string;
  isApproved: boolean;
  isDeleted: boolean;
  parentId: string | null;
  postId: string;
  updatedAt: Date;
}

export interface CommentWithReplies extends CommentRow {
  replies: CommentRow[];
}

export async function listComments(
  postId: string,
  opts: { includeUnapproved?: boolean } = {}
): Promise<CommentWithReplies[]> {
  const { includeUnapproved = false } = opts;

  const approvalCondition = includeUnapproved
    ? undefined
    : eq(comments.isApproved, true);

  const topLevelConditions = [
    eq(comments.postId, postId),
    isNull(comments.parentId),
  ];
  if (approvalCondition) {
    topLevelConditions.push(approvalCondition);
  }

  const topLevel = await db
    .select({
      id: comments.id,
      postId: comments.postId,
      parentId: comments.parentId,
      body: comments.body,
      isDeleted: comments.isDeleted,
      isApproved: comments.isApproved,
      authorId: comments.authorId,
      authorName: comments.authorName,
      authorAvatar: comments.authorAvatar,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
    })
    .from(comments)
    .where(and(...topLevelConditions))
    .orderBy(asc(comments.createdAt));

  if (topLevel.length === 0) {
    return [];
  }

  const replyConditions = [eq(comments.postId, postId)];
  if (approvalCondition) {
    replyConditions.push(approvalCondition);
  }

  const allReplies = await db
    .select({
      id: comments.id,
      postId: comments.postId,
      parentId: comments.parentId,
      body: comments.body,
      isDeleted: comments.isDeleted,
      isApproved: comments.isApproved,
      authorId: comments.authorId,
      authorName: comments.authorName,
      authorAvatar: comments.authorAvatar,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
    })
    .from(comments)
    .where(
      and(
        eq(comments.postId, postId),
        ...(approvalCondition ? [approvalCondition] : [])
      )
    )
    .orderBy(asc(comments.createdAt));

  const repliesByParent = new Map<string, CommentRow[]>();
  for (const reply of allReplies) {
    if (!reply.parentId) {
      continue;
    }
    const arr = repliesByParent.get(reply.parentId) ?? [];
    arr.push(reply);
    repliesByParent.set(reply.parentId, arr);
  }

  return topLevel.map((c) => ({
    ...c,
    replies: repliesByParent.get(c.id) ?? [],
  }));
}

export async function getCommentById(commentId: string) {
  const [row] = await db
    .select()
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1);
  return row ?? null;
}

export async function getCommentCount(postId: string): Promise<number> {
  const [{ value }] = await db
    .select({ value: count() })
    .from(comments)
    .where(
      and(
        eq(comments.postId, postId),
        eq(comments.isApproved, true),
        eq(comments.isDeleted, false)
      )
    );
  return value;
}
