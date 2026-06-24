import { createId } from "@paralleldrive/cuid2";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "@/db/schema/auth";
import { boards } from "@/db/schema/boards";
import { workspaces } from "@/db/schema/workspaces";

export const postStatus = pgEnum("post_status", [
  "open",
  "under_review",
  "planned",
  "in_progress",
  "done",
  "declined",
]);

export const posts = pgTable(
  "posts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    boardId: text("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body"),
    status: postStatus("status").notNull().default("open"),
    authorId: text("author_id").references(() => user.id, {
      onDelete: "set null",
    }),
    authorName: text("author_name"),
    authorEmail: text("author_email").notNull(),
    upvotes: integer("upvotes").notNull().default(0),
    isPinned: boolean("is_pinned").notNull().default(false),
    isLocked: boolean("is_locked").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("posts_board_id_created_at_idx").on(t.boardId, t.createdAt),
    index("posts_board_id_upvotes_idx").on(t.boardId, t.upvotes),
    index("posts_board_id_status_idx").on(t.boardId, t.status),
    index("posts_author_id_idx").on(t.authorId),
    index("posts_workspace_id_created_at_idx").on(t.workspaceId, t.createdAt),
  ]
);
