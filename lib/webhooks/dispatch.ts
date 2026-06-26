import { and, eq, sql } from "drizzle-orm";
import { outboundWebhookEndpoints } from "@/db/schema";
import { db } from "@/lib/db";
import { createDelivery } from "@/lib/webhooks/queries";
import { enqueueJob } from "@/lib/worker/enqueue";
import { JOB_NAMES } from "@/lib/worker/job-types";

export async function dispatchWebhookEvent(
  workspaceId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    // Find all enabled endpoints subscribed to this event
    const endpoints = await db
      .select()
      .from(outboundWebhookEndpoints)
      .where(
        and(
          eq(outboundWebhookEndpoints.workspaceId, workspaceId),
          eq(outboundWebhookEndpoints.isEnabled, true),
          sql`${event} = ANY(${outboundWebhookEndpoints.events})`
        )
      );

    for (const endpoint of endpoints) {
      const deliveryId = await createDelivery({
        endpointId: endpoint.id,
        event,
        payload,
      });
      await enqueueJob(JOB_NAMES.DELIVER_OUTBOUND_WEBHOOK, { deliveryId });
    }
  } catch (err) {
    console.error("[webhooks] dispatch failed", err);
  }
}
