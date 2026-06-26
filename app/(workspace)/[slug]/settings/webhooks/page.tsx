import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WebhookEndpointsSection } from "@/components/settings/webhook-endpoints-section";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { requireSession } from "@/lib/authz";
import { isEncryptionAvailable } from "@/lib/encrypt";
import { listWebhookEndpoints } from "@/lib/webhooks/queries";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Webhooks — ${slug}` };
}

export default async function WebhooksPage({ params }: Props) {
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

  const endpoints = await listWebhookEndpoints(workspace.id);
  const encryptionAvailable = isEncryptionAvailable();

  return (
    <div className="px-8 py-6 max-w-2xl">
      <WebhookEndpointsSection
        encryptionAvailable={encryptionAvailable}
        endpoints={endpoints.map(({ encryptedSecret: _, ...rest }) => rest)}
        workspaceId={workspace.id}
      />
    </div>
  );
}
