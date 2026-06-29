import { OrbitPageHeader } from "@/components/admin/orbit-page-header";
import { AccountSettingsContent } from "@/components/profile/account-settings-content";
import { requireAdmin } from "@/lib/authz";

export const metadata = { title: "Account Settings" };

export default async function OrbitAccountPage() {
  const session = await requireAdmin();

  return (
    <div>
      <OrbitPageHeader
        description="Manage your personal profile, active sessions, and account data."
        eyebrow="Account"
        title="Account Settings"
      />
      <AccountSettingsContent
        currentSessionToken={session.session.token}
        userId={session.user.id}
      />
    </div>
  );
}
