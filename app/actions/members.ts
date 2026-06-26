"use server";

import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  INVITE_LINK_LABEL_MAX,
  WORKSPACE_ADMIN,
  WORKSPACE_MEMBER,
  WORKSPACE_OWNER,
} from "@/config/platform";
import { workspaceMembers, workspaces } from "@/db/schema";
import { user } from "@/db/schema/auth";
import { audit } from "@/lib/audit";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import {
  createInviteLink,
  getInviteLinkById,
  joinViaLink,
  listActiveInviteLinks,
  revokeInviteLink,
} from "@/lib/workspaces/invite-links";
import {
  acceptInvite,
  checkDuplicateInvite,
  createInvite,
  getInviteById,
  listPendingInvites,
  revokeInvite,
} from "@/lib/workspaces/invites";
import {
  changeRole,
  getMember,
  getMemberCount,
  getOwnerCount,
  leaveWorkspace,
  listMembers,
  removeMember,
  transferOwnership,
} from "@/lib/workspaces/members";
import { getWorkspaceMember } from "@/lib/workspaces/queries";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string; field?: string; code?: string };

// ─── Invite Members ──────────────────────────────────────────────────────────

const inviteSchema = z.object({
  workspaceId: z.string().min(1),
  email: z.string().email("Invalid email address."),
  role: z.enum(["member", "admin"]),
});

export async function inviteMemberAction(input: {
  workspaceId: string;
  email: string;
  role: "member" | "admin";
}): Promise<ActionResult<{ inviteId: string }>> {
  const session = await requireSession();

  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      success: false,
      error: first?.message ?? "Invalid input.",
      field: first?.path[0] as string | undefined,
    };
  }

  const { workspaceId, role } = parsed.data;
  const email = parsed.data.email.toLowerCase().trim();

  const actorMember = await getWorkspaceMember(workspaceId, session.user.id);
  if (!actorMember) {
    return { success: false, error: "You are not a member of this workspace." };
  }

  if (actorMember.role === WORKSPACE_MEMBER) {
    return {
      success: false,
      error: "You don't have permission to invite members.",
    };
  }
  if (actorMember.role === WORKSPACE_ADMIN && role === "admin") {
    return {
      success: false,
      error: "Admins can only invite members, not other admins.",
      field: "role",
    };
  }

  const [alreadyMember] = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .innerJoin(user, eq(workspaceMembers.userId, user.id))
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(sql`lower(${user.email})`, email)
      )
    )
    .limit(1);

  if (alreadyMember) {
    return {
      success: false,
      error: "This person is already a member of this workspace.",
      field: "email",
    };
  }

  const hasDuplicate = await checkDuplicateInvite(workspaceId, email);
  if (hasDuplicate) {
    return {
      success: false,
      error:
        "A pending invite already exists for this email. Revoke it to resend.",
      field: "email",
    };
  }

  const [workspace] = await db
    .select({ name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  if (!workspace) {
    return { success: false, error: "Workspace not found." };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { inviteId } = await createInvite({
    workspaceId,
    workspaceName: workspace.name,
    invitedById: session.user.id,
    inviterName: session.user.name ?? session.user.email,
    inviterEmail: session.user.email,
    email,
    role,
    appUrl,
  });

  audit({
    action: "member.invited",
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: "workspace",
    entityId: workspaceId,
    description: `${session.user.email} invited ${email} to ${workspace.name} as ${role}`,
    metadata: {
      inviteId,
      inviteeEmail: email,
      role,
      workspaceName: workspace.name,
    },
  });

  return { success: true, data: { inviteId } };
}

// ─── Accept Email Invite ──────────────────────────────────────────────────────

export async function acceptInviteAction(
  token: string
): Promise<ActionResult<{ slug: string }>> {
  const session = await requireSession();

  const result = await acceptInvite({
    token,
    userId: session.user.id,
    userEmail: session.user.email,
  });

  if (!result.ok) {
    const messages: Record<string, string> = {
      not_found: "This invitation does not exist.",
      expired: "This invitation has expired.",
      revoked: "This invitation has been revoked.",
      already_accepted: "This invitation has already been used.",
      mismatch: "This invitation was sent to a different email address.",
      already_member: "You are already a member of this workspace.",
      workspace_suspended: "This workspace is currently suspended.",
    };
    return {
      success: false,
      error: messages[result.code] ?? "Could not accept invitation.",
      code: result.code,
    };
  }

  audit({
    action: "member.joined",
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: "workspace",
    entityId: result.workspaceSlug,
    description: `${session.user.email} joined via invite`,
    metadata: { workspaceSlug: result.workspaceSlug },
  });

  return { success: true, data: { slug: result.workspaceSlug } };
}

// ─── Join via Shareable Link ──────────────────────────────────────────────────

export async function joinViaLinkAction(
  token: string
): Promise<ActionResult<{ slug: string }>> {
  const session = await requireSession();

  const result = await joinViaLink({ token, userId: session.user.id });

  if (!result.ok) {
    const messages: Record<string, string> = {
      not_found: "This invite link does not exist.",
      inactive: "This invite link has been deactivated.",
      expired: "This invite link has expired.",
      max_uses_reached: "This invite link is no longer available.",
      already_member: "You are already a member of this workspace.",
    };
    return {
      success: false,
      error: messages[result.code] ?? "Could not join workspace.",
      code: result.code,
      ...(result.code === "already_member" && result.workspaceSlug
        ? { field: result.workspaceSlug }
        : {}),
    };
  }

  audit({
    action: "member.joined_via_link",
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: "workspace",
    entityId: result.workspaceSlug,
    description: `${session.user.email} joined via invite link`,
    metadata: { workspaceSlug: result.workspaceSlug },
  });

  return { success: true, data: { slug: result.workspaceSlug } };
}

// ─── Revoke Email Invite ──────────────────────────────────────────────────────

export async function revokeInviteAction(input: {
  inviteId: string;
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
  if (actorMember.role === WORKSPACE_MEMBER) {
    return {
      success: false,
      error: "You don't have permission to revoke invites.",
    };
  }

  const invite = await getInviteById(input.inviteId, input.workspaceId);
  if (!invite) {
    return { success: false, error: "Invite not found." };
  }
  if (invite.acceptedAt) {
    return { success: false, error: "Cannot revoke an accepted invitation." };
  }
  if (invite.revokedAt) {
    return { success: true, data: undefined };
  }
  if (actorMember.role === WORKSPACE_ADMIN && invite.role === "admin") {
    return {
      success: false,
      error: "Admins cannot revoke admin-level invitations.",
    };
  }

  await revokeInvite({
    inviteId: input.inviteId,
    revokedById: session.user.id,
  });

  audit({
    action: "invite.revoked",
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: "workspace",
    entityId: input.workspaceId,
    description: `${session.user.email} revoked invite for ${invite.email}`,
    metadata: { inviteId: input.inviteId, inviteeEmail: invite.email },
  });

  return { success: true, data: undefined };
}

// ─── Create Shareable Invite Link ─────────────────────────────────────────────

const createLinkSchema = z.object({
  workspaceId: z.string().min(1),
  role: z.enum(["member", "admin"]),
  label: z.string().max(INVITE_LINK_LABEL_MAX).optional(),
  maxUses: z.number().int().positive().optional(),
  expiresInDays: z.number().int().positive().max(365).optional(),
});

export async function createInviteLinkAction(input: {
  workspaceId: string;
  role: "member" | "admin";
  label?: string;
  maxUses?: number;
  expiresInDays?: number;
}): Promise<ActionResult<{ linkId: string; token: string }>> {
  const session = await requireSession();

  const parsed = createLinkSchema.safeParse(input);
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
  if (actorMember.role === WORKSPACE_MEMBER) {
    return {
      success: false,
      error: "You don't have permission to create invite links.",
    };
  }

  const expiresAt = parsed.data.expiresInDays
    ? new Date(Date.now() + parsed.data.expiresInDays * 864e5)
    : undefined;

  const { linkId, token } = await createInviteLink({
    workspaceId: parsed.data.workspaceId,
    createdById: session.user.id,
    role: parsed.data.role,
    label: parsed.data.label,
    maxUses: parsed.data.maxUses,
    expiresAt,
  });

  audit({
    action: "invite_link.created",
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: "workspace",
    entityId: parsed.data.workspaceId,
    description: `${session.user.email} created an invite link`,
    metadata: {
      linkId,
      role: parsed.data.role,
      label: parsed.data.label,
      maxUses: parsed.data.maxUses,
    },
  });

  return { success: true, data: { linkId, token } };
}

// ─── Revoke Invite Link ───────────────────────────────────────────────────────

export async function revokeInviteLinkAction(input: {
  linkId: string;
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
  if (actorMember.role === WORKSPACE_MEMBER) {
    return {
      success: false,
      error: "You don't have permission to manage invite links.",
    };
  }

  const link = await getInviteLinkById(input.linkId, input.workspaceId);
  if (!link) {
    return { success: false, error: "Invite link not found." };
  }
  if (!link.isActive) {
    return { success: true, data: undefined };
  }

  await revokeInviteLink(input.linkId);

  audit({
    action: "invite_link.revoked",
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: "workspace",
    entityId: input.workspaceId,
    description: `${session.user.email} deactivated invite link`,
    metadata: {
      linkId: input.linkId,
      label: link.label,
      useCount: link.useCount,
    },
  });

  return { success: true, data: undefined };
}

// ─── Remove Member ────────────────────────────────────────────────────────────

export async function removeMemberAction(input: {
  memberId: string;
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
  if (actorMember.role === WORKSPACE_MEMBER) {
    return {
      success: false,
      error: "You don't have permission to remove members.",
    };
  }

  const target = await getMember(input.memberId, input.workspaceId);
  if (!target) {
    return { success: false, error: "Member not found." };
  }
  if (target.role === WORKSPACE_OWNER) {
    return { success: false, error: "Cannot remove the workspace owner." };
  }
  if (target.userId === session.user.id) {
    return {
      success: false,
      error: "Use leave workspace to remove yourself.",
    };
  }
  if (actorMember.role === WORKSPACE_ADMIN && target.role === WORKSPACE_ADMIN) {
    return { success: false, error: "Admins cannot remove other admins." };
  }

  await removeMember(input.memberId);

  audit({
    action: "member.removed",
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: "workspace",
    entityId: input.workspaceId,
    description: `${session.user.email} removed a member`,
    metadata: { removedMemberId: input.memberId, removedRole: target.role },
  });

  return { success: true, data: undefined };
}

// ─── Change Role ──────────────────────────────────────────────────────────────

export async function changeRoleAction(input: {
  memberId: string;
  workspaceId: string;
  role: "member" | "admin";
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  const actorMember = await getWorkspaceMember(
    input.workspaceId,
    session.user.id
  );
  if (!actorMember || actorMember.role !== WORKSPACE_OWNER) {
    return {
      success: false,
      error: "Only the workspace owner can change member roles.",
    };
  }

  const target = await getMember(input.memberId, input.workspaceId);
  if (!target) {
    return { success: false, error: "Member not found." };
  }
  if (target.role === WORKSPACE_OWNER) {
    return {
      success: false,
      error: "Use transfer ownership to change the owner's role.",
    };
  }
  if (target.role === input.role) {
    return { success: true, data: undefined };
  }

  await changeRole({ memberId: input.memberId, role: input.role });

  const auditAction =
    target.role === WORKSPACE_MEMBER && input.role === "admin"
      ? "member.promoted"
      : "member.demoted";

  audit({
    action: auditAction,
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: "workspace",
    entityId: input.workspaceId,
    description: `${session.user.email} changed role: ${target.role} → ${input.role}`,
    metadata: {
      targetMemberId: input.memberId,
      fromRole: target.role,
      toRole: input.role,
    },
  });

  return { success: true, data: undefined };
}

// ─── Transfer Ownership ───────────────────────────────────────────────────────

export async function transferOwnershipAction(input: {
  targetMemberId: string;
  workspaceId: string;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  const actorMember = await getWorkspaceMember(
    input.workspaceId,
    session.user.id
  );
  if (!actorMember || actorMember.role !== WORKSPACE_OWNER) {
    return {
      success: false,
      error: "Only the workspace owner can transfer ownership.",
    };
  }

  const target = await getMember(input.targetMemberId, input.workspaceId);
  if (!target) {
    return {
      success: false,
      error: "Target is not a member of this workspace.",
    };
  }
  if (target.role === WORKSPACE_OWNER) {
    return { success: false, error: "Target is already the owner." };
  }
  if (target.userId === session.user.id) {
    return { success: false, error: "You are already the owner." };
  }

  await transferOwnership({
    workspaceId: input.workspaceId,
    actorMemberId: actorMember.id,
    targetMemberId: input.targetMemberId,
    targetUserId: target.userId,
  });

  audit({
    action: "ownership.transferred",
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: "workspace",
    entityId: input.workspaceId,
    description: `Ownership transferred to member ${input.targetMemberId}`,
    metadata: {
      previousOwnerId: session.user.id,
      newOwnerMemberId: input.targetMemberId,
    },
  });

  return { success: true, data: undefined };
}

// ─── Leave Workspace ──────────────────────────────────────────────────────────

export async function leaveWorkspaceAction(input: {
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

  if (actorMember.role === WORKSPACE_OWNER) {
    const ownerCount = await getOwnerCount(input.workspaceId);
    if (ownerCount <= 1) {
      return {
        success: false,
        error: "Transfer ownership before leaving this workspace.",
      };
    }
  }

  const memberCount = await getMemberCount(input.workspaceId);
  if (memberCount <= 1) {
    return {
      success: false,
      error: "You are the only member. Delete the workspace to leave.",
    };
  }

  await leaveWorkspace({
    workspaceId: input.workspaceId,
    userId: session.user.id,
  });

  audit({
    action: "member.left",
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: "workspace",
    entityId: input.workspaceId,
    description: `${session.user.email} left the workspace`,
    metadata: { role: actorMember.role },
  });

  return { success: true, data: undefined };
}

// ─── Re-exported queries for pages ───────────────────────────────────────────

export { listActiveInviteLinks, listMembers, listPendingInvites };
