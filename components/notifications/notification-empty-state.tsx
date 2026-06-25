import { Bell } from "lucide-react";

export function NotificationEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted mb-4">
        <Bell className="size-6 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">
        No notifications yet
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
        When posts you've voted on get updates, or when someone comments on your
        posts, you'll see them here.
      </p>
    </div>
  );
}
