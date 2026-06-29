import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import { WorkspaceSuspendedPage } from "@/components/workspace/workspace-suspended";
import { ADMIN_ROLE, WORKSPACE_MEMBER } from "@/config/platform";
import { boards } from "@/db/schema";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import {
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

  if (workspace.isSuspended && !isOrbitAdmin) {
    return <WorkspaceSuspendedPage />;
  }

  const member = await getWorkspaceMember(workspace.id, session.user.id);
  if (!member) {
    notFound();
  }

  const workspaceBoards = await db
    .select({ id: boards.id, slug: boards.slug, name: boards.name })
    .from(boards)
    .where(eq(boards.workspaceId, workspace.id))
    .orderBy(boards.displayOrder);

  const isAdminOrOwner = member.role !== WORKSPACE_MEMBER;
  const email = session.user.email;

  return (
    <div className="flex h-screen overflow-hidden">
      <WorkspaceSidebar
        boards={workspaceBoards}
        email={email}
        isAdminOrOwner={isAdminOrOwner}
        isOrbitAdmin={isOrbitAdmin}
        workspaceName={workspace.name}
        workspaceSlug={workspace.slug}
      />

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-y-auto bg-background">
        {children}
      </main>
    </div>
  );
}
