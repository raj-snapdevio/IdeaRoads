import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiKeysSection } from "@/components/settings/api-keys-section";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { listApiKeys } from "@/lib/api-keys/queries";
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
  return { title: `API Keys — ${slug}` };
}

export default async function ApiKeysPage({ params }: Props) {
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

  const keys = await listApiKeys(workspace.id);

  return (
    <div className="px-8 py-6 max-w-2xl">
      <ApiKeysSection keys={keys} workspaceId={workspace.id} />
    </div>
  );
}
