"use server";

import { z } from "zod";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { audit } from "@/lib/audit";
import { requireSession } from "@/lib/authz";
import { CHANGELOG_LABEL_VALUES } from "@/lib/changelog/constants";
import { createChangelogEntry } from "@/lib/changelog/create";
import { deleteChangelogEntry } from "@/lib/changelog/delete";
import {
  publishChangelogEntry,
  unpublishChangelogEntry,
} from "@/lib/changelog/publish";
import { searchWorkspacePosts } from "@/lib/changelog/queries";
import { updateChangelogEntry } from "@/lib/changelog/update";
import { getWorkspaceMember } from "@/lib/workspaces/queries";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

function isAdminOrOwner(role: string) {
  return role !== WORKSPACE_MEMBER;
}

// ─── Create Entry ─────────────────────────────────────────────────────────────

const createEntrySchema = z.object({
  workspaceId: z.string().min(1),
  title: z
    .string()
    .min(1, "Title is required.")
    .max(200, "Title must be 200 characters or fewer."),
  body: z.string().max(50_000).default(""),
  label: z
    .enum(CHANGELOG_LABEL_VALUES as [string, ...string[]])
    .default("new_feature"),
  postIds: z.array(z.string()).max(20).default([]),
});

export async function createChangelogEntryAction(input: {
  workspaceId: string;
  title: string;
  body?: string;
  label?: string;
  postIds?: string[];
}): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();

  const parsed = createEntrySchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { success: false, error: first?.message ?? "Invalid input." };
  }

  const member = await getWorkspaceMember(
    parsed.data.workspaceId,
    session.user.id
  );
  if (!member || !isAdminOrOwner(member.role)) {
    return {
      success: false,
      error: "Only admins and owners can create changelog entries.",
    };
  }

  try {
    const entry = await createChangelogEntry({
      workspaceId: parsed.data.workspaceId,
      createdBy: session.user.id,
      title: parsed.data.title,
      body: parsed.data.body,
      label: parsed.data.label,
      postIds: parsed.data.postIds,
    });

    audit({
      action: "changelog.created",
      actorId: session.user.id,
      actorEmail: session.user.email,
      description: `Changelog entry created: ${entry.title}`,
      entityType: "changelog_entry",
      entityId: entry.id,
      metadata: { title: entry.title, workspaceId: parsed.data.workspaceId },
    });

    return { success: true, data: { id: entry.id } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create entry.",
    };
  }
}

// ─── Update Entry ─────────────────────────────────────────────────────────────

const updateEntrySchema = z.object({
  entryId: z.string().min(1),
  workspaceId: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  body: z.string().max(50_000).optional(),
  label: z.enum(CHANGELOG_LABEL_VALUES as [string, ...string[]]).optional(),
  postIds: z.array(z.string()).max(20).optional(),
});

export async function updateChangelogEntryAction(input: {
  entryId: string;
  workspaceId: string;
  title?: string;
  body?: string;
  label?: string;
  postIds?: string[];
}): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();

  const parsed = updateEntrySchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { success: false, error: first?.message ?? "Invalid input." };
  }

  const member = await getWorkspaceMember(
    parsed.data.workspaceId,
    session.user.id
  );
  if (!member || !isAdminOrOwner(member.role)) {
    return {
      success: false,
      error: "Only admins and owners can edit changelog entries.",
    };
  }

  try {
    const entry = await updateChangelogEntry(
      parsed.data.entryId,
      parsed.data.workspaceId,
      {
        title: parsed.data.title,
        body: parsed.data.body,
        label: parsed.data.label,
        postIds: parsed.data.postIds,
      }
    );

    audit({
      action: "changelog.updated",
      actorId: session.user.id,
      actorEmail: session.user.email,
      description: `Changelog entry updated: ${entry.title}`,
      entityType: "changelog_entry",
      entityId: entry.id,
      metadata: { title: entry.title, workspaceId: parsed.data.workspaceId },
    });

    return { success: true, data: { id: entry.id } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update entry.",
    };
  }
}

// ─── Publish Entry ────────────────────────────────────────────────────────────

export async function publishChangelogEntryAction(input: {
  entryId: string;
  workspaceId: string;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  const member = await getWorkspaceMember(input.workspaceId, session.user.id);
  if (!member || !isAdminOrOwner(member.role)) {
    return {
      success: false,
      error: "Only admins and owners can publish changelog entries.",
    };
  }

  try {
    await publishChangelogEntry(input.entryId, input.workspaceId);

    audit({
      action: "changelog.published",
      actorId: session.user.id,
      actorEmail: session.user.email,
      description: "Changelog entry published",
      entityType: "changelog_entry",
      entityId: input.entryId,
      metadata: { workspaceId: input.workspaceId },
    });

    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to publish entry.",
    };
  }
}

// ─── Unpublish Entry ──────────────────────────────────────────────────────────

export async function unpublishChangelogEntryAction(input: {
  entryId: string;
  workspaceId: string;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  const member = await getWorkspaceMember(input.workspaceId, session.user.id);
  if (!member || !isAdminOrOwner(member.role)) {
    return {
      success: false,
      error: "Only admins and owners can unpublish changelog entries.",
    };
  }

  try {
    await unpublishChangelogEntry(input.entryId, input.workspaceId);

    audit({
      action: "changelog.unpublished",
      actorId: session.user.id,
      actorEmail: session.user.email,
      description: "Changelog entry unpublished",
      entityType: "changelog_entry",
      entityId: input.entryId,
      metadata: { workspaceId: input.workspaceId },
    });

    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to unpublish entry.",
    };
  }
}

// ─── Delete Entry ─────────────────────────────────────────────────────────────

export async function deleteChangelogEntryAction(input: {
  entryId: string;
  workspaceId: string;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  const member = await getWorkspaceMember(input.workspaceId, session.user.id);
  if (!member || !isAdminOrOwner(member.role)) {
    return {
      success: false,
      error: "Only admins and owners can delete changelog entries.",
    };
  }

  try {
    await deleteChangelogEntry(input.entryId, input.workspaceId);

    audit({
      action: "changelog.deleted",
      actorId: session.user.id,
      actorEmail: session.user.email,
      description: "Changelog entry deleted",
      entityType: "changelog_entry",
      entityId: input.entryId,
      metadata: { workspaceId: input.workspaceId },
    });

    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete entry.",
    };
  }
}

// ─── Search Posts ─────────────────────────────────────────────────────────────

export async function searchPostsForChangelogAction(input: {
  workspaceId: string;
  query: string;
}): Promise<
  ActionResult<
    {
      id: string;
      title: string;
      slug: string;
      status: string;
      upvotes: number;
      boardSlug: string;
      boardName: string;
    }[]
  >
> {
  const session = await requireSession();

  const member = await getWorkspaceMember(input.workspaceId, session.user.id);
  if (!member) {
    return { success: false, error: "Access denied." };
  }

  try {
    const results = await searchWorkspacePosts(input.workspaceId, input.query);
    return { success: true, data: results };
  } catch {
    return { success: false, error: "Failed to search posts." };
  }
}
