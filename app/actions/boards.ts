"use server";

import { z } from "zod";
import { MAX_BOARDS_PER_WORKSPACE, WORKSPACE_MEMBER } from "@/config/platform";
import { audit } from "@/lib/audit";
import { requireSession } from "@/lib/authz";
import {
  createBoard,
  generateBoardSlug,
  validateBoardSlug,
} from "@/lib/boards/create";
import { deleteBoard } from "@/lib/boards/delete";
import { countActiveBoards, getBoardById } from "@/lib/boards/queries";
import { reorderBoards, updateBoard } from "@/lib/boards/update";
import { getWorkspaceMember } from "@/lib/workspaces/queries";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string; field?: string };

const MANAGE_DENIED = "Only the Brand Admin can manage boards." as const;

/** Brand Admin guard — owner/admin only, never a Team Member. */
async function requireBoardManager(workspaceId: string, userId: string) {
  const member = await getWorkspaceMember(workspaceId, userId);
  if (!member || member.role === WORKSPACE_MEMBER) {
    return null;
  }
  return member;
}

// ─── Create Board ─────────────────────────────────────────────────────────────

const createBoardSchema = z.object({
  workspaceId: z.string().min(1),
  name: z
    .string()
    .min(1, "Name is required.")
    .max(64, "Name must be 64 characters or fewer."),
  slug: z.string().max(64).optional(),
  description: z.string().max(200).optional(),
  isPublic: z.boolean().optional(),
});

export async function createBoardAction(input: {
  workspaceId: string;
  name: string;
  slug?: string;
  description?: string;
  isPublic?: boolean;
}): Promise<ActionResult<{ slug: string }>> {
  const session = await requireSession();

  const parsed = createBoardSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      success: false,
      error: first?.message ?? "Invalid input.",
      field: first?.path[0] as string,
    };
  }

  if (!(await requireBoardManager(parsed.data.workspaceId, session.user.id))) {
    return { success: false, error: MANAGE_DENIED };
  }

  // Enforce the active-board limit (archived boards do not count).
  const activeCount = await countActiveBoards(parsed.data.workspaceId);
  if (activeCount >= MAX_BOARDS_PER_WORKSPACE) {
    return {
      success: false,
      error: `You've reached the limit of ${MAX_BOARDS_PER_WORKSPACE} active boards. Archive or delete a board first.`,
    };
  }

  // Resolve slug: validate an explicit one, otherwise derive from the name.
  let slug: string;
  if (parsed.data.slug?.trim()) {
    const result = await validateBoardSlug(
      parsed.data.workspaceId,
      parsed.data.slug
    );
    if ("error" in result) {
      return { success: false, error: result.error, field: "slug" };
    }
    slug = result.slug;
  } else {
    slug = await generateBoardSlug(parsed.data.workspaceId, parsed.data.name);
  }

  const board = await createBoard({
    workspaceId: parsed.data.workspaceId,
    name: parsed.data.name,
    slug,
    description: parsed.data.description,
    isPublic: parsed.data.isPublic ?? true,
    createdBy: session.user.id,
  });

  audit({
    action: "board.created",
    actorId: session.user.id,
    actorEmail: session.user.email,
    description: `Board created: ${board.name}`,
    entityType: "board",
    entityId: board.id,
    metadata: { name: board.name, workspaceId: parsed.data.workspaceId },
  });

  return { success: true, data: { slug: board.slug } };
}

// ─── Update Board ─────────────────────────────────────────────────────────────

const updateBoardSchema = z.object({
  boardId: z.string().min(1),
  workspaceId: z.string().min(1),
  name: z.string().min(1).max(64).optional(),
  slug: z.string().max(64).optional(),
  description: z.string().max(200).nullable().optional(),
  isPublic: z.boolean().optional(),
});

export async function updateBoardAction(input: {
  boardId: string;
  workspaceId: string;
  name?: string;
  slug?: string;
  description?: string | null;
  isPublic?: boolean;
}): Promise<ActionResult<{ slug: string }>> {
  const session = await requireSession();

  const parsed = updateBoardSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { success: false, error: first?.message ?? "Invalid input." };
  }

  if (!(await requireBoardManager(parsed.data.workspaceId, session.user.id))) {
    return { success: false, error: MANAGE_DENIED };
  }

  const board = await getBoardById(parsed.data.boardId);
  if (!board || board.workspaceId !== parsed.data.workspaceId) {
    return { success: false, error: "Board not found." };
  }

  // Resolve slug if the user supplied one that differs from the current slug.
  let slug = board.slug;
  if (parsed.data.slug?.trim() && parsed.data.slug.trim() !== board.slug) {
    const result = await validateBoardSlug(
      parsed.data.workspaceId,
      parsed.data.slug,
      board.id
    );
    if ("error" in result) {
      return { success: false, error: result.error, field: "slug" };
    }
    slug = result.slug;
  }

  await updateBoard(parsed.data.boardId, {
    name: parsed.data.name,
    slug,
    description: parsed.data.description,
    isPublic: parsed.data.isPublic,
  });

  audit({
    action: "board.updated",
    actorId: session.user.id,
    actorEmail: session.user.email,
    description: `Board updated: ${parsed.data.name ?? board.name}`,
    entityType: "board",
    entityId: board.id,
    metadata: { workspaceId: parsed.data.workspaceId },
  });

  return { success: true, data: { slug } };
}

// ─── Archive / Unarchive Board ─────────────────────────────────────────────────

export async function setBoardArchivedAction(input: {
  boardId: string;
  workspaceId: string;
  archived: boolean;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  if (!(await requireBoardManager(input.workspaceId, session.user.id))) {
    return { success: false, error: MANAGE_DENIED };
  }

  const board = await getBoardById(input.boardId);
  if (!board || board.workspaceId !== input.workspaceId) {
    return { success: false, error: "Board not found." };
  }
  if (board.isArchived === input.archived) {
    return { success: true, data: undefined };
  }

  // Unarchiving brings a board back into the active set — respect the limit.
  if (!input.archived) {
    const activeCount = await countActiveBoards(input.workspaceId);
    if (activeCount >= MAX_BOARDS_PER_WORKSPACE) {
      return {
        success: false,
        error: `You've reached the limit of ${MAX_BOARDS_PER_WORKSPACE} active boards. Archive or delete a board first.`,
      };
    }
  }

  await updateBoard(input.boardId, { isArchived: input.archived });

  audit({
    action: input.archived ? "board.archived" : "board.unarchived",
    actorId: session.user.id,
    actorEmail: session.user.email,
    description: `Board ${input.archived ? "archived" : "unarchived"}: ${board.name}`,
    entityType: "board",
    entityId: board.id,
    metadata: { workspaceId: input.workspaceId },
  });

  return { success: true, data: undefined };
}

// ─── Delete Board ─────────────────────────────────────────────────────────────

export async function deleteBoardAction(input: {
  boardId: string;
  workspaceId: string;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  if (!(await requireBoardManager(input.workspaceId, session.user.id))) {
    return { success: false, error: MANAGE_DENIED };
  }

  const board = await getBoardById(input.boardId);
  if (!board || board.workspaceId !== input.workspaceId) {
    return { success: false, error: "Board not found." };
  }

  // A workspace can never delete its last active board (an archived board can
  // always be deleted).
  if (!board.isArchived) {
    const activeCount = await countActiveBoards(input.workspaceId);
    if (activeCount <= 1) {
      return {
        success: false,
        error:
          "You can't delete the only active board. Create another board, or archive this one first.",
      };
    }
  }

  await deleteBoard(input.boardId);

  audit({
    action: "board.deleted",
    actorId: session.user.id,
    actorEmail: session.user.email,
    description: `Board deleted: ${board.name}`,
    entityType: "board",
    entityId: board.id,
    metadata: { name: board.name, workspaceId: input.workspaceId },
  });

  return { success: true, data: undefined };
}

// ─── Reorder Boards ─────────────────────────────────────────────────────────────

export async function reorderBoardsAction(input: {
  workspaceId: string;
  orderedIds: string[];
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  if (!(await requireBoardManager(input.workspaceId, session.user.id))) {
    return { success: false, error: MANAGE_DENIED };
  }

  await reorderBoards(input.workspaceId, input.orderedIds);
  return { success: true, data: undefined };
}
