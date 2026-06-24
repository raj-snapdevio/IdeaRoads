import { and, asc, count, eq } from "drizzle-orm";
import { ArrowRight, LayoutGrid, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { boards, posts, workspaceMembers } from "@/db/schema";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  return { title: workspace?.name ?? "Workspace" };
}

export default async function WorkspaceDashboardPage({ params }: Props) {
  const { slug } = await params;
  const session = await requireSession();

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) notFound();

  const member = await getWorkspaceMember(workspace.id, session.user.id);
  if (!member) notFound();

  const [workspaceBoards, [{ memberCount }], boardPostCounts] =
    await Promise.all([
      db
        .select()
        .from(boards)
        .where(
          and(
            eq(boards.workspaceId, workspace.id),
            eq(boards.isArchived, false)
          )
        )
        .orderBy(asc(boards.displayOrder)),
      db
        .select({ memberCount: count() })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.workspaceId, workspace.id)),
      db
        .select({ boardId: posts.boardId, postCount: count() })
        .from(posts)
        .where(eq(posts.workspaceId, workspace.id))
        .groupBy(posts.boardId),
    ]);

  const postCountMap = Object.fromEntries(
    boardPostCounts.map((r) => [r.boardId, r.postCount])
  );
  const totalPosts = boardPostCounts.reduce((sum, r) => sum + r.postCount, 0);

  return (
    <div className="flex flex-col">
      {/* Page header */}
      <div className="border-b border-border px-8 py-6">
        <h1 className="text-xl font-semibold text-foreground">
          {workspace.name}
        </h1>
        {workspace.description && (
          <p className="mt-1 text-sm text-muted-foreground">
            {workspace.description}
          </p>
        )}
      </div>

      <div className="px-8 py-8 space-y-8">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3">
          <div className="bg-background px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-muted-foreground">
              Boards
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
              {workspaceBoards.length}
            </p>
          </div>
          <div className="bg-background px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-muted-foreground">
              Members
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
              {memberCount}
            </p>
          </div>
          <div className="bg-background px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-muted-foreground">
              Feedback posts
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
              {totalPosts}
            </p>
          </div>
        </div>

        {/* Boards section */}
        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-eyebrow text-muted-foreground">
            Feedback boards
          </h2>
          <div className="space-y-px bg-border">
            {workspaceBoards.map((board) => (
              <Link
                key={board.id}
                className="group flex items-center gap-4 bg-background px-6 py-4 hover:bg-muted transition-colors duration-150"
                href={`/${workspace.slug}/b/${board.slug}`}
              >
                <div className="flex size-9 shrink-0 items-center justify-center bg-muted group-hover:bg-background transition-colors duration-150">
                  <LayoutGrid className="size-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {board.name}
                  </p>
                  {board.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {board.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {postCountMap[board.id] ?? 0}{" "}
                    {(postCountMap[board.id] ?? 0) === 1 ? "post" : "posts"}
                  </span>
                  <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Getting started */}
        {memberCount === 1 && (
          <div className="border border-border bg-muted/30 px-6 py-5">
            <div className="flex items-start gap-4">
              <div className="flex size-9 shrink-0 items-center justify-center bg-background border border-border">
                <Users className="size-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Invite your team
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Team members can manage boards, review feedback, and keep your
                  users updated.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
