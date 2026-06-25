import { and, eq, inArray, sql } from "drizzle-orm";
import { REACTION_EMOJIS } from "@/config/platform";
import { commentReactions } from "@/db/schema";
import { db } from "@/lib/db";

export { REACTION_EMOJIS } from "@/config/platform";
export type { ReactionEmoji } from "@/config/platform";

export interface ReactionGroup {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

export async function getReactionsForComments(
  commentIds: string[],
  userId?: string | null
): Promise<Map<string, ReactionGroup[]>> {
  if (commentIds.length === 0) return new Map();

  const rows = await db
    .select({
      commentId: commentReactions.commentId,
      emoji: commentReactions.emoji,
      count: sql<number>`count(*)::int`,
      hasReacted: userId
        ? sql<boolean>`bool_or(${commentReactions.userId} = ${userId})`
        : sql<boolean>`false`,
    })
    .from(commentReactions)
    .where(inArray(commentReactions.commentId, commentIds))
    .groupBy(commentReactions.commentId, commentReactions.emoji);

  const map = new Map<string, ReactionGroup[]>();
  for (const row of rows) {
    const existing = map.get(row.commentId) ?? [];
    existing.push({
      emoji: row.emoji,
      count: row.count,
      hasReacted: row.hasReacted,
    });
    map.set(row.commentId, existing);
  }
  return map;
}

export async function toggleReaction(
  commentId: string,
  emoji: string,
  userId: string
): Promise<{ added: boolean }> {
  if (!(REACTION_EMOJIS as readonly string[]).includes(emoji)) {
    throw new Error("Invalid emoji.");
  }

  const existing = await db
    .select({ id: commentReactions.id })
    .from(commentReactions)
    .where(
      and(
        eq(commentReactions.commentId, commentId),
        eq(commentReactions.userId, userId),
        eq(commentReactions.emoji, emoji)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .delete(commentReactions)
      .where(eq(commentReactions.id, existing[0]!.id));
    return { added: false };
  }

  const id = (await import("@paralleldrive/cuid2")).createId();
  await db.insert(commentReactions).values({ id, commentId, userId, emoji });
  return { added: true };
}
