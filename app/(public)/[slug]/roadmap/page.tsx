import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RoadmapBoard } from "@/components/roadmap/roadmap-board";
import { PortalHeader } from "@/components/workspace/portal-header";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { getCurrentSession } from "@/lib/authz";
import { listPostsForRoadmap } from "@/lib/roadmap/queries";
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
  if (!workspace) {
    return { title: "Roadmap" };
  }
  return {
    title: `Roadmap — ${workspace.name}`,
    robots: workspace.roadmapPublic ? "index, follow" : "noindex, nofollow",
  };
}

export default async function RoadmapPage({ params }: Props) {
  const { slug } = await params;

  const session = await getCurrentSession();

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    notFound();
  }

  const member = session
    ? await getWorkspaceMember(workspace.id, session.user.id)
    : null;
  const isSignedIn = !!session;
  const isMember = !!member;
  const isAdmin = !!member && member.role !== WORKSPACE_MEMBER;

  // When the roadmap is private it appears not to exist for non-members.
  if (!workspace.roadmapPublic && !isMember) {
    notFound();
  }

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
      {!isMember && (
        <PortalHeader
          active="roadmap"
          changelogPublic={workspace.changelogPublic}
          isSignedIn={isSignedIn}
          roadmapPublic={workspace.roadmapPublic}
          slug={slug}
          workspaceName={workspace.name}
        />
      )}

      <div className="max-w-5xl mx-auto flex flex-col">
        <div className="border-b border-border px-8 py-6">
          <h1 className="text-xl font-semibold text-foreground">Roadmap</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {totalPosts === 0
              ? "No items on the roadmap yet."
              : `${totalPosts} item${totalPosts === 1 ? "" : "s"} across all columns`}
          </p>
        </div>

        <div className="flex-1">
          <RoadmapBoard
            data={roadmapData}
            isAdmin={isAdmin}
            isSignedIn={isSignedIn}
            workspaceSlug={slug}
          />
        </div>
      </div>
    </div>
  );
}
