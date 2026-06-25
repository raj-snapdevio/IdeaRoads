import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { requireSession } from "@/lib/authz";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";
import { GeneralSettingsForm } from "./_components/general-settings-form";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `General Settings — ${slug}` };
}

export default async function GeneralSettingsPage({ params }: Props) {
  const { slug } = await params;
  const session = await requireSession();

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) notFound();

  const member = await getWorkspaceMember(workspace.id, session.user.id);
  if (!member) notFound();

  const canManage = member.role !== WORKSPACE_MEMBER;

  return (
    <GeneralSettingsForm
      workspaceId={workspace.id}
      workspaceSlug={workspace.slug}
      roadmapPublic={workspace.roadmapPublic}
      canManage={canManage}
    />
  );
}
