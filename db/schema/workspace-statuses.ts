import { createId } from "@paralleldrive/cuid2";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { workspaces } from "@/db/schema/workspaces";

export const workspaceStatuses = pgTable(
  "workspace_statuses",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    color: text("color").notNull().default("#6b7280"),
    displayOrder: integer("display_order").notNull().default(0),
    isDefault: boolean("is_default").notNull().default(false),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("workspace_statuses_workspace_slug_unq").on(
      t.workspaceId,
      t.slug
    ),
    index("workspace_statuses_workspace_id_idx").on(t.workspaceId),
    index("workspace_statuses_workspace_order_idx").on(
      t.workspaceId,
      t.displayOrder
    ),
  ]
);
