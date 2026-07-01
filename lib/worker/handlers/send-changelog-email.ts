import { eq } from "drizzle-orm";
import type { Job } from "pg-boss";
import { changelogEntries, workspaces } from "@/db/schema";
import { truncateMarkdownToText } from "@/lib/changelog/markdown";
import { db } from "@/lib/db";
import { enqueueEmail } from "@/lib/email/index";
import { changelogEmailTemplate } from "@/lib/email/templates/changelog";
import { buildUnsubscribeUrl } from "@/lib/email/unsubscribe";
import { env } from "@/lib/env";
import { createNotification } from "@/lib/notifications/create";
import { isEmailNotificationEnabled } from "@/lib/notifications/queries";
import type { SendChangelogEmailPayload } from "@/lib/worker/job-types";

export async function handleSendChangelogEmail(
  jobs: Job<SendChangelogEmailPayload>[]
) {
  for (const job of jobs) {
    await processSendChangelogEmail(job);
  }
}

async function processSendChangelogEmail(job: Job<SendChangelogEmailPayload>) {
  const {
    voterEmail,
    voterName,
    voterUserId,
    entryId,
    entryTitle,
    entryLabel,
    workspaceId,
  } = job.data;

  const [workspace] = await db
    .select({ slug: workspaces.slug, name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  if (!workspace) {
    console.warn("[send-changelog-email] workspace not found, skipping", {
      workspaceId,
    });
    return;
  }

  const [entry] = await db
    .select({ body: changelogEntries.body })
    .from(changelogEntries)
    .where(eq(changelogEntries.id, entryId))
    .limit(1);

  if (!entry) {
    console.warn("[send-changelog-email] entry not found, skipping", {
      entryId,
    });
    return;
  }

  const bodyPreview = truncateMarkdownToText(entry.body, 300);

  // Honour the voter's email-notification preference / unsubscribe choice
  // (opt-out model: no row = enabled). Guests with no account always receive it.
  const emailEnabled = voterUserId
    ? await isEmailNotificationEnabled(voterUserId, "emailChangelog")
    : true;

  if (emailEnabled) {
    const { subject, html, text } = changelogEmailTemplate({
      voterName,
      voterEmail,
      entryTitle,
      entryLabel,
      entryId,
      workspaceSlug: workspace.slug,
      workspaceName: workspace.name,
      bodyPreview,
      unsubscribeUrl: voterUserId ? buildUnsubscribeUrl(voterUserId) : null,
    });

    await enqueueEmail({ to: voterEmail, subject, html, text });
  }

  // In-app notification for signed-in voters
  if (voterUserId) {
    await createNotification({
      userId: voterUserId,
      workspaceId,
      type: "changelog_published",
      title: `New update: "${entryTitle}"`,
      link: `${env.NEXT_PUBLIC_APP_URL}/${workspace.slug}/changelog/${entryId}`,
    });
  }
}
