import type { NextRequest } from "next/server";
import { validateApiKey } from "@/lib/api-keys/validate";

export interface ApiKeyContext {
  userId: string | null;
  workspaceId: string;
}

// Authenticates a programmatic API request via its API key. The key may be sent
// as `Authorization: Bearer <key>` or in the `x-api-key` header. Returns the
// workspace the key is scoped to, or null when the key is missing/invalid.
export async function authenticateApiKey(
  req: NextRequest
): Promise<ApiKeyContext | null> {
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : null;
  const rawKey = bearer || req.headers.get("x-api-key");

  if (!rawKey) {
    return null;
  }
  return validateApiKey(rawKey);
}
