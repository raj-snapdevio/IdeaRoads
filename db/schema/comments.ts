import { createId } from "@paralleldrive/cuid2";
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "@/db/schema/auth";
import { posts } from "@/db/schema/posts";

export const comments = pgTable(
  "comments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    parentId: text("parent_id"),
    body: text("body").notNull(),
    isDeleted: boolean("is_deleted").notNull().default(false),
    isApproved: boolean("is_approved").notNull().default(true),
    authorId: text("author_id").references(() => user.id, {
      onDelete: "set null",
    }),
    authorEmail: text("author_email"),
    authorName: text("author_name"),
    authorAvatar: text("author_avatar"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("comments_post_id_idx").on(t.postId),
    index("comments_parent_id_idx").on(t.parentId),
    index("comments_author_id_idx").on(t.authorId),
    index("comments_post_id_approved_deleted_idx").on(
      t.postId,
      t.isApproved,
      t.isDeleted
    ),
  ]
);
