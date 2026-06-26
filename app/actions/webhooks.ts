"use server";

import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { outboundWebhookEndpoints } from "@/db/schema";
import { audit } from "@/lib/audit";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { decrypt, encrypt, isEncryptionAvailable } from "@/lib/encrypt";
import { ALL_WEBHOOK_EVENTS, type WebhookEvent } from "@/lib/webhooks/events";
import { getWebhookEndpoint } from "@/lib/webhooks/queries";
import { getWorkspaceMember } from "@/lib/workspaces/queries";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string; field?: string };

const urlSchema = z
  .string()
  .url("Must be a valid URL.")
  .refine((u) => u.startsWith("https://"), "Only HTTPS endpoints are allowed.");

const eventsSchema = z
  .array(z.enum(ALL_WEBHOOK_EVENTS as [WebhookEvent, ...WebhookEvent[]]))
  .min(1, "Select at least one event.")
  .max(ALL_WEBHOOK_EVENTS.length);

// ─── Create Endpoint ──────────────────────────────────────────────────────────

const createSchema = z.object({
  workspaceId: z.string().min(1),
  url: urlSchema,
  events: eventsSchema,
});

export async function createWebhookEndpointAction(input: {
  workspaceId: string;
  url: string;
  events: string[];
}): Promise<ActionResult<{ id: string; secret: string }>> {
  const session = await requireSession();

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      success: false,
      error: first?.message ?? "Invalid input.",
      field: first?.path[0] as string | undefined,
    };
  }

  const member = await getWorkspaceMember(
    parsed.data.workspaceId,
    session.user.id
  );
  if (!member || member.role === WORKSPACE_MEMBER) {
    return {
      success: false,
      error: "Only admins and owners can manage webhooks.",
    };
  }

  if (!isEncryptionAvailable()) {
    return {
      success: false,
      error: "Webhook signing is not configured on this server.",
    };
  }

  const rawSecret = `whsec_${createId()}`;
  const encryptedSecret = encrypt(rawSecret);

  const [row] = await db
    .insert(outboundWebhookEndpoints)
    .values({
      workspaceId: parsed.data.workspaceId,
      url: parsed.data.url,
      encryptedSecret,
      events: parsed.data.events,
      isEnabled: true,
    })
    .returning({ id: outboundWebhookEndpoints.id });

  audit({
    workspaceId: parsed.data.workspaceId,
    action: "webhook.created",
    actorId: session.user.id,
    actorEmail: session.user.email,
    actorName: session.user.name ?? null,
    entityType: "webhook",
    entityId: row!.id,
    entityName: parsed.data.url,
    description: `Webhook endpoint created: ${parsed.data.url}`,
    metadata: { url: parsed.data.url, events: parsed.data.events },
  });

  return { success: true, data: { id: row!.id, secret: rawSecret } };
}

// ─── Update Endpoint ──────────────────────────────────────────────────────────

const updateSchema = z.object({
  endpointId: z.string().min(1),
  workspaceId: z.string().min(1),
  url: urlSchema.optional(),
  events: eventsSchema.optional(),
  isEnabled: z.boolean().optional(),
  rotateSecret: z.boolean().optional(),
});

export async function updateWebhookEndpointAction(input: {
  endpointId: string;
  workspaceId: string;
  url?: string;
  events?: string[];
  isEnabled?: boolean;
  rotateSecret?: boolean;
}): Promise<ActionResult<{ secret?: string }>> {
  const session = await requireSession();

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      success: false,
      error: first?.message ?? "Invalid input.",
      field: first?.path[0] as string | undefined,
    };
  }

  const member = await getWorkspaceMember(
    parsed.data.workspaceId,
    session.user.id
  );
  if (!member || member.role === WORKSPACE_MEMBER) {
    return {
      success: false,
      error: "Only admins and owners can manage webhooks.",
    };
  }

  const endpoint = await getWebhookEndpoint(parsed.data.endpointId);
  if (!endpoint || endpoint.workspaceId !== parsed.data.workspaceId) {
    return { success: false, error: "Webhook endpoint not found." };
  }

  type EndpointUpdate = {
    url?: string;
    events?: string[];
    isEnabled?: boolean;
    encryptedSecret?: string;
    disabledReason?: string | null;
    consecutiveFailures?: number;
    updatedAt: Date;
  };
  const updates: EndpointUpdate = { updatedAt: new Date() };

  if (parsed.data.url !== undefined) {
    updates.url = parsed.data.url;
  }
  if (parsed.data.events !== undefined) {
    updates.events = parsed.data.events;
  }
  if (parsed.data.isEnabled !== undefined) {
    updates.isEnabled = parsed.data.isEnabled;
    if (parsed.data.isEnabled) {
      // Re-enabling clears the disabled reason + failure count
      updates.disabledReason = null;
      updates.consecutiveFailures = 0;
    }
  }

  let newSecret: string | undefined;
  if (parsed.data.rotateSecret) {
    if (!isEncryptionAvailable()) {
      return {
        success: false,
        error: "Webhook signing is not configured on this server.",
      };
    }
    newSecret = `whsec_${createId()}`;
    updates.encryptedSecret = encrypt(newSecret);
  }

  await db
    .update(outboundWebhookEndpoints)
    .set(updates)
    .where(
      and(
        eq(outboundWebhookEndpoints.id, parsed.data.endpointId),
        eq(outboundWebhookEndpoints.workspaceId, parsed.data.workspaceId)
      )
    );

  audit({
    workspaceId: parsed.data.workspaceId,
    action: "webhook.updated",
    actorId: session.user.id,
    actorEmail: session.user.email,
    actorName: session.user.name ?? null,
    entityType: "webhook",
    entityId: parsed.data.endpointId,
    entityName: endpoint.url,
    description: `Webhook endpoint updated: ${endpoint.url}`,
    metadata: {
      url: parsed.data.url,
      events: parsed.data.events,
      isEnabled: parsed.data.isEnabled,
      rotatedSecret: !!parsed.data.rotateSecret,
    },
  });

  return { success: true, data: { secret: newSecret } };
}

// ─── Delete Endpoint ──────────────────────────────────────────────────────────

export async function deleteWebhookEndpointAction(input: {
  endpointId: string;
  workspaceId: string;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  const member = await getWorkspaceMember(input.workspaceId, session.user.id);
  if (!member || member.role === WORKSPACE_MEMBER) {
    return {
      success: false,
      error: "Only admins and owners can manage webhooks.",
    };
  }

  const endpoint = await getWebhookEndpoint(input.endpointId);
  if (!endpoint || endpoint.workspaceId !== input.workspaceId) {
    return { success: false, error: "Webhook endpoint not found." };
  }

  await db
    .delete(outboundWebhookEndpoints)
    .where(
      and(
        eq(outboundWebhookEndpoints.id, input.endpointId),
        eq(outboundWebhookEndpoints.workspaceId, input.workspaceId)
      )
    );

  audit({
    workspaceId: input.workspaceId,
    action: "webhook.deleted",
    actorId: session.user.id,
    actorEmail: session.user.email,
    actorName: session.user.name ?? null,
    entityType: "webhook",
    entityId: input.endpointId,
    entityName: endpoint.url,
    description: `Webhook endpoint deleted: ${endpoint.url}`,
    metadata: { url: endpoint.url },
  });

  return { success: true, data: undefined };
}

// ─── Get Decrypted Secret (for display) ───────────────────────────────────────

export async function getWebhookSecretAction(input: {
  endpointId: string;
  workspaceId: string;
}): Promise<ActionResult<{ secret: string }>> {
  const session = await requireSession();

  const member = await getWorkspaceMember(input.workspaceId, session.user.id);
  if (!member || member.role === WORKSPACE_MEMBER) {
    return {
      success: false,
      error: "Only admins and owners can view webhook secrets.",
    };
  }

  if (!isEncryptionAvailable()) {
    return { success: false, error: "Webhook signing is not configured." };
  }

  const endpoint = await getWebhookEndpoint(input.endpointId);
  if (!endpoint || endpoint.workspaceId !== input.workspaceId) {
    return { success: false, error: "Webhook endpoint not found." };
  }

  let secret: string;
  try {
    secret = decrypt(endpoint.encryptedSecret);
  } catch {
    return { success: false, error: "Failed to decrypt webhook secret." };
  }

  return { success: true, data: { secret } };
}
