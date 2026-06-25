"use client";

import {
  ArrowRight,
  Bell,
  CornerDownRight,
  FileText,
  Megaphone,
  MessageCircle,
  UserCheck,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import type { NotificationType } from "@/db/schema/notifications";
import type { NotificationRow } from "@/lib/notifications/queries";

const TYPE_ICONS: Record<NotificationType, React.ElementType> = {
  new_post: FileText,
  status_change: ArrowRight,
  new_comment: MessageCircle,
  reply: CornerDownRight,
  invite_accepted: UserCheck,
  member_removed: UserX,
  changelog_published: Megaphone,
};

interface NotificationItemProps {
  notification: NotificationRow;
  onRead: (id: string) => void;
}

export function NotificationItem({
  notification,
  onRead,
}: NotificationItemProps) {
  const Icon = TYPE_ICONS[notification.type as NotificationType] ?? Bell;

  async function handleClick() {
    if (!notification.isRead) {
      onRead(notification.id);
      try {
        await fetch(`/api/notifications/${notification.id}`, {
          method: "PATCH",
        });
      } catch {
        // best-effort
      }
    }
  }

  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
  });

  return (
    <Link
      href={notification.link}
      onClick={handleClick}
      className={`flex items-start gap-3 px-5 py-3.5 border-b border-border transition-colors hover:bg-muted/40 ${
        !notification.isRead ? "bg-primary/[0.03]" : ""
      }`}
    >
      {/* Unread indicator */}
      <span className="mt-1 shrink-0 flex items-center justify-center size-4">
        {!notification.isRead ? (
          <span className="size-2 rounded-full bg-primary" />
        ) : (
          <span className="size-2 rounded-full bg-transparent" />
        )}
      </span>

      {/* Icon */}
      <span className="mt-0.5 shrink-0 flex size-7 items-center justify-center bg-muted text-muted-foreground">
        <Icon className="size-3.5" />
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm leading-snug ${
            !notification.isRead
              ? "font-medium text-foreground"
              : "text-foreground/80"
          }`}
        >
          {notification.title}
        </p>
        {notification.body && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
            {notification.body}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground/60">{timeAgo}</p>
      </div>
    </Link>
  );
}
