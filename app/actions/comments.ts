"use server";

import { z } from "zod";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { audit } from "@/lib/audit";
import { requireSession } from "@/lib/authz";
import { addComment, deleteComment, getComment } from "@/lib/posts/comments";
import { getPost } from "@/lib/posts/queries";
import { getWorkspaceMember } from "@/lib/workspaces/queries";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string; field?: string };

const addCommentSchema = z.object({
  postId: z.string().min(1),
  workspaceId: z.string().min(1),
  content: z
    .string()
    .min(1, "Comment cannot be empty.")
    .max(2000, "Comment must be 2000 characters or fewer."),
});

export async function addCommentAction(input: {
  postId: string;
  workspaceId: string;
  content: string;
}): Promise<ActionResult<{ commentId: string }>> {
  const session = await requireSession();

  const parsed = addCommentSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { success: false, error: first?.message ?? "Invalid input." };
  }

  const actorMember = await getWorkspaceMember(
    parsed.data.workspaceId,
    session.user.id
  );
  if (!actorMember) {
    return { success: false, error: "You are not a member of this workspace." };
  }

  const post = await getPost(parsed.data.postId);
  if (!post || post.workspaceId !== parsed.data.workspaceId) {
    return { success: false, error: "Post not found." };
  }
  if (post.isLocked) {
    return {
      success: false,
      error: "This post is locked and cannot receive comments.",
    };
  }

  const comment = await addComment({
    postId: parsed.data.postId,
    authorId: session.user.id,
    authorName: session.user.name ?? null,
    authorEmail: session.user.email,
    content: parsed.data.content,
  });

  audit({
    action: "comment.created",
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: "post",
    entityId: parsed.data.postId,
    description: `Commented on post`,
    metadata: { workspaceId: parsed.data.workspaceId, commentId: comment.id },
  });

  return { success: true, data: { commentId: comment.id } };
}

export async function deleteCommentAction(input: {
  commentId: string;
  workspaceId: string;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  const actorMember = await getWorkspaceMember(
    input.workspaceId,
    session.user.id
  );
  if (!actorMember) {
    return { success: false, error: "You are not a member of this workspace." };
  }

  const comment = await getComment(input.commentId);
  if (!comment) {
    return { success: false, error: "Comment not found." };
  }

  const isAuthor = comment.authorId === session.user.id;
  const isAdminOrOwner = actorMember.role !== WORKSPACE_MEMBER;

  if (!isAuthor && !isAdminOrOwner) {
    return {
      success: false,
      error: "You don't have permission to delete this comment.",
    };
  }

  await deleteComment(input.commentId);

  audit({
    action: "comment.deleted",
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: "post",
    entityId: comment.postId,
    description: `Deleted comment`,
    metadata: { workspaceId: input.workspaceId, commentId: input.commentId },
  });

  return { success: true, data: undefined };
}
