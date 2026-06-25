import { createId } from "@paralleldrive/cuid2";
import { eq, sql } from "drizzle-orm";
import { boards, comments, posts, user, workspaces } from "@/db/schema";
import { db } from "@/lib/db";
import { enqueueEmail } from "@/lib/email";
import { renderEmailTemplate } from "@/lib/email/renderer";
import { NewCommentEmail } from "@/lib/email/components/new-comment";
import { CommentReplyEmail } from "@/lib/email/components/comment-reply";
import { createNotification } from "@/lib/notifications/create";
import { env } from "@/lib/env";

export class CommentBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommentBlockedError";
  }
}

export class CommentNotFoundError extends Error {
  constructor(message = "Post not found.") {
    super(message);
    this.name = "CommentNotFoundError";
  }
}

export async function createComment(
  postId: string,
  input: {
    body: string;
    parentId?: string | null;
    authorId?: string | null;
    authorEmail?: string | null;
    authorName?: string | null;
    authorAvatar?: string | null;
  },
  workspaceId: string
) {
  const { body, parentId, authorId, authorEmail, authorName, authorAvatar } =
    input;

  // Pre-flight: fetch post
  const post = await db
    .select()
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!post) throw new CommentNotFoundError();
  if (post.isLocked) {
    throw new CommentBlockedError("Comments are closed on this post.");
  }

  // Validate parent if provided
  if (parentId) {
    const parent = await db
      .select()
      .from(comments)
      .where(eq(comments.id, parentId))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!parent) throw new CommentBlockedError("Parent comment not found.");
    if (parent.parentId !== null) {
      throw new CommentBlockedError("Replies to replies are not allowed.");
    }
    if (parent.postId !== postId) {
      throw new CommentBlockedError(
        "Parent comment does not belong to this post."
      );
    }
  }

  // Determine approval based on workspace comment moderation
  const workspace = await db
    .select({ commentModeration: workspaces.commentModeration })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1)
    .then((r) => r[0] ?? null);

  const isApproved = !workspace?.commentModeration;

  // Snapshot author info from user if signed in
  let resolvedAuthorName = authorName ?? null;
  let resolvedAuthorAvatar = authorAvatar ?? null;

  if (authorId) {
    const userRow = await db
      .select({ name: user.name, image: user.image })
      .from(user)
      .where(eq(user.id, authorId))
      .limit(1)
      .then((r) => r[0] ?? null);

    resolvedAuthorName = userRow?.name ?? authorName ?? null;
    resolvedAuthorAvatar = userRow?.image ?? null;
  }

  const commentId = createId();

  await db.transaction(async (tx) => {
    await tx.insert(comments).values({
      id: commentId,
      postId,
      parentId: parentId ?? null,
      body: body.trim(),
      isApproved,
      isDeleted: false,
      authorId: authorId ?? null,
      authorEmail: authorEmail ?? null,
      authorName: resolvedAuthorName,
      authorAvatar: resolvedAuthorAvatar,
    });

    if (isApproved) {
      await tx
        .update(posts)
        .set({ commentCount: sql`${posts.commentCount} + 1` })
        .where(eq(posts.id, postId));
    }
  });

  // Fetch the created comment
  const comment = await db
    .select()
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1)
    .then((r) => r[0]!);

  // Send notifications (only for approved comments)
  if (isApproved) {
    sendCommentNotifications(
      comment,
      post,
      workspace?.commentModeration ?? false
    ).catch((err) => console.error("[comments] notification error", err));
  }

  return comment;
}

export async function sendCommentNotifications(
  comment: {
    id: string;
    postId: string;
    parentId: string | null;
    authorId: string | null;
    authorEmail: string | null;
    authorName: string | null;
    body: string;
  },
  post: {
    id: string;
    title: string;
    slug: string | null;
    authorId: string | null;
    authorEmail: string;
    authorName: string | null;
    workspaceId: string;
    boardId: string;
  },
  _moderationEnabled: boolean
) {
  const appUrl = env.NEXT_PUBLIC_APP_URL;

  // Get workspace + board info for URLs
  const workspace = await db
    .select({ name: workspaces.name, slug: workspaces.slug })
    .from(workspaces)
    .where(eq(workspaces.id, post.workspaceId))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!workspace) return;

  const board = await db
    .select({ slug: boards.slug })
    .from(boards)
    .where(eq(boards.id, post.boardId))
    .limit(1)
    .then((r) => r[0] ?? null);

  const commenterName = comment.authorName ?? comment.authorEmail ?? "Someone";
  const bodyPreview = comment.body.slice(0, 300);
  const postUrl = board
    ? `${appUrl}/${workspace.slug}/b/${board.slug}/p/${post.slug ?? post.id}`
    : `${appUrl}/${workspace.slug}`;
  const postLink = board
    ? `/${workspace.slug}/b/${board.slug}/p/${post.slug ?? post.id}`
    : `/${workspace.slug}`;

  if (!comment.parentId) {
    // Top-level comment: notify post author
    if (!post.authorId || post.authorId === comment.authorId) return;
    if (!post.authorEmail) return;

    const postAuthorUser = await db
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, post.authorId))
      .limit(1)
      .then((r) => r[0] ?? null);

    try {
      const html = await renderEmailTemplate(
        NewCommentEmail({
          postAuthorName: postAuthorUser?.name ?? post.authorName ?? "there",
          postTitle: post.title,
          postUrl,
          commenterName,
          commentBody: bodyPreview,
          workspaceName: workspace.name,
        })
      );

      await enqueueEmail({
        to: post.authorEmail,
        subject: `${commenterName} commented on your post — ${post.title}`,
        html,
      });
    } catch (err) {
      console.error("[comments] failed to enqueue new-comment email", err);
    }

    // In-app notification for post author
    if (post.authorId) {
      createNotification({
        userId: post.authorId,
        workspaceId: post.workspaceId,
        type: "new_comment",
        title: `New comment on "${post.title}"`,
        body: bodyPreview.slice(0, 120),
        link: postLink,
      }).catch(() => {});
    }
  } else {
    // Reply: notify parent comment author
    const parent = await db
      .select({
        authorId: comments.authorId,
        authorEmail: comments.authorEmail,
        authorName: comments.authorName,
      })
      .from(comments)
      .where(eq(comments.id, comment.parentId))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!parent?.authorEmail && !parent?.authorId) return;
    if (parent.authorId && parent.authorId === comment.authorId) return;

    let recipientEmail: string | null = parent.authorEmail;
    let recipientName = parent.authorName ?? "there";
    let recipientUserId: string | null = parent.authorId ?? null;

    if (parent.authorId) {
      const parentUserRow = await db
        .select({ email: user.email, name: user.name })
        .from(user)
        .where(eq(user.id, parent.authorId))
        .limit(1)
        .then((r) => r[0] ?? null);

      if (parentUserRow) {
        recipientEmail = parentUserRow.email;
        recipientName = parentUserRow.name ?? recipientName;
        recipientUserId = parent.authorId;
      }
    }

    if (!recipientEmail) return;

    try {
      const html = await renderEmailTemplate(
        CommentReplyEmail({
          parentAuthorName: recipientName,
          postTitle: post.title,
          postUrl,
          replierName: commenterName,
          replyBody: bodyPreview,
          workspaceName: workspace.name,
        })
      );

      await enqueueEmail({
        to: recipientEmail,
        subject: `${commenterName} replied to your comment on ${post.title}`,
        html,
      });
    } catch (err) {
      console.error("[comments] failed to enqueue comment-reply email", err);
    }

    // In-app notification for parent comment author
    if (recipientUserId) {
      createNotification({
        userId: recipientUserId,
        workspaceId: post.workspaceId,
        type: "reply",
        title: `${commenterName} replied to your comment`,
        body: bodyPreview.slice(0, 120),
        link: postLink,
      }).catch(() => {});
    }
  }
}
