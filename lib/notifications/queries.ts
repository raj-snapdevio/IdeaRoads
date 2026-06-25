import { and, count, desc, eq, lt } from "drizzle-orm";
import {
  notificationPreferences,
  notifications,
} from "@/db/schema/notifications";
import { db } from "@/lib/db";

export type NotificationRow = typeof notifications.$inferSelect;
export type NotificationPreferencesRow =
  typeof notificationPreferences.$inferSelect;

// ─── Unread Count ─────────────────────────────────────────────────────────────

export async function getUnreadCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    );
  return row?.value ?? 0;
}

// ─── List Notifications ───────────────────────────────────────────────────────

export async function listNotifications(
  userId: string,
  opts: { page?: number; limit?: number } = {}
): Promise<{ items: NotificationRow[]; total: number; hasMore: boolean }> {
  const { page = 1, limit = 30 } = opts;
  const offset = (page - 1) * limit;

  const [items, [{ value: total }]] = await Promise.all([
    db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ value: count() })
      .from(notifications)
      .where(eq(notifications.userId, userId)),
  ]);

  return {
    items,
    total: Number(total),
    hasMore: offset + items.length < Number(total),
  };
}

// ─── Mark Single As Read ──────────────────────────────────────────────────────

export async function markNotificationAsRead(
  notificationId: string,
  userId: string
): Promise<void> {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId)
      )
    );
}

// ─── Mark All As Read ─────────────────────────────────────────────────────────

export async function markAllNotificationsAsRead(
  userId: string,
  workspaceId?: string
): Promise<number> {
  const conditions = [
    eq(notifications.userId, userId),
    eq(notifications.isRead, false),
  ];
  if (workspaceId) {
    conditions.push(eq(notifications.workspaceId, workspaceId));
  }

  const result = await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(...conditions))
    .returning({ id: notifications.id });

  return result.length;
}

// ─── Preferences ──────────────────────────────────────────────────────────────

export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferencesRow | null> {
  const [row] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);
  return row ?? null;
}

export async function upsertNotificationPreferences(
  userId: string,
  prefs: Partial<Omit<NotificationPreferencesRow, "userId" | "updatedAt">>
): Promise<NotificationPreferencesRow> {
  const [row] = await db
    .insert(notificationPreferences)
    .values({ userId, ...prefs })
    .onConflictDoUpdate({
      target: notificationPreferences.userId,
      set: { ...prefs, updatedAt: new Date() },
    })
    .returning();
  return row!;
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

export async function pruneOldNotifications(
  olderThanDays = 90
): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  const result = await db
    .delete(notifications)
    .where(
      and(eq(notifications.isRead, true), lt(notifications.createdAt, cutoff))
    )
    .returning({ id: notifications.id });
  return result.length;
}
