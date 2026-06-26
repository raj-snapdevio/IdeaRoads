import { createId } from "@paralleldrive/cuid2";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { workspaces } from "@/db/schema/workspaces";

export const outboundWebhookEndpoints = pgTable(
  "outbound_webhook_endpoints",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    encryptedSecret: text("encrypted_secret").notNull(),
    events: text("events").array().notNull().default([]),
    isEnabled: boolean("is_enabled").notNull().default(true),
    consecutiveFailures: integer("consecutive_failures").notNull().default(0),
    disabledReason: text("disabled_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("webhook_endpoints_workspace_id_idx").on(t.workspaceId)]
);

export const outboundWebhookDeliveries = pgTable(
  "outbound_webhook_deliveries",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    endpointId: text("endpoint_id")
      .notNull()
      .references(() => outboundWebhookEndpoints.id, { onDelete: "cascade" }),
    event: text("event").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    responseStatus: integer("response_status"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("webhook_deliveries_endpoint_created_at_idx").on(
      t.endpointId,
      t.createdAt
    ),
  ]
);
