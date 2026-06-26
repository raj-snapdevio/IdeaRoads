import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { URL } from "node:url";
import type { Job } from "pg-boss";
import { decrypt, isEncryptionAvailable } from "@/lib/encrypt";
import { audit } from "@/lib/audit";
import type { DeliverOutboundWebhookPayload } from "@/lib/worker/job-types";
import {
  claimDelivery,
  disableEndpoint,
  getWebhookEndpoint,
  incrementFailureCount,
  markDelivered,
  markFailed,
  resetFailureCount,
} from "@/lib/webhooks/queries";

// RFC 1918 + loopback + link-local CIDR ranges
const BLOCKED_PREFIXES = [
  "10.",
  "172.16.",
  "172.17.",
  "172.18.",
  "172.19.",
  "172.20.",
  "172.21.",
  "172.22.",
  "172.23.",
  "172.24.",
  "172.25.",
  "172.26.",
  "172.27.",
  "172.28.",
  "172.29.",
  "172.30.",
  "172.31.",
  "192.168.",
  "127.",
  "169.254.",
  "::1",
  "fc",
  "fd", // IPv6 ULA
];

function isPrivateAddress(hostname: string): boolean {
  // Block localhost by name
  if (hostname === "localhost" || hostname.endsWith(".local")) return true;
  // Check if it looks like an IP
  if (isIP(hostname) !== 0) {
    return BLOCKED_PREFIXES.some((prefix) => hostname.startsWith(prefix));
  }
  return false;
}

async function assertNotSsrf(url: string): Promise<void> {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") {
    throw new Error("Only HTTPS webhook endpoints are allowed.");
  }
  if (isPrivateAddress(parsed.hostname)) {
    throw new Error("Webhook URL resolves to a private or reserved address.");
  }
}

const MAX_CONSECUTIVE_FAILURES = 50;

export async function handleDeliverOutboundWebhook(
  jobs: Job<DeliverOutboundWebhookPayload>[]
): Promise<void> {
  for (const job of jobs) {
    const { deliveryId } = job.data;

    const delivery = await claimDelivery(deliveryId);
    if (!delivery) continue; // Already processed

    const endpoint = await getWebhookEndpoint(delivery.endpointId);
    if (!endpoint || !endpoint.isEnabled) continue;

    if (!isEncryptionAvailable()) {
      await markFailed(deliveryId, null, "ENCRYPTION_KEY not configured");
      continue;
    }

    let secret: string;
    try {
      secret = decrypt(endpoint.encryptedSecret);
    } catch {
      await markFailed(deliveryId, null, "Failed to decrypt webhook secret");
      continue;
    }

    try {
      await assertNotSsrf(endpoint.url);
    } catch (err) {
      await markFailed(deliveryId, null, (err as Error).message);
      continue;
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const rawBody = JSON.stringify(delivery.payload);
    const sigPayload = `${timestamp}.${rawBody}`;
    const hmac = createHmac("sha256", secret).update(sigPayload).digest("hex");
    const signature = `t=${timestamp},v1=${hmac}`;

    try {
      const res = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-IdeaRoads-Signature": signature,
          "User-Agent": "IdeaRoads-Webhook/1.0",
        },
        body: rawBody,
        signal: AbortSignal.timeout(10_000),
      });

      if (res.ok) {
        await markDelivered(deliveryId, res.status);
        await resetFailureCount(endpoint.id);
      } else {
        const body = await res.text().catch(() => "");
        await markFailed(deliveryId, res.status, body);
        const newCount = await incrementFailureCount(endpoint.id);
        if (newCount >= MAX_CONSECUTIVE_FAILURES) {
          await disableEndpoint(endpoint.id, "consecutive_failures");
          audit({
            workspaceId: endpoint.workspaceId,
            actorId: null,
            action: "webhook.disabled",
            entityType: "webhook",
            entityId: endpoint.id,
            entityName: endpoint.url,
            description: `Webhook auto-disabled after ${MAX_CONSECUTIVE_FAILURES} failures`,
            metadata: { reason: "consecutive_failures", url: endpoint.url },
          });
        }
        // Re-throw so pg-boss retries up to retryLimit
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("HTTP ")) {
        throw err; // Let pg-boss handle retry
      }
      const msg = err instanceof Error ? err.message : "Unknown error";
      await markFailed(deliveryId, null, msg);
      await incrementFailureCount(endpoint.id);
      throw err; // Retry
    }
  }
}
