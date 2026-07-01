"use client";

import {
  ArrowLeft,
  Buildings,
  ChartBar,
  Envelope,
  Flag,
  Gauge,
  Scroll,
  SignOut,
  UserCircle,
  Users,
  Wrench,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PRODUCT_NAME } from "@/config/platform";
import { signOut } from "@/lib/auth-client";

const navItems = [
  { href: "/orbit", label: "Overview", icon: ChartBar, exact: true },
  {
    href: "/orbit/workspaces",
    label: "Workspaces",
    icon: Buildings,
    exact: false,
  },
  { href: "/orbit/users", label: "Users", icon: Users, exact: false },
  {
    href: "/orbit/feature-flags",
    label: "Feature Flags",
    icon: Flag,
    exact: false,
  },
  { href: "/orbit/settings", label: "Settings", icon: Wrench, exact: false },
  { href: "/orbit/jobs", label: "Job Queue", icon: Gauge, exact: false },
  { href: "/orbit/audit-log", label: "Audit Log", icon: Scroll, exact: false },
  { href: "/orbit/email", label: "Email", icon: Envelope, exact: false },
  { href: "/orbit/account", label: "Account", icon: UserCircle, exact: true },
];

const navLinkClass = (isActive: boolean) =>
  `flex cursor-pointer items-center gap-3 border-l-2 px-3 py-2.5 text-xs font-semibold uppercase tracking-ui transition-colors ${
    isActive
      ? "border-sidebar-foreground bg-sidebar-accent text-sidebar-foreground"
      : "border-transparent text-sidebar-foreground/50 hover:border-sidebar-foreground/20 hover:bg-sidebar-accent hover:text-sidebar-foreground"
  }`;

export function AdminSidebar({
  email,
  workspaceSlug,
}: {
  email: string;
  workspaceSlug?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
        <span className="grid size-9 shrink-0 place-items-center bg-sidebar-primary font-black text-sidebar-primary-foreground text-xs">
          KR
        </span>
        <div className="min-w-0">
          <p className="font-black text-sm leading-none">{PRODUCT_NAME}</p>
          <p className="mt-1 text-2xs font-semibold uppercase tracking-ui text-sidebar-foreground/40">
            Orbit Admin
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <p className="mb-2 px-3 text-2xs font-semibold uppercase tracking-ui text-sidebar-foreground/30">
          Navigation
        </p>
        <div className="space-y-0.5">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact
              ? pathname === href
              : pathname.startsWith(href);
            return (
              <Link className={navLinkClass(isActive)} href={href} key={href}>
                <Icon size={15} weight={isActive ? "fill" : "regular"} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border">
        {/* My Workspace quick link */}
        {workspaceSlug && (
          <div className="border-b border-sidebar-border px-2 py-1.5">
            <Link
              className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-xs font-semibold text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href={`/${workspaceSlug}`}
            >
              <ArrowLeft className="size-3.5 shrink-0" size={13} />
              <span>My Workspace</span>
            </Link>
          </div>
        )}

        {/* Compact user bar */}
        <div className="p-3">
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
            <button
              className="flex cursor-pointer items-center justify-center text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={async () => {
                await signOut();
                router.push("/signin");
              }}
              title="Sign out"
              type="button"
            >
              <SignOut size={14} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
