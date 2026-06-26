import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RoadmapBoard } from "@/components/roadmap/roadmap-board";
import { getCurrentSession } from "@/lib/authz";
import { env } from "@/lib/env";
import { listPostsForRoadmap } from "@/lib/roadmap/queries";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: wsSlug } = await params;
  const workspace = await getWorkspaceBySlug(wsSlug);

  if (!workspace || !workspace.roadmapPublic) {
    return { title: "Roadmap", robots: "noindex, nofollow" };
  }

  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const title = `${workspace.name} Roadmap`;
  const description = `See what ${workspace.name} is building — planned features, work in progress, and recently shipped updates.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${appUrl}/${wsSlug}/roadmap`,
      type: "website",
    },
    robots: "index, follow",
  };
}

export default async function PublicRoadmapPage({ params }: Props) {
  const { slug: wsSlug } = await params;

  const workspace = await getWorkspaceBySlug(wsSlug);
  if (!workspace) {
    notFound();
  }

  const session = await getCurrentSession();
  const member = session
    ? await getWorkspaceMember(workspace.id, session.user.id)
    : null;

  // If roadmap is private and visitor is not a member → 404 (don't leak existence)
  if (!workspace.roadmapPublic && !member) {
    notFound();
  }

  const isAdmin = member ? member.role !== "member" : false;
  const isSignedIn = !!session;

  const roadmapData = await listPostsForRoadmap(workspace.id, {
    isAdmin,
    userId: session?.user.id,
  });

  const totalPosts =
    roadmapData.planned.length +
    roadmapData.in_progress.length +
    roadmapData.completed.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Public nav */}
      <header className="border-b border-border bg-background sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link
              className="text-sm font-semibold text-foreground hover:text-foreground/80 transition-colors"
              href={`/${wsSlug}`}
            >
              {workspace.name}
            </Link>
            <nav className="hidden sm:flex items-center gap-1">
              <Link
                className="px-3 py-1.5 text-sm font-medium text-foreground border-b-2 border-foreground"
                href={`/${wsSlug}/roadmap`}
              >
                Roadmap
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {isSignedIn ? (
              <Link
                className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                href={`/${wsSlug}`}
              >
                Dashboard
              </Link>
            ) : (
              <Link
                className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                href="/login"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Page header */}
      <div className="max-w-6xl mx-auto px-6 pt-10 pb-8">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          {workspace.name} Roadmap
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {totalPosts === 0
            ? "No items on the roadmap yet."
            : `${totalPosts} item${totalPosts === 1 ? "" : "s"} across all columns`}
        </p>
      </div>

      {/* Kanban board */}
      <div className="max-w-6xl mx-auto">
        <RoadmapBoard
          data={roadmapData}
          isAdmin={isAdmin}
          isSignedIn={isSignedIn}
          workspaceSlug={wsSlug}
        />
      </div>
    </div>
  );
}
