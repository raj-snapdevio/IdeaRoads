"use server";

import { requireSession } from "@/lib/authz";
import {
  getNotificationPreferences,
  upsertNotificationPreferences,
} from "@/lib/notifications/queries";
import type { NotificationPreferencesRow } from "@/lib/notifications/queries";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function getNotificationPreferencesAction(): Promise<
  ActionResult<NotificationPreferencesRow>
> {
  const session = await requireSession();

  const prefs = await getNotificationPreferences(session.user.id);
  const defaults: NotificationPreferencesRow = {
    userId: session.user.id,
    emailStatusChange: true,
    emailNewComment: true,
    emailChangelog: true,
    inAppStatusChange: true,
    inAppNewComment: true,
    inAppChangelog: true,
    updatedAt: new Date(),
  };

  return { success: true, data: prefs ?? defaults };
}

export async function updateNotificationPreferencesAction(input: {
  emailStatusChange?: boolean;
  emailNewComment?: boolean;
  emailChangelog?: boolean;
  inAppStatusChange?: boolean;
  inAppNewComment?: boolean;
  inAppChangelog?: boolean;
}): Promise<ActionResult<NotificationPreferencesRow>> {
  const session = await requireSession();

  try {
    const updated = await upsertNotificationPreferences(session.user.id, input);
    return { success: true, data: updated };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to update preferences.",
    };
  }
}
