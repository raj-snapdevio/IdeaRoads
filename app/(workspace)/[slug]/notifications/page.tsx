import { notFound } from "next/navigation";
import { requireSession } from "@/lib/authz";
import { NotificationList } from "@/components/notifications/notification-list";
import {
  listNotifications,
  markAllNotificationsAsRead,
} from "@/lib/notifications/queries";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function NotificationsPage({ params }: Props) {
  const { slug } = await params;
  const session = await requireSession();

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) notFound();

  const member = await getWorkspaceMember(workspace.id, session.user.id);
  if (!member) notFound();

  // Mark all as read for this workspace server-side on page load
  await markAllNotificationsAsRead(session.user.id, workspace.id);

  const { items, total, hasMore } = await listNotifications(session.user.id, {
    page: 1,
    limit: 30,
  });

  return (
    <div className="flex flex-col min-h-full">
      <div className="max-w-2xl w-full mx-auto">
        <NotificationList
          initialItems={items}
          hasMore={hasMore}
          total={total}
          workspaceId={workspace.id}
        />
      </div>
    </div>
  );
}
