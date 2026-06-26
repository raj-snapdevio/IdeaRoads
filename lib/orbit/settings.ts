import { eq } from "drizzle-orm";
import { platformSettings } from "@/db/schema";
import { db } from "@/lib/db";

export type PlatformSettings = typeof platformSettings.$inferSelect;

let _cache: { data: PlatformSettings; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

const DEFAULTS: PlatformSettings = {
  id: 1,
  signupEnabled: true,
  maxWorkspacesPerUser: 5,
  maintenanceMode: false,
  maintenanceMessage: null,
  updatedAt: new Date(),
};

export async function getPlatformSettings(): Promise<PlatformSettings> {
  if (_cache && _cache.expiresAt > Date.now()) {
    return _cache.data;
  }

  const rows = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.id, 1))
    .limit(1);

  let row = rows[0];

  if (!row) {
    const inserted = await db
      .insert(platformSettings)
      .values(DEFAULTS)
      .onConflictDoNothing()
      .returning();
    row = inserted[0] ?? DEFAULTS;
  }

  _cache = { data: row, expiresAt: Date.now() + CACHE_TTL_MS };
  return row;
}

export async function updatePlatformSettings(
  changes: Partial<Omit<PlatformSettings, "id" | "updatedAt">>
): Promise<PlatformSettings> {
  const [updated] = await db
    .insert(platformSettings)
    .values({ ...DEFAULTS, ...changes, id: 1, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: platformSettings.id,
      set: { ...changes, updatedAt: new Date() },
    })
    .returning();

  _cache = null;
  return updated;
}
