import { notFound } from "next/navigation";

// Outbound webhook delivery is not yet implemented (dispatchWebhookEvent has no
// callers), so this settings page is hidden to avoid exposing a non-functional
// feature. Deferred — see Phase E. The endpoint UI (WebhookEndpointsSection) and
// queries (lib/webhooks) are intentionally retained for when delivery is wired up.
export default function WebhooksPage() {
  notFound();
}
