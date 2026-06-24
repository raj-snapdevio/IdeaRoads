import { randomBytes, randomUUID } from "node:crypto";
import { createId } from "@paralleldrive/cuid2";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { INVITE_EXPIRY_DAYS } from "@/config/platform";
import {
  emailOutbox,
  workspaceInvites,
  workspaceMembers,
  workspaces,
} from "@/db/schema";
import { user } from "@/db/schema/auth";
import { db } from "@/lib/db";
import { inviteTemplate } from "@/lib/email/templates/invite";
import { enqueueJob } from "@/lib/worker/enqueue";
import { JOB_NAMES } from "@/lib/worker/job-types";

export interface CreateInviteInput {
  workspaceId: string;
  workspaceName: string;
  invitedById: string;
  inviterName: string;
  inviterEmail: string;
  email: string;
  role: "member" | "admin";
  appUrl: string;
}

export async function createInvite(
  input: CreateInviteInput
): Promise<{ inviteId: string }> {
  const token = randomBytes(32).toString("base64url");
  const inviteId = createId();
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 864e5);
  const inviteUrl = `${input.appUrl}/invite/${token}`;

  const { html, text } = await inviteTemplate({
    inviterName: input.inviterName,
    workspaceName: input.workspaceName,
    role: input.role,
    inviteUrl,
  });

  const subject = `${input.inviterName} invited you to join ${input.workspaceName}`;

  let outboxId!: string;

  await db.transaction(async (tx) => {
    await tx.insert(workspaceInvites).values({
      id: inviteId,
      workspaceId: input.workspaceId,
      invitedById: input.invitedById,
      email: input.email,
      role: input.role,
      token,
      expiresAt,
    });

    const [outboxRow] = await tx
      .insert(emailOutbox)
      .values({
        idempotencyKey: randomUUID(),
        payload: { to: input.email, subject, html, text },
        status: "queued",
      })
      .returning({ id: emailOutbox.id });

    outboxId = outboxRow.id;
  });

  await enqueueJob(JOB_NAMES.EMAIL_SEND, { outboxId });

  return { inviteId };
}

export async function checkDuplicateInvite(
  workspaceId: string,
  email: string
): Promise<boolean> {
  const now = new Date();
  const [row] = await db
    .select({ id: workspaceInvites.id })
    .from(workspaceInvites)
    .where(
      and(
        eq(workspaceInvites.workspaceId, workspaceId),
        eq(sql`lower(${workspaceInvites.email})`, email.toLowerCase()),
        isNull(workspaceInvites.acceptedAt),
        isNull(workspaceInvites.revokedAt),
        gt(workspaceInvites.expiresAt, now)
      )
    )
    .limit(1);
  return !!row;
}

export async function getInviteByToken(token: string) {
  const [row] = await db
    .select({
      id: workspaceInvites.id,
      workspaceId: workspaceInvites.workspaceId,
      email: workspaceInvites.email,
      role: workspaceInvites.role,
      expiresAt: workspaceInvites.expiresAt,
      acceptedAt: workspaceInvites.acceptedAt,
      revokedAt: workspaceInvites.revokedAt,
      workspace: {
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        isSuspended: workspaces.isSuspended,
      },
      inviter: {
        name: user.name,
        email: user.email,
      },
    })
    .from(workspaceInvites)
    .innerJoin(workspaces, eq(workspaceInvites.workspaceId, workspaces.id))
    .leftJoin(user, eq(workspaceInvites.invitedById, user.id))
    .where(eq(workspaceInvites.token, token))
    .limit(1);
  return row ?? null;
}

export async function getInviteById(inviteId: string, workspaceId: string) {
  const [row] = await db
    .select()
    .from(workspaceInvites)
    .where(
      and(
        eq(workspaceInvites.id, inviteId),
        eq(workspaceInvites.workspaceId, workspaceId)
      )
    )
    .limit(1);
  return row ?? null;
}

export type AcceptInviteResult =
  | { ok: true; workspaceSlug: string }
  | {
      ok: false;
      code:
        | "not_found"
        | "expired"
        | "revoked"
        | "already_accepted"
        | "mismatch"
        | "already_member"
        | "workspace_suspended";
    };

export async function acceptInvite(input: {
  token: string;
  userId: string;
  userEmail: string;
}): Promise<AcceptInviteResult> {
  return db.transaction(async (tx) => {
    const [invite] = await tx
      .select()
      .from(workspaceInvites)
      .where(eq(workspaceInvites.token, input.token))
      .for("update")
      .limit(1);

    if (!invite) return { ok: false, code: "not_found" };
    if (invite.acceptedAt) return { ok: false, code: "already_accepted" };
    if (invite.revokedAt) return { ok: false, code: "revoked" };
    if (invite.expiresAt <= new Date()) return { ok: false, code: "expired" };

    const [workspace] = await tx
      .select({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        isSuspended: workspaces.isSuspended,
      })
      .from(workspaces)
      .where(eq(workspaces.id, invite.workspaceId))
      .limit(1);

    if (!workspace || workspace.isSuspended) {
      return { ok: false, code: "workspace_suspended" };
    }

    if (invite.email.toLowerCase() !== input.userEmail.toLowerCase()) {
      return { ok: false, code: "mismatch" };
    }

    const [existingMember] = await tx
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, invite.workspaceId),
          eq(workspaceMembers.userId, input.userId)
        )
      )
      .limit(1);

    if (existingMember) return { ok: false, code: "already_member" };

    await tx.insert(workspaceMembers).values({
      workspaceId: invite.workspaceId,
      userId: input.userId,
      role: invite.role,
    });

    await tx
      .update(workspaceInvites)
      .set({ acceptedAt: new Date() })
      .where(eq(workspaceInvites.id, invite.id));

    return { ok: true, workspaceSlug: workspace.slug };
  });
}

export async function revokeInvite(input: {
  inviteId: string;
  revokedById: string;
}): Promise<void> {
  await db
    .update(workspaceInvites)
    .set({ revokedAt: new Date(), revokedById: input.revokedById })
    .where(eq(workspaceInvites.id, input.inviteId));
}

export async function listPendingInvites(workspaceId: string) {
  const now = new Date();
  return db
    .select({
      id: workspaceInvites.id,
      email: workspaceInvites.email,
      role: workspaceInvites.role,
      expiresAt: workspaceInvites.expiresAt,
      createdAt: workspaceInvites.createdAt,
    })
    .from(workspaceInvites)
    .where(
      and(
        eq(workspaceInvites.workspaceId, workspaceId),
        isNull(workspaceInvites.acceptedAt),
        isNull(workspaceInvites.revokedAt),
        gt(workspaceInvites.expiresAt, now)
      )
    )
    .orderBy(workspaceInvites.createdAt);
}
