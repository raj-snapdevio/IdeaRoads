import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StatusList } from "@/components/workspace-statuses/status-list";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { requireSession } from "@/lib/authz";
import { getWorkspaceStatuses } from "@/lib/workspace-statuses/queries";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Statuses — ${slug}` };
}

export default async function StatusesPage({ params }: Props) {
  const { slug } = await params;
  const session = await requireSession();

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    notFound();
  }

  const member = await getWorkspaceMember(workspace.id, session.user.id);
  if (!member) {
    notFound();
  }

  const statuses = await getWorkspaceStatuses(workspace.id);
  const canManage = member.role !== WORKSPACE_MEMBER;

  return (
    <StatusList
      canManage={canManage}
      statuses={statuses}
      workspaceId={workspace.id}
    />
  );
}
