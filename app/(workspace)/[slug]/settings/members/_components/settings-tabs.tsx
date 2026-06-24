"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SettingsTabs({ slug }: { slug: string }) {
  const pathname = usePathname();
  const invitesHref = `/${slug}/settings/members/invites`;
  const membersHref = `/${slug}/settings/members`;

  const tabs = [
    { label: "Members", href: membersHref },
    { label: "Invites", href: invitesHref },
  ];

  return (
    <div className="flex gap-0 border-b border-border px-8">
      {tabs.map((tab) => {
        const isActive =
          tab.href === invitesHref
            ? pathname.startsWith(invitesHref)
            : pathname === membersHref || !pathname.startsWith(invitesHref);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors duration-150 ${
              isActive
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
