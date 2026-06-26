import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { apiKeys } from "@/db/schema";
import { db } from "@/lib/db";

export async function validateApiKey(
  rawKey: string
): Promise<{ workspaceId: string; userId: string | null } | null> {
  const tokenHash = createHash("sha256").update(rawKey).digest("hex");

  const [row] = await db
    .select({
      workspaceId: apiKeys.workspaceId,
      userId: apiKeys.userId,
      id: apiKeys.id,
      isEnabled: apiKeys.isEnabled,
    })
    .from(apiKeys)
    .where(eq(apiKeys.tokenHash, tokenHash))
    .limit(1);

  if (!row || !row.isEnabled) {
    return null;
  }

  // Update last_used_at fire-and-forget
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, row.id))
    .catch((err) =>
      console.error("[api-keys] failed to update last_used_at", err)
    );

  return { workspaceId: row.workspaceId, userId: row.userId };
}
