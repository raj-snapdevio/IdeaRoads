import type { Job } from "pg-boss";
import { pruneOldDeliveries } from "@/lib/webhooks/queries";

export async function handleCleanupWebhookDeliveries(
  jobs: Job<Record<string, never>>[]
): Promise<void> {
  for (const _job of jobs) {
    const count = await pruneOldDeliveries(30);
    console.log(`[webhooks] pruned ${count} old delivery records`);
  }
}
