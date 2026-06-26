"use server";

import { z } from "zod";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { audit } from "@/lib/audit";
import { requireSession } from "@/lib/authz";
import { createCategory } from "@/lib/categories/create";
import { deleteCategory } from "@/lib/categories/delete";
import { getCategoryById } from "@/lib/categories/queries";
import { reorderCategories, updateCategory } from "@/lib/categories/update";
import { updatePostCategory } from "@/lib/posts/queries";
import { getWorkspaceMember } from "@/lib/workspaces/queries";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string; field?: string };

// ─── Create Category ──────────────────────────────────────────────────────────

const createCategorySchema = z.object({
  workspaceId: z.string().min(1),
  name: z
    .string()
    .min(1, "Name is required.")
    .max(64, "Name must be 64 characters or fewer."),
  description: z.string().max(200).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid color.")
    .optional(),
});

export async function createCategoryAction(input: {
  workspaceId: string;
  name: string;
  description?: string;
  color?: string;
}): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();

  const parsed = createCategorySchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      success: false,
      error: first?.message ?? "Invalid input.",
      field: first?.path[0] as string,
    };
  }

  const member = await getWorkspaceMember(
    parsed.data.workspaceId,
    session.user.id
  );
  if (!member || member.role === WORKSPACE_MEMBER) {
    return {
      success: false,
      error: "Only admins and owners can manage categories.",
    };
  }

  try {
    const category = await createCategory({
      workspaceId: parsed.data.workspaceId,
      name: parsed.data.name,
      description: parsed.data.description,
      color: parsed.data.color,
    });

    audit({
      action: "category.created",
      actorId: session.user.id,
      actorEmail: session.user.email,
      description: `Category created: ${category.name}`,
      entityType: "category",
      entityId: category.id,
      metadata: { name: category.name, workspaceId: parsed.data.workspaceId },
    });

    return { success: true, data: { id: category.id } };
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to create category.";
    if (msg.includes("unique")) {
      return {
        success: false,
        error: "A category with this name already exists.",
        field: "name",
      };
    }
    return { success: false, error: msg };
  }
}

// ─── Update Category ──────────────────────────────────────────────────────────

const updateCategorySchema = z.object({
  categoryId: z.string().min(1),
  workspaceId: z.string().min(1),
  name: z.string().min(1).max(64).optional(),
  description: z.string().max(200).nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  isArchived: z.boolean().optional(),
});

export async function updateCategoryAction(input: {
  categoryId: string;
  workspaceId: string;
  name?: string;
  description?: string | null;
  color?: string;
  isArchived?: boolean;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  const parsed = updateCategorySchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { success: false, error: first?.message ?? "Invalid input." };
  }

  const member = await getWorkspaceMember(
    parsed.data.workspaceId,
    session.user.id
  );
  if (!member || member.role === WORKSPACE_MEMBER) {
    return {
      success: false,
      error: "Only admins and owners can manage categories.",
    };
  }

  const category = await getCategoryById(parsed.data.categoryId);
  if (!category || category.workspaceId !== parsed.data.workspaceId) {
    return { success: false, error: "Category not found." };
  }

  try {
    await updateCategory(parsed.data.categoryId, {
      name: parsed.data.name,
      description: parsed.data.description,
      color: parsed.data.color,
      isArchived: parsed.data.isArchived,
    });

    return { success: true, data: undefined };
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to update category.";
    if (msg.includes("unique")) {
      return {
        success: false,
        error: "A category with this name already exists.",
        field: "name",
      };
    }
    return { success: false, error: msg };
  }
}

// ─── Delete Category ──────────────────────────────────────────────────────────

export async function deleteCategoryAction(input: {
  categoryId: string;
  workspaceId: string;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  const member = await getWorkspaceMember(input.workspaceId, session.user.id);
  if (!member || member.role === WORKSPACE_MEMBER) {
    return {
      success: false,
      error: "Only admins and owners can manage categories.",
    };
  }

  const category = await getCategoryById(input.categoryId);
  if (!category || category.workspaceId !== input.workspaceId) {
    return { success: false, error: "Category not found." };
  }

  await deleteCategory(input.categoryId);

  audit({
    action: "category.deleted",
    actorId: session.user.id,
    actorEmail: session.user.email,
    description: `Category deleted: ${category.name}`,
    entityType: "category",
    entityId: input.categoryId,
    metadata: { name: category.name, workspaceId: input.workspaceId },
  });

  return { success: true, data: undefined };
}

// ─── Reorder Categories ───────────────────────────────────────────────────────

export async function reorderCategoriesAction(input: {
  workspaceId: string;
  orderedIds: string[];
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  const member = await getWorkspaceMember(input.workspaceId, session.user.id);
  if (!member || member.role === WORKSPACE_MEMBER) {
    return {
      success: false,
      error: "Only admins and owners can manage categories.",
    };
  }

  await reorderCategories(input.workspaceId, input.orderedIds);
  return { success: true, data: undefined };
}

// ─── Update Post Category ─────────────────────────────────────────────────────

export async function updatePostCategoryAction(input: {
  postId: string;
  workspaceId: string;
  categoryId: string | null;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  const member = await getWorkspaceMember(input.workspaceId, session.user.id);
  if (!member || member.role === WORKSPACE_MEMBER) {
    return {
      success: false,
      error: "Only admins and owners can set post categories.",
    };
  }

  await updatePostCategory(input.postId, input.categoryId);
  return { success: true, data: undefined };
}
