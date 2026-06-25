"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { boards, votes, workspaceMembers, workspaces } from "@/db/schema";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireSession } from "@/lib/authz";
import {
  createPost,
  deletePost,
  generatePostSlug,
  getPost,
  setPinned,
  updatePostCategory,
  updatePostStatus,
} from "@/lib/posts/queries";
import { enqueueJob } from "@/lib/worker/enqueue";
import { JOB_NAMES } from "@/lib/worker/job-types";
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
    .min(3, "Title must be at least 3 characters.")
    .max(150, "Title must be 150 characters or fewer."),
  body: z
    .string()
    .max(10000, "Description must be 10,000 characters or fewer.")
    .optional(),
});

export async function createPostAction(input: {
  boardId: string;
  workspaceId: string;
  title: string;
  body?: string;
}): Promise<ActionResult<{ postSlug: string }>> {
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

  const slug = await generatePostSlug(parsed.data.boardId, parsed.data.title);

  const post = await createPost({
    boardId: parsed.data.boardId,
    workspaceId: parsed.data.workspaceId,
    slug,
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
      slug,
    },
  });

  // Notify workspace admins/owners (fire-and-forget)
  enqueueNewPostAlerts({
    postId: post.id,
    postTitle: parsed.data.title,
    postBody: parsed.data.body ?? null,
    postSlug: slug,
    boardId: parsed.data.boardId,
    workspaceId: parsed.data.workspaceId,
    authorId: session.user.id,
    authorName: session.user.name ?? session.user.email,
  }).catch((err) =>
    console.error("[posts] failed to enqueue new-post alerts", err)
  );

  return { success: true, data: { postSlug: post.slug } };
}

// ─── Update Post Status ───────────────────────────────────────────────────────

const updateStatusSchema = z.object({
  postId: z.string().min(1),
  workspaceId: z.string().min(1),
  status: z.string().min(1),
});

export async function updatePostStatusAction(input: {
  postId: string;
  workspaceId: string;
  status: string;
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

  // Notify voters (fire-and-forget)
  enqueueStatusChangeEmails({
    postId: parsed.data.postId,
    postTitle: post.title,
    postSlug: post.slug,
    boardId: post.boardId,
    workspaceId: parsed.data.workspaceId,
    fromStatus: post.status,
    toStatus: parsed.data.status,
    changedById: session.user.id,
  }).catch((err) =>
    console.error("[posts] failed to enqueue status-change emails", err)
  );

  return { success: true, data: undefined };
}

// ─── Pin / Unpin Post ─────────────────────────────────────────────────────────

export async function pinPostAction(input: {
  postId: string;
  workspaceId: string;
  pin: boolean;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  const actorMember = await getWorkspaceMember(
    input.workspaceId,
    session.user.id
  );
  if (!actorMember || actorMember.role === WORKSPACE_MEMBER) {
    return {
      success: false,
      error: "Only admins and owners can pin posts.",
    };
  }

  const post = await getPost(input.postId);
  if (!post || post.workspaceId !== input.workspaceId) {
    return { success: false, error: "Post not found." };
  }
  if (post.isPinned === input.pin) {
    return { success: true, data: undefined };
  }

  await setPinned(input.postId, input.pin);

  audit({
    action: input.pin ? "post.pinned" : "post.unpinned",
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: "post",
    entityId: input.postId,
    description: `Post ${input.pin ? "pinned" : "unpinned"}: ${post.title}`,
    metadata: { workspaceId: input.workspaceId },
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

// ─── Update Post Category ─────────────────────────────────────────────────────

export async function updatePostCategoryAction(input: {
  postId: string;
  workspaceId: string;
  categoryId: string | null;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  const actorMember = await getWorkspaceMember(
    input.workspaceId,
    session.user.id
  );
  if (!actorMember || actorMember.role === WORKSPACE_MEMBER) {
    return {
      success: false,
      error: "Only admins and owners can set post categories.",
    };
  }

  const post = await getPost(input.postId);
  if (!post || post.workspaceId !== input.workspaceId) {
    return { success: false, error: "Post not found." };
  }

  await updatePostCategory(input.postId, input.categoryId);
  return { success: true, data: undefined };
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

async function enqueueStatusChangeEmails(input: {
  postId: string;
  postTitle: string;
  postSlug: string;
  boardId: string;
  workspaceId: string;
  fromStatus: string;
  toStatus: string;
  changedById: string;
}) {
  const [boardRow] = await db
    .select({ slug: boards.slug })
    .from(boards)
    .where(eq(boards.id, input.boardId))
    .limit(1);

  const [workspaceRow] = await db
    .select({ slug: workspaces.slug, name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.id, input.workspaceId))
    .limit(1);

  if (!boardRow || !workspaceRow) return;

  const voters = await db
    .select({
      userId: votes.userId,
      userEmail: votes.userEmail,
      userName: votes.userName,
    })
    .from(votes)
    .where(eq(votes.postId, input.postId));

  for (const voter of voters) {
    const email = voter.userEmail;
    if (!email) continue;

    await enqueueJob(JOB_NAMES.SEND_STATUS_CHANGE_EMAIL, {
      postId: input.postId,
      postTitle: input.postTitle,
      postSlug: input.postSlug,
      workspaceId: input.workspaceId,
      workspaceSlug: workspaceRow.slug,
      workspaceName: workspaceRow.name,
      boardSlug: boardRow.slug,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      voterEmail: email,
      voterName: voter.userName ?? email.split("@")[0],
      voterUserId: voter.userId ?? null,
      changedById: input.changedById,
    });
  }
}

async function enqueueNewPostAlerts(input: {
  postId: string;
  postTitle: string;
  postBody: string | null;
  postSlug: string;
  boardId: string;
  workspaceId: string;
  authorId: string;
  authorName: string;
}) {
  const [boardRow] = await db
    .select({ slug: boards.slug, name: boards.name })
    .from(boards)
    .where(eq(boards.id, input.boardId))
    .limit(1);

  const [workspaceRow] = await db
    .select({ slug: workspaces.slug, name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.id, input.workspaceId))
    .limit(1);

  if (!boardRow || !workspaceRow) return;

  const { user: userTable } = await import("@/db/schema/auth");

  const admins = await db
    .select({
      userId: workspaceMembers.userId,
      email: userTable.email,
      name: userTable.name,
    })
    .from(workspaceMembers)
    .innerJoin(userTable, eq(workspaceMembers.userId, userTable.id))
    .where(eq(workspaceMembers.workspaceId, input.workspaceId));

  for (const admin of admins) {
    if (admin.userId === input.authorId) continue;

    await enqueueJob(JOB_NAMES.SEND_NEW_POST_ALERT, {
      postId: input.postId,
      postTitle: input.postTitle,
      postBody: input.postBody,
      postSlug: input.postSlug,
      workspaceId: input.workspaceId,
      workspaceSlug: workspaceRow.slug,
      workspaceName: workspaceRow.name,
      boardName: boardRow.name,
      boardSlug: boardRow.slug,
      authorName: input.authorName,
      authorId: input.authorId,
      adminEmail: admin.email,
      adminUserId: admin.userId,
    });
  }
}
