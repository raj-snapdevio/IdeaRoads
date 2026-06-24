"use server";

import { z } from "zod";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { audit } from "@/lib/audit";
import { requireSession } from "@/lib/authz";
import {
  createPost,
  deletePost,
  getPost,
  updatePostStatus,
} from "@/lib/posts/queries";
import { getWorkspaceMember } from "@/lib/workspaces/queries";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string; field?: string; code?: string };

// ─── Create Post ──────────────────────────────────────────────────────────────

const createPostSchema = z.object({
  boardId: z.string().min(1),
  workspaceId: z.string().min(1),
  title: z
    .string()
    .min(1, "Title is required.")
    .max(200, "Title must be 200 characters or fewer."),
  body: z
    .string()
    .max(5000, "Description must be 5000 characters or fewer.")
    .optional(),
});

export async function createPostAction(input: {
  boardId: string;
  workspaceId: string;
  title: string;
  body?: string;
}): Promise<ActionResult<{ postId: string }>> {
  const session = await requireSession();

  const parsed = createPostSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      success: false,
      error: first?.message ?? "Invalid input.",
      field: first?.path[0] as string | undefined,
    };
  }

  const actorMember = await getWorkspaceMember(
    parsed.data.workspaceId,
    session.user.id
  );
  if (!actorMember) {
    return { success: false, error: "You are not a member of this workspace." };
  }

  const post = await createPost({
    boardId: parsed.data.boardId,
    workspaceId: parsed.data.workspaceId,
    title: parsed.data.title,
    body: parsed.data.body,
    authorId: session.user.id,
    authorName: session.user.name ?? null,
    authorEmail: session.user.email,
  });

  audit({
    action: "post.created",
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: "post",
    entityId: post.id,
    description: `Created post: ${parsed.data.title}`,
    metadata: {
      boardId: parsed.data.boardId,
      workspaceId: parsed.data.workspaceId,
      title: parsed.data.title,
    },
  });

  return { success: true, data: { postId: post.id } };
}

// ─── Update Post Status ───────────────────────────────────────────────────────

const updateStatusSchema = z.object({
  postId: z.string().min(1),
  workspaceId: z.string().min(1),
  status: z.enum([
    "open",
    "under_review",
    "planned",
    "in_progress",
    "done",
    "declined",
  ]),
});

export async function updatePostStatusAction(input: {
  postId: string;
  workspaceId: string;
  status:
    | "open"
    | "under_review"
    | "planned"
    | "in_progress"
    | "done"
    | "declined";
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  const parsed = updateStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid input." };
  }

  const actorMember = await getWorkspaceMember(
    parsed.data.workspaceId,
    session.user.id
  );
  if (!actorMember || actorMember.role === WORKSPACE_MEMBER) {
    return {
      success: false,
      error: "Only admins and owners can update post status.",
    };
  }

  const post = await getPost(parsed.data.postId);
  if (!post || post.workspaceId !== parsed.data.workspaceId) {
    return { success: false, error: "Post not found." };
  }
  if (post.status === parsed.data.status) {
    return { success: true, data: undefined };
  }

  await updatePostStatus(parsed.data.postId, parsed.data.status);

  audit({
    action: "post.status_changed",
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: "post",
    entityId: parsed.data.postId,
    description: `Status changed: ${post.status} → ${parsed.data.status}`,
    metadata: {
      workspaceId: parsed.data.workspaceId,
      fromStatus: post.status,
      toStatus: parsed.data.status,
    },
  });

  return { success: true, data: undefined };
}

// ─── Delete Post ──────────────────────────────────────────────────────────────

export async function deletePostAction(input: {
  postId: string;
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

  const post = await getPost(input.postId);
  if (!post || post.workspaceId !== input.workspaceId) {
    return { success: false, error: "Post not found." };
  }

  const isAuthor = post.authorId === session.user.id;
  const isAdminOrOwner = actorMember.role !== WORKSPACE_MEMBER;

  if (!isAuthor && !isAdminOrOwner) {
    return {
      success: false,
      error: "You don't have permission to delete this post.",
    };
  }

  await deletePost(input.postId);

  audit({
    action: "post.deleted",
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: "post",
    entityId: input.postId,
    description: `Deleted post: ${post.title}`,
    metadata: {
      workspaceId: input.workspaceId,
      title: post.title,
      wasAuthor: isAuthor,
    },
  });

  return { success: true, data: undefined };
}
