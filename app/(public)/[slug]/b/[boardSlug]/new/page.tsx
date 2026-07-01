import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PortalHeader } from "@/components/workspace/portal-header";
import { getCurrentSession } from "@/lib/authz";
import { getBoardBySlug } from "@/lib/boards/queries";
import { getActiveCategoriesForWorkspace } from "@/lib/categories/queries";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";
import NewPostForm from "./_components/new-post-form";

interface Props {
  params: Promise<{ slug: string; boardSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, boardSlug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    return { title: "New Post" };
  }
  const board = await getBoardBySlug(workspace.id, boardSlug);
  return { title: `New post — ${board?.name ?? "Board"}` };
}

export default async function NewPostPage({ params }: Props) {
  const { slug, boardSlug } = await params;

  // Submitting feedback requires a signed-in User — send visitors to sign in.
  const session = await getCurrentSession();
  if (!session) {
    redirect(
      `/signin?next=${encodeURIComponent(`/${slug}/b/${boardSlug}/new`)}`
    );
  }

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    notFound();
  }

  const board = await getBoardBySlug(workspace.id, boardSlug);
  if (!board) {
    notFound();
  }

  const member = await getWorkspaceMember(workspace.id, session.user.id);

  // Anyone signed in may submit on a public board; private/archived boards are
  // restricted to workspace members.
  if ((!board.isPublic || board.isArchived) && !member) {
    notFound();
  }

  const categories = await getActiveCategoriesForWorkspace(workspace.id);

  return (
    <div className="min-h-screen bg-background">
      {!member && (
        <PortalHeader
          changelogPublic={workspace.changelogPublic}
          isSignedIn={true}
          roadmapPublic={workspace.roadmapPublic}
          slug={slug}
          workspaceName={workspace.name}
        />
      )}
      <div className="max-w-5xl mx-auto">
        <NewPostForm
          boardId={board.id}
          boardName={board.name}
          boardSlug={boardSlug}
          categories={categories}
          workspaceId={workspace.id}
          workspaceSlug={slug}
        />
      </div>
    </div>
  );
}
