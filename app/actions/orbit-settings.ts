"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/authz";
import type { PlatformSettings } from "@/lib/orbit/settings";
import { updatePlatformSettings } from "@/lib/orbit/settings";

export async function updatePlatformSettingsAction(
  changes: Partial<Omit<PlatformSettings, "id" | "updatedAt">>
): Promise<{ error?: string }> {
  const session = await requireAdmin();

  try {
    await updatePlatformSettings(changes);

    await audit({
      action: "platform.settings_updated",
      actorId: session.user.id,
      actorEmail: session.user.email,
      description: "Platform settings updated",
      entityType: "platform",
      metadata: changes as Record<string, unknown>,
      workspaceId: null,
    });

    revalidatePath("/orbit/settings");
    return {};
  } catch (error) {
    console.error("[orbit] updatePlatformSettings failed", error);
    return { error: "Failed to update settings" };
  }
}

export async function grantAdminAction(
  targetUserId: string
): Promise<{ error?: string }> {
  const session = await requireAdmin();
  const { grantAdmin } = await import("@/lib/orbit/users");

  try {
    await grantAdmin(targetUserId, session.user.id, session.user.email);
    revalidatePath("/orbit/users");
    revalidatePath(`/orbit/users/${targetUserId}`);
    return {};
  } catch (error) {
    console.error("[orbit] grantAdmin failed", error);
    return { error: "Failed to grant admin access" };
  }
}

export async function revokeAdminAction(
  targetUserId: string
): Promise<{ error?: string }> {
  const session = await requireAdmin();
  const { revokeAdmin } = await import("@/lib/orbit/users");

  try {
    await revokeAdmin(targetUserId, session.user.id, session.user.email);
    revalidatePath("/orbit/users");
    revalidatePath(`/orbit/users/${targetUserId}`);
    return {};
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to revoke admin access";
    return { error: message };
  }
}
