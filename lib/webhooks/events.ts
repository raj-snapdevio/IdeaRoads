export const WEBHOOK_EVENTS = {
  POST_CREATED: "post.created",
  POST_STATUS_CHANGED: "post.status_changed",
  POST_MERGED: "post.merged",
  POST_DELETED: "post.deleted",
  COMMENT_CREATED: "comment.created",
  VOTE_CAST: "vote.cast",
  MEMBER_JOINED: "member.joined",
  MEMBER_REMOVED: "member.removed",
  CHANGELOG_PUBLISHED: "changelog.published",
} as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[keyof typeof WEBHOOK_EVENTS];

export const WEBHOOK_EVENT_LABELS: Record<WebhookEvent, string> = {
  "post.created": "Post created",
  "post.status_changed": "Post status changed",
  "post.merged": "Post merged",
  "post.deleted": "Post deleted",
  "comment.created": "Comment created",
  "vote.cast": "Vote cast",
  "member.joined": "Member joined",
  "member.removed": "Member removed",
  "changelog.published": "Changelog published",
};

export const ALL_WEBHOOK_EVENTS = Object.values(
  WEBHOOK_EVENTS
) as WebhookEvent[];
