import type { ReactNode } from "react";
import { WorkspaceSuspendedPage } from "@/components/workspace/workspace-suspended";
import { ADMIN_ROLE } from "@/config/platform";
import { getCurrentSession } from "@/lib/authz";
import { getWorkspaceBySlug } from "@/lib/workspaces/queries";

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

  if (workspace.isSuspended) {
    const session = await getCurrentSession();
    const isOrbitAdmin = session?.user.role === ADMIN_ROLE;
    if (!isOrbitAdmin) {
      return <WorkspaceSuspendedPage />;
    }
  }

  return children;
}
