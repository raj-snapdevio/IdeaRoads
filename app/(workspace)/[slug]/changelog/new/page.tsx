import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChangelogEditor } from "@/components/changelog/changelog-editor";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { requireSession } from "@/lib/authz";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";

interface Props {
  params: Promise<{ slug: string }>;
}

export const metadata: Metadata = { title: "New Changelog Entry" };

export default async function NewChangelogEntryPage({ params }: Props) {
  const { slug } = await params;
  const session = await requireSession();

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    notFound();
  }

  const member = await getWorkspaceMember(workspace.id, session.user.id);
  if (!member || member.role === WORKSPACE_MEMBER) {
    notFound();
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-8 py-4 flex items-center gap-3">
        <h2 className="text-sm font-semibold text-foreground">New Entry</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ChangelogEditor workspaceId={workspace.id} workspaceSlug={slug} />
      </div>
    </div>
  );
}
