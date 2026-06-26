import { and, desc, eq, lt, sql } from "drizzle-orm";
import {
  outboundWebhookDeliveries,
  outboundWebhookEndpoints,
} from "@/db/schema";
import { db } from "@/lib/db";

export async function listWebhookEndpoints(workspaceId: string) {
  return db
    .select()
    .from(outboundWebhookEndpoints)
    .where(eq(outboundWebhookEndpoints.workspaceId, workspaceId))
    .orderBy(desc(outboundWebhookEndpoints.createdAt));
}

export async function getWebhookEndpoint(endpointId: string) {
  const [row] = await db
    .select()
    .from(outboundWebhookEndpoints)
    .where(eq(outboundWebhookEndpoints.id, endpointId))
    .limit(1);
  return row ?? null;
}

export async function listWebhookDeliveries(endpointId: string, limit = 100) {
  return db
    .select()
    .from(outboundWebhookDeliveries)
    .where(eq(outboundWebhookDeliveries.endpointId, endpointId))
    .orderBy(desc(outboundWebhookDeliveries.createdAt))
    .limit(limit);
}

export async function createDelivery(input: {
  endpointId: string;
  event: string;
  payload: Record<string, unknown>;
}): Promise<string> {
  const [row] = await db
    .insert(outboundWebhookDeliveries)
    .values({
      endpointId: input.endpointId,
      event: input.event,
      payload: input.payload,
      status: "pending",
    })
    .returning({ id: outboundWebhookDeliveries.id });
  return row!.id;
}

export async function claimDelivery(deliveryId: string) {
  const [row] = await db
    .update(outboundWebhookDeliveries)
    .set({ status: "sending", attempts: 1 })
    .where(
      and(
        eq(outboundWebhookDeliveries.id, deliveryId),
        eq(outboundWebhookDeliveries.status, "pending")
      )
    )
    .returning();
  return row ?? null;
}

export async function markDelivered(
  deliveryId: string,
  responseStatus: number
) {
  await db
    .update(outboundWebhookDeliveries)
    .set({ status: "delivered", responseStatus })
    .where(eq(outboundWebhookDeliveries.id, deliveryId));
}

export async function markFailed(
  deliveryId: string,
  responseStatus: number | null,
  lastError: string
) {
  await db
    .update(outboundWebhookDeliveries)
    .set({
      status: "failed",
      responseStatus: responseStatus ?? null,
      lastError: lastError.slice(0, 1000),
    })
    .where(eq(outboundWebhookDeliveries.id, deliveryId));
}

export async function incrementFailureCount(
  endpointId: string
): Promise<number> {
  const [row] = await db
    .update(outboundWebhookEndpoints)
    .set({
      consecutiveFailures: sql`${outboundWebhookEndpoints.consecutiveFailures} + 1`,
    })
    .where(eq(outboundWebhookEndpoints.id, endpointId))
    .returning({ failures: outboundWebhookEndpoints.consecutiveFailures });
  return row?.failures ?? 1;
}

export async function resetFailureCount(endpointId: string) {
  await db
    .update(outboundWebhookEndpoints)
    .set({ consecutiveFailures: 0 })
    .where(eq(outboundWebhookEndpoints.id, endpointId));
}

export async function disableEndpoint(endpointId: string, reason: string) {
  await db
    .update(outboundWebhookEndpoints)
    .set({ isEnabled: false, disabledReason: reason, updatedAt: new Date() })
    .where(eq(outboundWebhookEndpoints.id, endpointId));
}

export async function pruneOldDeliveries(olderThanDays = 30): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  const result = await db
    .delete(outboundWebhookDeliveries)
    .where(lt(outboundWebhookDeliveries.createdAt, cutoff))
    .returning({ id: outboundWebhookDeliveries.id });
  return result.length;
}
