export const JOB_NAMES = {
  EMAIL_EVENTS_PRUNE: "email.events-prune",
  EMAIL_OUTBOX_REAP: "email.outbox-reap",
  EMAIL_SEND: "email.send",
  SCAFFOLD_HEALTHCHECK: "scaffold.healthcheck",
  SEND_CHANGELOG_EMAIL: "changelog.send-email",
  SEND_STATUS_CHANGE_EMAIL: "notifications.send-status-change-email",
  SEND_NEW_POST_ALERT: "notifications.send-new-post-alert",
  CLEANUP_READ_NOTIFICATIONS: "notifications.cleanup-read",
  DELIVER_OUTBOUND_WEBHOOK: "webhooks.deliver",
  CLEANUP_WEBHOOK_DELIVERIES: "webhooks.cleanup-deliveries",
} as const;

export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];

export interface EmailSendPayload {
  outboxId: string;
}

export interface SendChangelogEmailPayload {
  voterEmail: string;
  voterName: string;
  voterUserId: string | null;
  entryId: string;
  entryTitle: string;
  entryLabel: string;
  workspaceId: string;
}

export interface SendStatusChangeEmailPayload {
  postId: string;
  postTitle: string;
  postSlug: string;
  workspaceId: string;
  workspaceSlug: string;
  workspaceName: string;
  boardSlug: string;
  fromStatus: string;
  toStatus: string;
  voterEmail: string;
  voterName: string;
  voterUserId: string | null;
  changedById: string;
}

export interface SendNewPostAlertPayload {
  postId: string;
  postTitle: string;
  postBody: string | null;
  postSlug: string;
  workspaceId: string;
  workspaceSlug: string;
  workspaceName: string;
  boardName: string;
  boardSlug: string;
  authorName: string;
  adminEmail: string;
  adminUserId: string;
  authorId: string;
}

export interface DeliverOutboundWebhookPayload {
  deliveryId: string;
}

export type JobPayloads = {
  [JOB_NAMES.EMAIL_EVENTS_PRUNE]: Record<string, never>;
  [JOB_NAMES.EMAIL_OUTBOX_REAP]: Record<string, never>;
  [JOB_NAMES.EMAIL_SEND]: EmailSendPayload;
  [JOB_NAMES.SCAFFOLD_HEALTHCHECK]: Record<string, never>;
  [JOB_NAMES.SEND_CHANGELOG_EMAIL]: SendChangelogEmailPayload;
  [JOB_NAMES.SEND_STATUS_CHANGE_EMAIL]: SendStatusChangeEmailPayload;
  [JOB_NAMES.SEND_NEW_POST_ALERT]: SendNewPostAlertPayload;
  [JOB_NAMES.CLEANUP_READ_NOTIFICATIONS]: Record<string, never>;
  [JOB_NAMES.DELIVER_OUTBOUND_WEBHOOK]: DeliverOutboundWebhookPayload;
  [JOB_NAMES.CLEANUP_WEBHOOK_DELIVERIES]: Record<string, never>;
};
