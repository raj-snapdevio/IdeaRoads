import { notFound } from "next/navigation";

// API-key authentication is not yet implemented (validateApiKey has no callers
// and no route authenticates with a key), so this settings page is hidden to
// avoid exposing a non-functional feature. Deferred — see Phase E. The key UI
// (ApiKeysSection) and queries (lib/api-keys) are retained for the future API.
export default function ApiKeysPage() {
  notFound();
}
