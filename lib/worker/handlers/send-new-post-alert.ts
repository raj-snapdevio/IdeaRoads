import type { Job } from "pg-boss";
import { enqueueEmail } from "@/lib/email/index";
import { newPostAlertEmailTemplate } from "@/lib/email/templates/new-post-alert";
import { env } from "@/lib/env";
import { createNotification } from "@/lib/notifications/create";
import type { SendNewPostAlertPayload } from "@/lib/worker/job-types";

export async function handleSendNewPostAlert(
  jobs: Job<SendNewPostAlertPayload>[]
) {
  for (const job of jobs) {
    await processSendNewPostAlert(job);
  }
}

async function processSendNewPostAlert(job: Job<SendNewPostAlertPayload>) {
  const {
    postTitle,
    postBody,
    postSlug,
    workspaceId,
    workspaceSlug,
    workspaceName,
    boardName,
    boardSlug,
    authorName,
    authorId,
    adminEmail,
    adminUserId,
  } = job.data;

  // Self-notification suppression: don't alert the admin who authored the post
  if (authorId === adminUserId) {
    return;
  }

  const postUrl = `${env.NEXT_PUBLIC_APP_URL}/${workspaceSlug}/b/${boardSlug}/p/${postSlug}`;

  const { subject, html, text } = newPostAlertEmailTemplate({
    adminName: "there",
    authorName: authorName || "Someone",
    postTitle,
    postBody,
    postUrl,
    boardName,
    workspaceName,
  });

  await enqueueEmail({ to: adminEmail, subject, html, text });

  // In-app notification for admin
  await createNotification({
    userId: adminUserId,
    workspaceId,
    type: "new_post",
    title: `New post: "${postTitle}"`,
    body: `Submitted by ${authorName || "a user"} on ${boardName}`,
    link: `/${workspaceSlug}/b/${boardSlug}/p/${postSlug}`,
  });
}
