import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccountSettingsContent } from "@/components/profile/account-settings-content";
import { requireSession } from "@/lib/authz";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Account Settings — ${slug}` };
}

export default async function WorkspaceAccountPage({ params }: Props) {
  const { slug } = await params;
  const session = await requireSession();

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) notFound();

  const member = await getWorkspaceMember(workspace.id, session.user.id);
  if (!member) notFound();

  return (
    <div>
      <div className="border-b border-border px-8 py-6">
        <h1 className="text-xl font-semibold text-foreground">
          Account Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your personal profile, active sessions, and account data.
        </p>
      </div>
      <div className="px-8 py-6">
        <AccountSettingsContent
          currentSessionToken={session.session.token}
          userId={session.user.id}
        />
      </div>
    </div>
  );
}
