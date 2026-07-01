"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { WORKSPACE_MEMBER } from "@/config/platform";
import {
  boards,
  categories,
  votes,
  workspaceMembers,
  workspaces,
} from "@/db/schema";
import { audit } from "@/lib/audit";
import { requireSession } from "@/lib/authz";
import { getBoardById } from "@/lib/boards/queries";
import { db } from "@/lib/db";
import { isBlocked } from "@/lib/moderation/queries";
import { mergePost } from "@/lib/posts/merge";
import { movePost } from "@/lib/posts/move";
import {
  approvePost,
  createPost,
  deletePost,
  generatePostSlug,
  getPost,
  recordStatusChange,
  searchPostsForMerge,
  setPinned,
  updatePost,
  updatePostCategory,
  updatePostStatus,
} from "@/lib/posts/queries";
import { enqueueJob } from "@/lib/worker/enqueue";
import { JOB_NAMES } from "@/lib/worker/job-types";
import { getWorkspaceStatusBySlug } from "@/lib/workspace-statuses/queries";
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
    .max(10_000, "Description must be 10,000 characters or fewer.")
    .optional(),
  categoryId: z.string().min(1).optional(),
});

export async function createPostAction(input: {
  boardId: string;
  workspaceId: string;
  title: string;
  body?: string;
  categoryId?: string;
}): Promise<ActionResult<{ postSlug: string; isPending: boolean }>> {
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

  // Verify the board belongs to the workspace and check visibility.
  // Any signed-in User may submit on a public, non-archived board; private or
  // archived boards remain restricted to workspace members.
  const [boardRow] = await db
    .select({
      workspaceId: boards.workspaceId,
      isPublic: boards.isPublic,
      isArchived: boards.isArchived,
    })
    .from(boards)
    .where(eq(boards.id, parsed.data.boardId))
    .limit(1);

  if (!boardRow || boardRow.workspaceId !== parsed.data.workspaceId) {
    return { success: false, error: "Board not found." };
  }
  if (boardRow.isArchived) {
    return {
      success: false,
      error: "This board is no longer accepting feedback.",
    };
  }

  const actorMember = await getWorkspaceMember(
    parsed.data.workspaceId,
    session.user.id
  );
  if (!boardRow.isPublic && !actorMember) {
    return { success: false, error: "This board is private." };
  }

  // Block check
  const blocked = await isBlocked(parsed.data.workspaceId, {
    userId: session.user.id,
    userEmail: session.user.email,
  });
  if (blocked) {
    return {
      success: false,
      error: "You are not allowed to post in this workspace.",
      code: "BLOCKED",
    };
  }

  // Fetch workspace moderation settings
  const [workspaceRow] = await db
    .select({
      moderationMode: workspaces.moderationMode,
      spamKeywords: workspaces.spamKeywords,
    })
    .from(workspaces)
    .where(eq(workspaces.id, parsed.data.workspaceId))
    .limit(1);

  // Spam keyword check
  const spamKeywords = workspaceRow?.spamKeywords ?? [];
  const titleLower = parsed.data.title.toLowerCase();
  const bodyLower = (parsed.data.body ?? "").toLowerCase();
  const isSpam = spamKeywords.some(
    (kw) => titleLower.includes(kw) || bodyLower.includes(kw)
  );

  // Determine approval status
  const moderationMode = workspaceRow?.moderationMode ?? "off";
  const isApproved =
    !isSpam &&
    moderationMode !== "manual" &&
    (moderationMode !== "auto" || !isSpam);

  // Validate the optional category belongs to this workspace (cross-tenant safety).
  let categoryId: string | null = null;
  if (parsed.data.categoryId) {
    const [category] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.id, parsed.data.categoryId),
          eq(categories.workspaceId, parsed.data.workspaceId)
        )
      )
      .limit(1);
    if (!category) {
      return {
        success: false,
        error: "Invalid category.",
        field: "categoryId",
      };
    }
    categoryId = category.id;
  }

  const slug = await generatePostSlug(parsed.data.boardId, parsed.data.title);

  const post = await createPost({
    boardId: parsed.data.boardId,
    workspaceId: parsed.data.workspaceId,
    slug,
    title: parsed.data.title,
    body: parsed.data.body,
    categoryId,
    authorId: session.user.id,
    authorName: session.user.name ?? null,
    authorEmail: session.user.email,
    isApproved,
  });

  audit({
    workspaceId: parsed.data.workspaceId,
    action: "post.created",
    actorId: session.user.id,
    actorEmail: session.user.email,
    actorName: session.user.name ?? null,
    entityType: "post",
    entityId: post.id,
    description: `Created post: ${parsed.data.title}`,
    metadata: {
      boardId: parsed.data.boardId,
      workspaceId: parsed.data.workspaceId,
      title: parsed.data.title,
      slug,
      isApproved,
    },
  });

  // Only notify admins when post is immediately visible
  if (post.isApproved) {
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
  }

  return {
    success: true,
    data: { postSlug: post.slug, isPending: !post.isApproved },
  };
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

  // Triage (changing status) is available to any workspace member — Brand Admin
  // and Team Member alike (PLATFORM.md §4).
  const actorMember = await getWorkspaceMember(
    parsed.data.workspaceId,
    session.user.id
  );
  if (!actorMember) {
    return {
      success: false,
      error: "Only workspace members can update post status.",
    };
  }

  const post = await getPost(parsed.data.postId);
  if (!post || post.workspaceId !== parsed.data.workspaceId) {
    return { success: false, error: "Post not found." };
  }
  if (post.status === parsed.data.status) {
    return { success: true, data: undefined };
  }

  // A post's status must be one of the workspace's defined statuses.
  const targetStatus = await getWorkspaceStatusBySlug(
    parsed.data.workspaceId,
    parsed.data.status
  );
  if (!targetStatus) {
    return { success: false, error: "That status does not exist." };
  }

  await updatePostStatus(parsed.data.postId, parsed.data.status);

  // Append to the post's status history (who changed it, from → to).
  recordStatusChange({
    postId: parsed.data.postId,
    fromStatus: post.status,
    toStatus: parsed.data.status,
    changedBy: session.user.id,
    changedByName: session.user.name ?? session.user.email,
  }).catch((err) =>
    console.error("[posts] failed to record status change", err)
  );

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

  // Pinning is a triage action available to any workspace member (PLATFORM.md §4).
  const actorMember = await getWorkspaceMember(
    input.workspaceId,
    session.user.id
  );
  if (!actorMember) {
    return {
      success: false,
      error: "Only workspace members can pin posts.",
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

  const post = await getPost(input.postId);
  if (!post || post.workspaceId !== input.workspaceId) {
    return { success: false, error: "Post not found." };
  }

  const actorMember = await getWorkspaceMember(
    input.workspaceId,
    session.user.id
  );
  const isAuthor = post.authorId === session.user.id;

  // Any workspace member may remove feedback as clean-up (PLATFORM.md §4);
  // authors may remove their own feedback.
  if (!isAuthor && !actorMember) {
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

// ─── Update Post (edit title / body) ─────────────────────────────────────────

const updatePostSchema = z.object({
  postId: z.string().min(1),
  workspaceId: z.string().min(1),
  title: z
    .string()
    .min(3, "Title must be at least 3 characters.")
    .max(150, "Title must be 150 characters or fewer."),
  body: z
    .string()
    .max(10_000, "Description must be 10,000 characters or fewer.")
    .optional(),
});

export async function updatePostAction(input: {
  postId: string;
  workspaceId: string;
  title: string;
  body?: string;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  const parsed = updatePostSchema.safeParse(input);
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

  const post = await getPost(parsed.data.postId);
  if (!post || post.workspaceId !== parsed.data.workspaceId) {
    return { success: false, error: "Post not found." };
  }

  // The author can edit their own post; admins and owners can edit any post.
  const isAuthor = post.authorId === session.user.id;
  const isAdminOrOwner = actorMember.role !== WORKSPACE_MEMBER;
  if (!isAuthor && !isAdminOrOwner) {
    return {
      success: false,
      error: "You don't have permission to edit this post.",
    };
  }

  await updatePost(parsed.data.postId, {
    title: parsed.data.title,
    body: parsed.data.body?.trim() ? parsed.data.body : null,
  });

  audit({
    action: "post.updated",
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: "post",
    entityId: parsed.data.postId,
    description: `Edited post: ${parsed.data.title}`,
    metadata: { workspaceId: parsed.data.workspaceId, wasAuthor: isAuthor },
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

  // Assigning a category is a triage action available to any workspace member
  // (PLATFORM.md §4). Defining categories themselves remains Brand-Admin-only.
  const actorMember = await getWorkspaceMember(
    input.workspaceId,
    session.user.id
  );
  if (!actorMember) {
    return {
      success: false,
      error: "Only workspace members can set post categories.",
    };
  }

  const post = await getPost(input.postId);
  if (!post || post.workspaceId !== input.workspaceId) {
    return { success: false, error: "Post not found." };
  }

  await updatePostCategory(input.postId, input.categoryId);
  return { success: true, data: undefined };
}

// ─── Approve Post (moderation queue) ─────────────────────────────────────────

export async function approvePostAction(input: {
  postId: string;
  workspaceId: string;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  const actorMember = await getWorkspaceMember(
    input.workspaceId,
    session.user.id
  );
  if (!actorMember || actorMember.role === WORKSPACE_MEMBER) {
    return {
      success: false,
      error: "Only admins and owners can approve posts.",
    };
  }

  const post = await getPost(input.postId);
  if (!post || post.workspaceId !== input.workspaceId) {
    return { success: false, error: "Post not found." };
  }

  if (post.isApproved) {
    return { success: true, data: undefined };
  }

  await approvePost(input.postId);

  audit({
    workspaceId: input.workspaceId,
    action: "post.approved",
    actorId: session.user.id,
    actorEmail: session.user.email,
    actorName: session.user.name ?? null,
    entityType: "post",
    entityId: input.postId,
    entityName: post.title,
    description: `Approved post: ${post.title}`,
    metadata: { workspaceId: input.workspaceId },
  });

  // Now that it's visible, notify admins
  enqueueNewPostAlerts({
    postId: post.id,
    postTitle: post.title,
    postBody: post.body ?? null,
    postSlug: post.slug,
    boardId: post.boardId,
    workspaceId: input.workspaceId,
    authorId: post.authorId ?? "",
    authorName: post.authorName ?? post.authorEmail ?? "Someone",
  }).catch((err) =>
    console.error(
      "[posts] failed to enqueue new-post alerts after approval",
      err
    )
  );

  return { success: true, data: undefined };
}

// ─── Move Post ────────────────────────────────────────────────────────────────

export async function movePostAction(input: {
  postId: string;
  workspaceId: string;
  targetBoardId: string;
}): Promise<ActionResult<{ slug: string; boardSlug: string }>> {
  const session = await requireSession();

  // Moving is a triage action available to any workspace member (PLATFORM.md §4).
  const actorMember = await getWorkspaceMember(
    input.workspaceId,
    session.user.id
  );
  if (!actorMember) {
    return {
      success: false,
      error: "Only workspace members can move feedback.",
    };
  }

  const post = await getPost(input.postId);
  if (!post || post.workspaceId !== input.workspaceId) {
    return { success: false, error: "Post not found." };
  }

  const target = await getBoardById(input.targetBoardId);
  if (!target || target.workspaceId !== input.workspaceId) {
    return { success: false, error: "Destination board not found." };
  }
  if (target.id === post.boardId) {
    return { success: false, error: "This post is already on that board." };
  }

  const { slug } = await movePost(input.postId, target.id);

  audit({
    action: "post.moved",
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: "post",
    entityId: input.postId,
    description: `Moved post: ${post.title}`,
    metadata: {
      workspaceId: input.workspaceId,
      fromBoardId: post.boardId,
      toBoardId: target.id,
    },
  });

  return { success: true, data: { slug, boardSlug: target.slug } };
}

// ─── Merge Post ───────────────────────────────────────────────────────────────

export async function mergePostAction(input: {
  sourceId: string;
  targetId: string;
  workspaceId: string;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  // Merging is a triage action available to any workspace member (PLATFORM.md §4).
  const actorMember = await getWorkspaceMember(
    input.workspaceId,
    session.user.id
  );
  if (!actorMember) {
    return {
      success: false,
      error: "Only workspace members can merge feedback.",
    };
  }

  if (input.sourceId === input.targetId) {
    return { success: false, error: "A post can't be merged into itself." };
  }

  const source = await getPost(input.sourceId);
  if (!source || source.workspaceId !== input.workspaceId) {
    return { success: false, error: "Post not found." };
  }
  if (source.mergedIntoId) {
    return { success: false, error: "This post is already merged." };
  }

  const target = await getPost(input.targetId);
  if (!target || target.workspaceId !== input.workspaceId) {
    return { success: false, error: "The post to merge into was not found." };
  }
  if (target.mergedIntoId) {
    return {
      success: false,
      error: "The post you're merging into is itself merged.",
    };
  }

  await mergePost(input.sourceId, input.targetId);

  audit({
    action: "post.merged",
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: "post",
    entityId: input.sourceId,
    description: `Merged "${source.title}" into "${target.title}"`,
    metadata: { workspaceId: input.workspaceId, targetId: input.targetId },
  });

  return { success: true, data: undefined };
}

// ─── Merge Target Search ────────────────────────────────────────────────────

export async function searchMergeTargetsAction(input: {
  workspaceId: string;
  query: string;
  excludePostId: string;
}): Promise<
  ActionResult<{ posts: { id: string; title: string; upvotes: number }[] }>
> {
  const session = await requireSession();

  const actorMember = await getWorkspaceMember(
    input.workspaceId,
    session.user.id
  );
  if (!actorMember) {
    return { success: false, error: "Forbidden." };
  }

  const results = await searchPostsForMerge(
    input.workspaceId,
    input.query,
    input.excludePostId
  );
  return { success: true, data: { posts: results } };
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

  if (!boardRow || !workspaceRow) {
    return;
  }

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
    if (!email) {
      continue;
    }

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

  if (!boardRow || !workspaceRow) {
    return;
  }

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
    if (admin.userId === input.authorId) {
      continue;
    }

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
