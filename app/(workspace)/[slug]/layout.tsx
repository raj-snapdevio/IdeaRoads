import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import { WorkspaceSuspendedPage } from "@/components/workspace/workspace-suspended";
import { ADMIN_ROLE, WORKSPACE_MEMBER } from "@/config/platform";
import { boards } from "@/db/schema";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { getUnreadCount } from "@/lib/notifications/queries";
import {
  getUserWorkspaces,
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function WorkspaceLayout({
  children,
  params,
}: WorkspaceLayoutProps) {
  const { slug } = await params;

  const session = await requireSession();

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    notFound();
  }

  const isOrbitAdmin = session.user.role === ADMIN_ROLE;

  // A suspended workspace is unavailable to everyone (PLATFORM.md §6) — Orbit
  // Admins govern it from /orbit, not from the live workspace.
  if (workspace.isSuspended) {
    return <WorkspaceSuspendedPage />;
  }

  const member = await getWorkspaceMember(workspace.id, session.user.id);
  if (!member) {
    notFound();
  }

  // Archived boards are hidden from the workspace navigation (Feature 04).
  const workspaceBoards = await db
    .select({ id: boards.id, slug: boards.slug, name: boards.name })
    .from(boards)
    .where(
      and(eq(boards.workspaceId, workspace.id), eq(boards.isArchived, false))
    )
    .orderBy(boards.displayOrder);

  const isAdminOrOwner = member.role !== WORKSPACE_MEMBER;
  const email = session.user.email;
  const userWorkspaces = await getUserWorkspaces(session.user.id);
  const unreadCount = await getUnreadCount(session.user.id);

  return (
    <div className="flex h-screen overflow-hidden">
      <WorkspaceSidebar
        boards={workspaceBoards}
        email={email}
        initialUnreadCount={unreadCount}
        isAdminOrOwner={isAdminOrOwner}
        isOrbitAdmin={isOrbitAdmin}
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
