import { createHash } from "node:crypto";
import { createId } from "@paralleldrive/cuid2";
import { apiKeys } from "@/db/schema";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";

export async function generateApiKey(
  workspaceId: string,
  userId: string,
  name: string
): Promise<{ id: string; name: string; rawKey: string }> {
  const rawKey = `ir_live_${createId()}`;
  const tokenHash = createHash("sha256").update(rawKey).digest("hex");

  const [row] = await db
    .insert(apiKeys)
    .values({
      workspaceId,
      userId,
      name,
      tokenHash,
    })
    .returning({ id: apiKeys.id });

  audit({
    workspaceId,
    actorId: userId,
    action: "api_key.created",
    entityType: "api_key",
    entityId: row!.id,
    entityName: name,
    description: `API key created: ${name}`,
    metadata: { name },
  });

  return { id: row!.id, name, rawKey };
}
