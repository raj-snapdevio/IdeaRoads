"use client";

import {
  Bell,
  CircleDot,
  LayoutGrid,
  LogOut,
  Map as MapIcon,
  Megaphone,
  ScrollText,
  Shield,
  Sliders,
  Tag,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { WorkspaceSwitcher } from "@/components/workspace/workspace-switcher";

interface Board {
  id: string;
  name: string;
  slug: string;
}

interface WorkspaceOption {
  name: string;
  slug: string;
}

interface WorkspaceSidebarProps {
  boards: Board[];
  email: string;
  initialUnreadCount?: number;
  isAdminOrOwner: boolean;
  isOrbitAdmin: boolean;
  workspaceName: string;
  workspaceSlug: string;
  workspaces: WorkspaceOption[];
}

export function WorkspaceSidebar({
  boards,
  email,
  initialUnreadCount = 0,
  isAdminOrOwner,
  isOrbitAdmin,
  workspaceName,
  workspaceSlug,
  workspaces,
}: WorkspaceSidebarProps) {
  const pathname = usePathname();

  const link = (href: string) => {
    const isActive = pathname.startsWith(href);
    return `flex cursor-pointer items-center gap-2 border-l-2 px-2 py-1.5 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
      isActive
        ? "border-sidebar-foreground bg-sidebar-accent font-medium text-sidebar-foreground"
        : "border-transparent text-sidebar-foreground/70 hover:border-sidebar-foreground/20 hover:bg-sidebar-accent hover:text-sidebar-foreground"
    }`;
  };

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Workspace switcher */}
      <WorkspaceSwitcher
        currentName={workspaceName}
        currentSlug={workspaceSlug}
        workspaces={workspaces}
      />

      {/* Navigation */}
      <nav className="flex flex-1 flex-col overflow-y-auto p-2">
        {/* Notifications inbox */}
        <div className="space-y-0.5">
          <NotificationBell
            initialCount={initialUnreadCount}
            workspaceSlug={workspaceSlug}
          />
        </div>

        {/* Feedback */}
        <div className="mt-4 space-y-0.5">
          <p className="px-2 pb-1 pt-2 text-2xs font-semibold uppercase tracking-eyebrow text-sidebar-foreground/40">
            Feedback
          </p>
          {boards.map((board) => (
            <Link
              className={link(`/${workspaceSlug}/b/${board.slug}`)}
              href={`/${workspaceSlug}/b/${board.slug}`}
              key={board.id}
            >
              <LayoutGrid className="size-4 shrink-0" />
              <span className="truncate">{board.name}</span>
            </Link>
          ))}
        </div>

        {/* Publish */}
        <div className="mt-4 space-y-0.5">
          <p className="px-2 pb-1 pt-2 text-2xs font-semibold uppercase tracking-eyebrow text-sidebar-foreground/40">
            Publish
          </p>
          <Link
            className={link(`/${workspaceSlug}/roadmap`)}
            href={`/${workspaceSlug}/roadmap`}
          >
            <MapIcon className="size-4 shrink-0" />
            <span className="truncate">Roadmap</span>
          </Link>
          <Link
            className={link(`/${workspaceSlug}/settings/changelog`)}
            href={`/${workspaceSlug}/settings/changelog`}
          >
            <Megaphone className="size-4 shrink-0" />
            <span className="truncate">Changelog</span>
          </Link>
        </div>

        {/* Settings */}
        <div className="mt-2 space-y-0.5 border-t border-sidebar-border">
          <p className="px-2 pb-1 pt-1.5 text-2xs font-semibold uppercase tracking-eyebrow text-sidebar-foreground/40">
            Settings
          </p>
          {isAdminOrOwner && (
            <>
              <Link
                className={link(`/${workspaceSlug}/settings/general`)}
                href={`/${workspaceSlug}/settings/general`}
              >
                <Sliders className="size-4 shrink-0" />
                <span className="truncate">General</span>
              </Link>
              <Link
                className={link(`/${workspaceSlug}/settings/boards`)}
                href={`/${workspaceSlug}/settings/boards`}
              >
                <LayoutGrid className="size-4 shrink-0" />
                <span className="truncate">Boards</span>
              </Link>
              <Link
                className={link(`/${workspaceSlug}/settings/members`)}
                href={`/${workspaceSlug}/settings/members`}
              >
                <Users className="size-4 shrink-0" />
                <span className="truncate">Members</span>
              </Link>
              <Link
                className={link(`/${workspaceSlug}/settings/categories`)}
                href={`/${workspaceSlug}/settings/categories`}
              >
                <Tag className="size-4 shrink-0" />
                <span className="truncate">Categories</span>
              </Link>
              <Link
                className={link(`/${workspaceSlug}/settings/statuses`)}
                href={`/${workspaceSlug}/settings/statuses`}
              >
                <CircleDot className="size-4 shrink-0" />
                <span className="truncate">Statuses</span>
              </Link>
              <Link
                className={link(`/${workspaceSlug}/settings/moderation`)}
                href={`/${workspaceSlug}/settings/moderation`}
              >
                <Shield className="size-4 shrink-0" />
                <span className="truncate">Moderation</span>
              </Link>
              {/* Webhooks and API Keys settings are hidden until outbound
                  webhook delivery and API-key authentication are implemented
                  (deferred — see Phase E). */}
              <Link
                className={link(`/${workspaceSlug}/settings/audit-log`)}
                href={`/${workspaceSlug}/settings/audit-log`}
              >
                <ScrollText className="size-4 shrink-0" />
                <span className="truncate">Audit Log</span>
              </Link>
            </>
          )}
          <Link
            className={link(`/${workspaceSlug}/settings/notifications`)}
            href={`/${workspaceSlug}/settings/notifications`}
          >
            <Bell className="size-4 shrink-0" />
            <span className="truncate">Notification Preferences</span>
          </Link>
          <Link
            className={link(`/${workspaceSlug}/settings/account`)}
            href={`/${workspaceSlug}/settings/account`}
          >
            <User className="size-4 shrink-0" />
            <span className="truncate">Account</span>
          </Link>
        </div>
      </nav>

      {/* Orbit Admin quick link (admins only) */}
      {isOrbitAdmin && (
        <div className="border-t border-sidebar-border px-2 py-1.5">
          <Link
            className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-xs font-semibold text-sidebar-foreground/50 transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href="/orbit"
          >
            <Shield className="size-3.5 shrink-0" />
            <span>Orbit Admin</span>
          </Link>
        </div>
      )}

      {/* User bar */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center bg-sidebar-accent text-xs font-semibold text-sidebar-foreground">
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
              className="flex cursor-pointer items-center justify-center text-sidebar-foreground/40 transition-colors duration-150 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title="Sign out"
              type="submit"
            >
              <LogOut className="size-3.5" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
