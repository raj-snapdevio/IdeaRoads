import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/authz";
import { listMembers } from "@/lib/workspaces/members";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";
import { MembersTable } from "./_components/members-table";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Members — ${slug}` };
}

export default async function MembersPage({ params }: Props) {
  const { slug } = await params;
  const session = await requireSession();

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) notFound();

  const actorMember = await getWorkspaceMember(workspace.id, session.user.id);
  if (!actorMember) notFound();

  const members = await listMembers(workspace.id);

  return (
    <div className="px-8 py-6">
      <p className="mb-4 text-xs font-semibold uppercase tracking-eyebrow text-muted-foreground">
        {members.length} {members.length === 1 ? "member" : "members"}
      </p>
      <MembersTable
        members={members}
        actorMemberId={actorMember.id}
        actorUserId={session.user.id}
        actorRole={actorMember.role}
        workspaceId={workspace.id}
      />
    </div>
  );
}
