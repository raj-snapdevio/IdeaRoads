import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { requireAdmin } from "@/lib/authz";
import { getFirstUserWorkspace } from "@/lib/workspaces/queries";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireAdmin();
  const workspace = await getFirstUserWorkspace(session.user.id);

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <AdminSidebar
        email={session.user.email}
        workspaceSlug={workspace?.slug}
      />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
