import { eq } from "drizzle-orm";
import { featureFlags } from "@/db/schema";
import { db } from "@/lib/db";

export type FeatureFlag = typeof featureFlags.$inferSelect;

const flagCache = new Map<string, { value: boolean; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;

export async function listFeatureFlags(): Promise<FeatureFlag[]> {
  return db.select().from(featureFlags).orderBy(featureFlags.key);
}

export async function toggleFlag(
  key: string,
  isEnabled: boolean
): Promise<FeatureFlag> {
  const [updated] = await db
    .update(featureFlags)
    .set({ isEnabled, updatedAt: new Date() })
    .where(eq(featureFlags.key, key))
    .returning();

  if (!updated) {
    throw new Error(`Feature flag '${key}' not found`);
  }

  // Invalidate cache
  flagCache.delete(key);
  return updated;
}

export async function isFeatureEnabled(key: string): Promise<boolean> {
  const cached = flagCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  try {
    const [flag] = await db
      .select({ isEnabled: featureFlags.isEnabled })
      .from(featureFlags)
      .where(eq(featureFlags.key, key))
      .limit(1);

    const value = flag?.isEnabled ?? true; // opt-out model: default true if missing
    flagCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
  } catch (error) {
    console.error(`[feature-flags] failed to check flag '${key}':`, error);
    return true; // fail-open
  }
}

export const DEFAULT_FEATURE_FLAGS: Array<{
  key: string;
  description: string;
  isEnabled: boolean;
}> = [
  {
    key: "guest_voting",
    description: "Allow guests to vote with email only",
    isEnabled: true,
  },
  {
    key: "public_roadmap",
    description: "Allow workspaces to make roadmap public",
    isEnabled: true,
  },
  {
    key: "public_changelog",
    description: "Allow workspaces to publish changelog",
    isEnabled: true,
  },
  {
    key: "magic_link_auth",
    description: "Magic link sign-in",
    isEnabled: true,
  },
  { key: "google_auth", description: "Google OAuth sign-in", isEnabled: true },
  {
    key: "changelog_rss",
    description: "RSS feed for changelog",
    isEnabled: true,
  },
];
