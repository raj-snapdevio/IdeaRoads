import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChangelogEditor } from "@/components/changelog/changelog-editor";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { requireSession } from "@/lib/authz";
import { getChangelogEntryById } from "@/lib/changelog/queries";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";

interface Props {
  params: Promise<{ slug: string; entryId: string }>;
}

export const metadata: Metadata = { title: "Edit Changelog Entry" };

export default async function EditChangelogEntryPage({ params }: Props) {
  const { slug, entryId } = await params;
  const session = await requireSession();

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    notFound();
  }

  const member = await getWorkspaceMember(workspace.id, session.user.id);
  if (!member || member.role === WORKSPACE_MEMBER) {
    notFound();
  }

  const entry = await getChangelogEntryById(entryId, workspace.id);
  if (!entry) {
    notFound();
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-8 py-4 flex items-center gap-3">
        <Link
          className="flex cursor-pointer items-center justify-center text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href={`/${slug}/settings/changelog`}
          title="Back to Changelog"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h2 className="text-sm font-semibold text-foreground">
          {entry.isPublished ? "Edit Published Entry" : "Edit Draft"}
        </h2>
        {entry.isPublished && (
          <span className="text-xs text-muted-foreground">
            Changes are immediately live
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        <ChangelogEditor
          initialEntry={{
            id: entry.id,
            title: entry.title,
            body: entry.body,
            label: entry.label,
            isPublished: entry.isPublished,
            linkedPosts: entry.linkedPosts,
          }}
          workspaceId={workspace.id}
          workspaceSlug={slug}
        />
      </div>
    </div>
  );
}
