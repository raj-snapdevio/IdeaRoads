import {
  Bell,
  CircleDot,
  Key,
  LayoutGrid,
  LogOut,
  Map,
  Megaphone,
  ScrollText,
  Settings,
  Shield,
  Sliders,
  Tag,
  Webhook,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { boards } from "@/db/schema";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { getUnreadCount } from "@/lib/notifications/queries";
import { NotificationBell } from "@/components/notifications/notification-bell";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function WorkspaceLayout({
  children,
  params,
}: WorkspaceLayoutProps) {
  const { slug } = await params;

  const session = await requireSession();

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    notFound();
  }

  if (workspace.isSuspended) {
    redirect("/onboarding?error=suspended");
  }

  const member = await getWorkspaceMember(workspace.id, session.user.id);
  if (!member) {
    notFound();
  }

  const workspaceBoards = await db
    .select({ id: boards.id, slug: boards.slug, name: boards.name })
    .from(boards)
    .where(eq(boards.workspaceId, workspace.id))
    .orderBy(boards.displayOrder);

  const isAdminOrOwner = member.role !== WORKSPACE_MEMBER;
  const initial = workspace.name.charAt(0).toUpperCase();
  const email = session.user.email;
  const unreadCount = await getUnreadCount(session.user.id);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col bg-sidebar border-r border-sidebar-border">
        {/* Workspace header */}
        <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
          <div className="flex size-7 shrink-0 items-center justify-center bg-primary text-primary-foreground">
            <span className="text-xs font-black">{initial}</span>
          </div>
          <Link
            className="truncate text-sm font-semibold text-sidebar-foreground hover:text-sidebar-foreground/80 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href={`/${workspace.slug}`}
            title={workspace.name}
          >
            {workspace.name}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col overflow-y-auto p-2">
          <div className="space-y-0.5">
            <p className="px-2 pb-1 pt-2 text-2xs font-semibold uppercase tracking-eyebrow text-sidebar-foreground/40">
              Feedback
            </p>
            {workspaceBoards.map((board) => (
              <Link
                key={board.id}
                className="flex items-center gap-2 px-2 py-1.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                href={`/${workspace.slug}/b/${board.slug}`}
              >
                <LayoutGrid className="size-4 shrink-0" />
                <span className="truncate">{board.name}</span>
              </Link>
            ))}
          </div>

          <div className="mt-4 space-y-0.5">
            <p className="px-2 pb-1 pt-2 text-2xs font-semibold uppercase tracking-eyebrow text-sidebar-foreground/40">
              Publish
            </p>
            <Link
              className="flex items-center gap-2 px-2 py-1.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href={`/${workspace.slug}/roadmap`}
            >
              <Map className="size-4 shrink-0" />
              <span className="truncate">Roadmap</span>
            </Link>
            <Link
              className="flex items-center gap-2 px-2 py-1.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href={`/${workspace.slug}/changelog`}
            >
              <Megaphone className="size-4 shrink-0" />
              <span className="truncate">Changelog</span>
            </Link>
          </div>

          {/* <div className="mt-4 space-y-0.5">
            <NotificationBell
              workspaceSlug={workspace.slug}
              initialCount={unreadCount}
            />
          </div> */}

          {/* Settings */}
          <div className="border-t border-sidebar-border space-y-0.5">
            <p className="px-2 pb-1 pt-1.5 text-2xs font-semibold uppercase tracking-eyebrow text-sidebar-foreground/40">
              Settings
            </p>
            <Link
              className="flex items-center gap-2 px-2 py-1.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href={`/${workspace.slug}/settings/general`}
            >
              <Sliders className="size-4 shrink-0" />
              <span className="truncate">General</span>
            </Link>
            <Link
              className="flex items-center gap-2 px-2 py-1.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href={`/${workspace.slug}/settings/members`}
            >
              <Settings className="size-4 shrink-0" />
              <span className="truncate">Members</span>
            </Link>
            <Link
              className="flex items-center gap-2 px-2 py-1.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href={`/${workspace.slug}/settings/categories`}
            >
              <Tag className="size-4 shrink-0" />
              <span className="truncate">Categories</span>
            </Link>
            <Link
              className="flex items-center gap-2 px-2 py-1.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href={`/${workspace.slug}/settings/statuses`}
            >
              <CircleDot className="size-4 shrink-0" />
              <span className="truncate">Statuses</span>
            </Link>
            <Link
              className="flex items-center gap-2 px-2 py-1.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href={`/${workspace.slug}/settings/notifications`}
            >
              <Bell className="size-4 shrink-0" />
              <span className="truncate">Notifications</span>
            </Link>
            {isAdminOrOwner && (
              <>
                <Link
                  className="flex items-center gap-2 px-2 py-1.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  href={`/${workspace.slug}/settings/moderation`}
                >
                  <Shield className="size-4 shrink-0" />
                  <span className="truncate">Moderation</span>
                </Link>
                <Link
                  className="flex items-center gap-2 px-2 py-1.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  href={`/${workspace.slug}/settings/webhooks`}
                >
                  <Webhook className="size-4 shrink-0" />
                  <span className="truncate">Webhooks</span>
                </Link>
                <Link
                  className="flex items-center gap-2 px-2 py-1.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  href={`/${workspace.slug}/settings/api-keys`}
                >
                  <Key className="size-4 shrink-0" />
                  <span className="truncate">API Keys</span>
                </Link>
                <Link
                  className="flex items-center gap-2 px-2 py-1.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  href={`/${workspace.slug}/settings/audit-log`}
                >
                  <ScrollText className="size-4 shrink-0" />
                  <span className="truncate">Audit Log</span>
                </Link>
              </>
            )}
          </div>
        </nav>

        {/* User bar */}
        <hr />
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 shrink-0 items-center justify-center bg-sidebar-accent text-sidebar-foreground text-xs font-semibold">
              {email.charAt(0).toUpperCase()}
            </div>
            <span
              className="flex-1 truncate text-xs text-sidebar-foreground/60"
              title={email}
            >
              {email}
            </span>
            <form action={logoutAction}>
              <button
                className="flex items-center justify-center text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title="Sign out"
                type="submit"
              >
                <LogOut className="size-3.5" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-y-auto bg-background">
        {children}
      </main>
    </div>
  );
}
