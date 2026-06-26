import { desc, eq } from "drizzle-orm";
import { apiKeys } from "@/db/schema";
import { db } from "@/lib/db";

export async function listApiKeys(workspaceId: string) {
  return db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      lastUsedAt: apiKeys.lastUsedAt,
      isEnabled: apiKeys.isEnabled,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.workspaceId, workspaceId))
    .orderBy(desc(apiKeys.createdAt));
}

export async function revokeApiKey(
  keyId: string,
  workspaceId: string
): Promise<string | null> {
  const [row] = await db
    .delete(apiKeys)
    .where(eq(apiKeys.id, keyId))
    .returning({ name: apiKeys.name, workspaceId: apiKeys.workspaceId });

  if (!row || row.workspaceId !== workspaceId) {
    return null;
  }
  return row.name;
}
