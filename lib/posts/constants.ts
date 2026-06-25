export type PostStatus =
  | "open"
  | "under_review"
  | "planned"
  | "in_progress"
  | "completed"
  | "closed";

export const POST_STATUSES: PostStatus[] = [
  "open",
  "under_review",
  "planned",
  "in_progress",
  "completed",
  "closed",
];
