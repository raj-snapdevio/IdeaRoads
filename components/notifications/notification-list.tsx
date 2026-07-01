"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { NotificationEmptyState } from "@/components/notifications/notification-empty-state";
import { NotificationItem } from "@/components/notifications/notification-item";
import type { NotificationRow } from "@/lib/notifications/queries";

interface NotificationListProps {
  hasMore: boolean;
  initialItems: NotificationRow[];
  total: number;
  workspaceId: string;
}

export function NotificationList({
  initialItems,
  hasMore: initialHasMore,
  total,
  workspaceId,
}: NotificationListProps) {
  const [items, setItems] = useState<NotificationRow[]>(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  function handleRead(id: string) {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      try {
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId }),
        });
        setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
        toast.success("All notifications marked as read");
      } catch {
        toast.error("Failed to mark all as read");
      }
    });
  }

  function handleLoadMore() {
    startTransition(async () => {
      try {
        const nextPage = page + 1;
        const res = await fetch(`/api/notifications?page=${nextPage}&limit=30`);
        if (!res.ok) {
          throw new Error();
        }
        const data = await res.json();
        setItems((prev) => [...prev, ...data.notifications]);
        setHasMore(data.hasMore);
        setPage(nextPage);
      } catch {
        toast.error("Failed to load more notifications");
      }
    });
  }

  const unreadCount = items.filter((n) => !n.isRead).length;

  // Group notifications by recency (Today / This week / Earlier). Items arrive
  // already sorted newest-first, so each group preserves that order.
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const startOfWeek = startOfToday - 6 * 24 * 60 * 60 * 1000;
  const groups: { label: string; items: NotificationRow[] }[] = [
    { label: "Today", items: [] },
    { label: "This week", items: [] },
    { label: "Earlier", items: [] },
  ];
  for (const n of items) {
    const t = new Date(n.createdAt).getTime();
    if (t >= startOfToday) {
      groups[0].items.push(n);
    } else if (t >= startOfWeek) {
      groups[1].items.push(n);
    } else {
      groups[2].items.push(n);
    }
  }
  const visibleGroups = groups.filter((g) => g.items.length > 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h1 className="text-base font-semibold text-foreground">
            Notifications
          </h1>
          {total > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {total} notification{total === 1 ? "" : "s"}
              {unreadCount > 0 && (
                <span className="ml-1.5 text-primary font-medium">
                  · {unreadCount} unread
                </span>
              )}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            disabled={isPending}
            onClick={handleMarkAllRead}
            type="button"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* List */}
      {items.length === 0 ? (
        <NotificationEmptyState />
      ) : (
        <div>
          {visibleGroups.map((group) => (
            <div key={group.label}>
              <p className="px-5 pt-4 pb-1.5 text-2xs font-semibold uppercase tracking-eyebrow text-muted-foreground/60">
                {group.label}
              </p>
              {group.items.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={handleRead}
                />
              ))}
            </div>
          ))}

          {hasMore && (
            <div className="px-5 py-4 text-center">
              <button
                className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                disabled={isPending}
                onClick={handleLoadMore}
                type="button"
              >
                {isPending ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
