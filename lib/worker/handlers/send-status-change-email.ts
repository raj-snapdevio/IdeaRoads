import { eq } from "drizzle-orm";
import type { Job } from "pg-boss";
import { notificationPreferences } from "@/db/schema/notifications";
import { workspaces } from "@/db/schema";
import { db } from "@/lib/db";
import { enqueueEmail } from "@/lib/email/index";
import { statusChangeEmailTemplate } from "@/lib/email/templates/status-change";
import { createNotification } from "@/lib/notifications/create";
import { env } from "@/lib/env";
import type { SendStatusChangeEmailPayload } from "@/lib/worker/job-types";

export async function handleSendStatusChangeEmail(
  jobs: Job<SendStatusChangeEmailPayload>[]
) {
  for (const job of jobs) {
    await processSendStatusChangeEmail(job);
  }
}

async function processSendStatusChangeEmail(
  job: Job<SendStatusChangeEmailPayload>
) {
  const {
    postId,
    postTitle,
    postSlug,
    workspaceId,
    workspaceSlug,
    workspaceName,
    boardSlug,
    fromStatus,
    toStatus,
    voterEmail,
    voterName,
    voterUserId,
    changedById,
  } = job.data;

  // Self-notification suppression
  if (voterUserId && voterUserId === changedById) return;

  const postUrl = `${env.NEXT_PUBLIC_APP_URL}/${workspaceSlug}/b/${boardSlug}/p/${postSlug}`;

  // Check email preference (opt-out model: no row = enabled)
  if (voterEmail) {
    const [prefs] = voterUserId
      ? await db
          .select({
            emailStatusChange: notificationPreferences.emailStatusChange,
          })
          .from(notificationPreferences)
          .where(eq(notificationPreferences.userId, voterUserId))
          .limit(1)
      : [];

    const emailEnabled = prefs?.emailStatusChange !== false;

    if (emailEnabled) {
      const { subject, html, text } = statusChangeEmailTemplate({
        recipientName: voterName || "there",
        recipientEmail: voterEmail,
        postTitle,
        postUrl,
        fromStatus,
        toStatus,
        workspaceName,
      });

      await enqueueEmail({ to: voterEmail, subject, html, text });
    }
  }

  // Create in-app notification (signed-in voters only)
  if (voterUserId) {
    const [prefs] = await db
      .select({ inAppStatusChange: notificationPreferences.inAppStatusChange })
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, voterUserId))
      .limit(1);

    const inAppEnabled = prefs?.inAppStatusChange !== false;

    if (inAppEnabled) {
      const statusLabel = toStatus.replace(/_/g, " ");
      await createNotification({
        userId: voterUserId,
        workspaceId,
        type: "status_change",
        title: `"${postTitle}" is now ${statusLabel}`,
        link: `/${workspaceSlug}/b/${boardSlug}/p/${postSlug}`,
      });
    }
  }
}
