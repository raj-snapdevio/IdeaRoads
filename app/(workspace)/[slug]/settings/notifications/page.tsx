import { notFound } from "next/navigation";
import { requireSession } from "@/lib/authz";
import { getNotificationPreferences } from "@/lib/notifications/queries";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";
import { NotificationPreferencesForm } from "./_components/notification-preferences-form";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function NotificationPreferencesPage({ params }: Props) {
  const { slug } = await params;
  const session = await requireSession();

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) notFound();

  const member = await getWorkspaceMember(workspace.id, session.user.id);
  if (!member) notFound();

  const prefs = await getNotificationPreferences(session.user.id);

  const defaults = {
    emailStatusChange: prefs?.emailStatusChange ?? true,
    emailNewComment: prefs?.emailNewComment ?? true,
    emailChangelog: prefs?.emailChangelog ?? true,
    inAppStatusChange: prefs?.inAppStatusChange ?? true,
    inAppNewComment: prefs?.inAppNewComment ?? true,
    inAppChangelog: prefs?.inAppChangelog ?? true,
  };

  return (
    <div className="px-8 py-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-base font-semibold text-foreground">
          Notification Preferences
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Control which notifications you receive via email and in-app.
        </p>
      </div>
      <NotificationPreferencesForm initialPrefs={defaults} />
    </div>
  );
}
