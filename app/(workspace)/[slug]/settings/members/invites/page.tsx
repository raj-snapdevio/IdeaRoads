import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WORKSPACE_MEMBER, WORKSPACE_OWNER } from "@/config/platform";
import { requireSession } from "@/lib/authz";
import { listActiveInviteLinks } from "@/lib/workspaces/invite-links";
import { listPendingInvites } from "@/lib/workspaces/invites";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";
import { CreateLinkForm } from "../_components/create-link-form";
import { InviteForm } from "../_components/invite-form";
import { InviteLinksList } from "../_components/invite-links-list";
import { PendingInvitesList } from "../_components/pending-invites-list";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Invites — ${slug}` };
}

export default async function InvitesPage({ params }: Props) {
  const { slug } = await params;
  const session = await requireSession();

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    notFound();
  }

  // Workspace settings are Brand Admin only (PLATFORM.md §7).
  const actorMember = await getWorkspaceMember(workspace.id, session.user.id);
  if (!actorMember || actorMember.role === WORKSPACE_MEMBER) {
    notFound();
  }

  const canManage = true;
  const canManageAdmin = actorMember.role === WORKSPACE_OWNER;

  const [pendingInvites, activeLinks] = await Promise.all([
    listPendingInvites(workspace.id),
    listActiveInviteLinks(workspace.id),
  ]);

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");

  return (
    <div className="px-8 py-6 space-y-10">
      {canManage && (
        <div className="space-y-6 border-b border-border pb-10">
          <InviteForm
            canInviteAdmin={canManageAdmin}
            workspaceId={workspace.id}
          />
          <div>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-eyebrow text-muted-foreground">
              Shareable invite link
            </h2>
            <InviteLinksList
              appUrl={appUrl}
              canManage={canManage}
              links={activeLinks}
              workspaceId={workspace.id}
            />
            <div className="mt-4">
              <CreateLinkForm
                appUrl={appUrl}
                canCreateAdmin={canManageAdmin}
                workspaceId={workspace.id}
              />
            </div>
          </div>
        </div>
      )}
      <PendingInvitesList
        actorRole={actorMember.role}
        canManage={canManage}
        invites={pendingInvites}
        workspaceId={workspace.id}
      />
    </div>
  );
}
