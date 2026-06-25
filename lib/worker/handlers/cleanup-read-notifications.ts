import type { Job } from "pg-boss";
import { pruneOldNotifications } from "@/lib/notifications/queries";

export async function handleCleanupReadNotifications(
  jobs: Job<Record<string, never>>[]
) {
  const count = await pruneOldNotifications(90);
  console.log(`[cleanup-read-notifications] pruned ${count} old notifications`);
}
