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

export const categories = pgTable(
  "categories",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    color: text("color").notNull().default("#6366f1"),
    displayOrder: integer("display_order").notNull().default(0),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("categories_workspace_slug_unq").on(t.workspaceId, t.slug),
    uniqueIndex("categories_workspace_name_unq").on(t.workspaceId, t.name),
    index("categories_workspace_id_idx").on(t.workspaceId),
    index("categories_workspace_order_idx").on(t.workspaceId, t.displayOrder),
  ]
);
