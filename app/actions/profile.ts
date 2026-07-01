"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  account,
  comments,
  posts,
  session as sessionTable,
  user,
  votes,
  workspaces,
} from "@/db/schema";
import { audit } from "@/lib/audit";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";

export interface ActionState {
  error?: string;
  success?: string;
}

export async function updateNameAction(
  _state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireSession();
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return { error: "Name is required." };
  }
  if (name.length > 100) {
    return { error: "Name must be 100 characters or fewer." };
  }

  await db
    .update(user)
    .set({ name, updatedAt: new Date() })
    .where(eq(user.id, session.user.id));

  await audit({
    action: "profile.name_updated",
    actorEmail: session.user.email,
    actorId: session.user.id,
    description: "Updated profile name",
    entityId: session.user.id,
    entityType: "user",
    metadata: { name },
  });

  revalidatePath("/", "layout");
  return { success: "Name updated." };
}

export async function changeEmailAction(
  _state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const current = await requireSession();
  const newEmail = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    return { error: "Enter a valid email address." };
  }

  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, newEmail))
    .limit(1);

  if (existing && existing.id !== current.user.id) {
    return { error: "That email is already in use." };
  }

  await db
    .update(user)
    .set({
      email: newEmail,
      emailVerified: false,
      updatedAt: new Date(),
    })
    .where(eq(user.id, current.user.id));

  await audit({
    action: "profile.email_updated",
    actorEmail: current.user.email,
    actorId: current.user.id,
    description: "Updated account email",
    entityId: current.user.id,
    entityType: "user",
    metadata: { newEmail, oldEmail: current.user.email },
  });

  revalidatePath("/", "layout");
  return { success: "Email updated. Use the new email for future sign-ins." };
}

export async function revokeSessionAction(formData: FormData): Promise<void> {
  const current = await requireSession();
  const sessionId = String(formData.get("sessionId") ?? "");

  const [row] = await db
    .select({
      id: sessionTable.id,
      token: sessionTable.token,
      userId: sessionTable.userId,
    })
    .from(sessionTable)
    .where(eq(sessionTable.id, sessionId))
    .limit(1);

  if (!row || row.userId !== current.user.id) {
    return;
  }
  if (row.token === current.session.token) {
    return;
  }

  await db.delete(sessionTable).where(eq(sessionTable.id, sessionId));
  await audit({
    action: "profile.session_revoked",
    actorEmail: current.user.email,
    actorId: current.user.id,
    description: "Revoked an active session",
    entityId: sessionId,
    entityType: "session",
  });

  revalidatePath("/", "layout");
}

export async function signOutOtherSessionsAction(): Promise<void> {
  const current = await requireSession();
  const rows = await db
    .select({ id: sessionTable.id })
    .from(sessionTable)
    .where(
      and(
        eq(sessionTable.userId, current.user.id),
        ne(sessionTable.token, current.session.token)
      )
    );

  const ids = rows.map((row) => row.id);
  if (ids.length > 0) {
    await db.delete(sessionTable).where(inArray(sessionTable.id, ids));
  }

  await audit({
    action: "profile.other_sessions_revoked",
    actorEmail: current.user.email,
    actorId: current.user.id,
    description: `Signed out ${ids.length} other session(s)`,
    entityId: current.user.id,
    entityType: "user",
    metadata: { revokedCount: ids.length },
  });

  revalidatePath("/", "layout");
}

export async function deleteAccountAction(
  _state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const current = await requireSession();
  const confirmEmail = String(formData.get("confirmEmail") ?? "")
    .trim()
    .toLowerCase();

  const [freshUser] = await db
    .select({ email: user.email, id: user.id })
    .from(user)
    .where(eq(user.id, current.user.id))
    .limit(1);

  if (!freshUser) {
    return { error: "Account not found." };
  }

  if (confirmEmail !== freshUser.email.toLowerCase()) {
    return { error: "Type your email address to confirm deletion." };
  }

  // Deleting the account would set owned workspaces' owner_id to NULL and remove
  // the owner's membership, leaving those workspaces orphaned. Require ownership
  // to be transferred (or the workspace deleted) first.
  const ownedWorkspaces = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.ownerId, freshUser.id));

  if (ownedWorkspaces.length > 0) {
    return {
      error:
        "You still own one or more workspaces. Transfer ownership (or delete those workspaces) before deleting your account.",
    };
  }

  await audit({
    action: "profile.account_deleted",
    actorEmail: freshUser.email,
    actorId: freshUser.id,
    description: "Deleted account",
    entityId: freshUser.id,
    entityType: "user",
  });

  await db.transaction(async (tx) => {
    // Anonymise the user's feedback before removing the account (Feature 01):
    // content and vote counts are preserved, but the denormalised authorship PII
    // is scrubbed. The author/voter id columns are FK `set null` on user delete;
    // these updates clear the denormalised name/email text. Must run before the
    // user row is deleted (the WHERE matches on the still-present author/user id).
    await tx
      .update(posts)
      .set({
        authorName: "Anonymous",
        authorEmail: "anonymous@deleted.invalid",
      })
      .where(eq(posts.authorId, freshUser.id));
    await tx
      .update(comments)
      .set({ authorName: null, authorEmail: null, authorAvatar: null })
      .where(eq(comments.authorId, freshUser.id));
    await tx
      .update(votes)
      .set({ userName: null, userEmail: null })
      .where(eq(votes.userId, freshUser.id));

    await tx.delete(sessionTable).where(eq(sessionTable.userId, freshUser.id));
    await tx.delete(account).where(eq(account.userId, freshUser.id));
    await tx.delete(user).where(eq(user.id, freshUser.id));
  });

  redirect("/signin");
}
