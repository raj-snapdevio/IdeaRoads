import { and, eq } from "drizzle-orm";
import type { ReactNode } from "react";
import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import { WorkspaceSuspendedPage } from "@/components/workspace/workspace-suspended";
import { ADMIN_ROLE, WORKSPACE_MEMBER } from "@/config/platform";
import { boards } from "@/db/schema";
import { getCurrentSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { getUnreadCount } from "@/lib/notifications/queries";
import {
  getUserWorkspaces,
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";

interface Props {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function PublicSlugLayout({ children, params }: Props) {
  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);

  if (!workspace) {
    return children;
  }

  // A suspended workspace is unavailable to everyone (PLATFORM.md §6).
  if (workspace.isSuspended) {
    return <WorkspaceSuspendedPage />;
  }

  // Signed-in workspace members get the full workspace shell (sidebar) on the
  // portal pages too, so navigation stays consistent with the rest of the app.
  // Anonymous visitors fall through and see each page's own PortalHeader.
  const session = await getCurrentSession();
  const member = session
    ? await getWorkspaceMember(workspace.id, session.user.id)
    : null;

  if (!(session && member)) {
    return children;
  }

  // Archived boards are hidden from the workspace navigation (Feature 04).
  const workspaceBoards = await db
    .select({ id: boards.id, slug: boards.slug, name: boards.name })
    .from(boards)
    .where(
      and(eq(boards.workspaceId, workspace.id), eq(boards.isArchived, false))
    )
    .orderBy(boards.displayOrder);

  const [userWorkspaces, unreadCount] = await Promise.all([
    getUserWorkspaces(session.user.id),
    getUnreadCount(session.user.id),
  ]);

  return (
    <div className="flex h-screen overflow-hidden">
      <WorkspaceSidebar
        boards={workspaceBoards}
        email={session.user.email}
        initialUnreadCount={unreadCount}
        isAdminOrOwner={member.role !== WORKSPACE_MEMBER}
        isOrbitAdmin={session.user.role === ADMIN_ROLE}
        workspaceName={workspace.name}
        workspaceSlug={workspace.slug}
        workspaces={userWorkspaces}
      />

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-y-auto bg-background">
        {children}
      </main>
    </div>
  );
}
