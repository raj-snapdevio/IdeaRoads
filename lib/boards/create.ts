import { createId } from "@paralleldrive/cuid2";
import { and, eq, ne, sql } from "drizzle-orm";
import { RESERVED_BOARD_SLUGS } from "@/config/platform";
import { boards } from "@/db/schema";
import { db } from "@/lib/db";

export function slugifyBoard(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 64) || "board"
  );
}

/** Suggest a unique slug for a workspace, derived from the board name. */
export async function generateBoardSlug(
  workspaceId: string,
  name: string
): Promise<string> {
  const base = slugifyBoard(name);
  const existing = await db
    .select({ slug: boards.slug })
    .from(boards)
    .where(
      sql`${boards.workspaceId} = ${workspaceId} AND ${boards.slug} LIKE ${`${base}%`}`
    );
  const taken = new Set(existing.map((r) => r.slug));
  if (!taken.has(base) && !RESERVED_BOARD_SLUGS.includes(base)) {
    return base;
  }
  let i = 2;
  while (taken.has(`${base}-${i}`)) {
    i++;
  }
  return `${base}-${i}`;
}

/**
 * Validate an explicit, user-supplied slug. Returns the normalized slug or an
 * error string. `excludeBoardId` lets an edit keep its own slug.
 */
export async function validateBoardSlug(
  workspaceId: string,
  rawSlug: string,
  excludeBoardId?: string
): Promise<{ slug: string } | { error: string }> {
  const slug = slugifyBoard(rawSlug);
  if (!slug || slug === "board") {
    return { error: "Enter a valid slug (letters, numbers, and hyphens)." };
  }
  if (RESERVED_BOARD_SLUGS.includes(slug)) {
    return { error: `"${slug}" is a reserved slug.` };
  }
  const clash = await db
    .select({ id: boards.id })
    .from(boards)
    .where(
      excludeBoardId
        ? and(
            eq(boards.workspaceId, workspaceId),
            eq(boards.slug, slug),
            ne(boards.id, excludeBoardId)
          )
        : and(eq(boards.workspaceId, workspaceId), eq(boards.slug, slug))
    )
    .limit(1);
  if (clash.length > 0) {
    return { error: "A board with this slug already exists." };
  }
  return { slug };
}

async function getNextDisplayOrder(workspaceId: string): Promise<number> {
  const [row] = await db
    .select({
      maxOrder: sql<number>`COALESCE(MAX(${boards.displayOrder}), -1)`,
    })
    .from(boards)
    .where(eq(boards.workspaceId, workspaceId));
  return (row?.maxOrder ?? -1) + 1;
}

export async function createBoard(input: {
  workspaceId: string;
  name: string;
  slug: string;
  description?: string | null;
  isPublic: boolean;
  createdBy: string;
}) {
  const displayOrder = await getNextDisplayOrder(input.workspaceId);
  const [board] = await db
    .insert(boards)
    .values({
      id: createId(),
      workspaceId: input.workspaceId,
      name: input.name.trim(),
      slug: input.slug,
      description: input.description?.trim() || null,
      isPublic: input.isPublic,
      displayOrder,
      createdBy: input.createdBy,
    })
    .returning();
  return board!;
}
