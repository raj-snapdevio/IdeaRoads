"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateNotificationPreferencesAction } from "@/app/actions/notifications";

interface Prefs {
  emailStatusChange: boolean;
  emailNewComment: boolean;
  emailChangelog: boolean;
  inAppStatusChange: boolean;
  inAppNewComment: boolean;
  inAppChangelog: boolean;
}

interface NotificationPreferencesFormProps {
  initialPrefs: Prefs;
}

function PreferenceRow({
  label,
  description,
  emailEnabled,
  inAppEnabled,
  onEmailChange,
  onInAppChange,
  disabled,
}: {
  label: string;
  description: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  onEmailChange: (v: boolean) => void;
  onInAppChange: (v: boolean) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-4 border-b border-border last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="flex items-center gap-6 shrink-0">
        <label className="flex flex-col items-center gap-1 cursor-pointer">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Email
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={emailEnabled}
            onClick={() => onEmailChange(!emailEnabled)}
            disabled={disabled}
            className={`relative inline-flex h-5 w-9 items-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${
              emailEnabled ? "bg-primary" : "bg-muted-foreground/30"
            }`}
          >
            <span
              className={`inline-block size-3.5 bg-white transition-transform ${
                emailEnabled ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
        </label>
        <label className="flex flex-col items-center gap-1 cursor-pointer">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            In-app
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={inAppEnabled}
            onClick={() => onInAppChange(!inAppEnabled)}
            disabled={disabled}
            className={`relative inline-flex h-5 w-9 items-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${
              inAppEnabled ? "bg-primary" : "bg-muted-foreground/30"
            }`}
          >
            <span
              className={`inline-block size-3.5 bg-white transition-transform ${
                inAppEnabled ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
        </label>
      </div>
    </div>
  );
}

export function NotificationPreferencesForm({
  initialPrefs,
}: NotificationPreferencesFormProps) {
  const [prefs, setPrefs] = useState<Prefs>(initialPrefs);
  const [isPending, startTransition] = useTransition();

  function handleChange(key: keyof Prefs, value: boolean) {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);

    startTransition(async () => {
      const result = await updateNotificationPreferencesAction({
        [key]: value,
      });
      if (!result.success) {
        setPrefs(prefs); // rollback
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="border border-border divide-y divide-border">
      <div className="px-4 py-3 bg-muted/40 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Notification type
        </span>
        <div className="flex items-center gap-6 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <span className="w-9 text-center">Email</span>
          <span className="w-9 text-center">In-app</span>
        </div>
      </div>

      <div className="divide-y divide-border px-4">
        <PreferenceRow
          label="Status changes"
          description="When a post you voted on changes status (e.g. Planned, In Progress)"
          emailEnabled={prefs.emailStatusChange}
          inAppEnabled={prefs.inAppStatusChange}
          onEmailChange={(v) => handleChange("emailStatusChange", v)}
          onInAppChange={(v) => handleChange("inAppStatusChange", v)}
          disabled={isPending}
        />
        <PreferenceRow
          label="Comments & Replies"
          description="When someone comments on your post or replies to your comment"
          emailEnabled={prefs.emailNewComment}
          inAppEnabled={prefs.inAppNewComment}
          onEmailChange={(v) => handleChange("emailNewComment", v)}
          onInAppChange={(v) => handleChange("inAppNewComment", v)}
          disabled={isPending}
        />
        <PreferenceRow
          label="Changelog updates"
          description="When a new changelog entry is published for a post you voted on"
          emailEnabled={prefs.emailChangelog}
          inAppEnabled={prefs.inAppChangelog}
          onEmailChange={(v) => handleChange("emailChangelog", v)}
          onInAppChange={(v) => handleChange("inAppChangelog", v)}
          disabled={isPending}
        />
      </div>
    </div>
  );
}
