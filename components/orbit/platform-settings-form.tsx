"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updatePlatformSettingsAction } from "@/app/actions/orbit-settings";
import type { PlatformSettings } from "@/lib/orbit/settings";

interface Props {
  settings: PlatformSettings;
}

export function PlatformSettingsForm({ settings }: Props) {
  const [signupEnabled, setSignupEnabled] = useState(settings.signupEnabled);
  const [maxWorkspaces, setMaxWorkspaces] = useState(
    settings.maxWorkspacesPerUser
  );
  const [maintenanceMode, setMaintenanceMode] = useState(
    settings.maintenanceMode
  );
  const [maintenanceMessage, setMaintenanceMessage] = useState(
    settings.maintenanceMessage ?? ""
  );
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsPending(true);
    const result = await updatePlatformSettingsAction({
      signupEnabled,
      maxWorkspacesPerUser: maxWorkspaces,
      maintenanceMode,
      maintenanceMessage: maintenanceMessage.trim() || null,
    });
    setIsPending(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Settings saved");
    }
  }

  return (
    <form className="space-y-8" onSubmit={handleSubmit}>
      {/* Signup */}
      <section className="border border-border bg-card p-6">
        <h2 className="font-semibold text-sm">Signup</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Control whether new users can create accounts.
        </p>
        <label className="mt-4 flex cursor-pointer items-center gap-3">
          <button
            aria-checked={signupEnabled}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center border-2 border-transparent transition-colors ${
              signupEnabled ? "bg-primary" : "bg-muted"
            }`}
            onClick={() => setSignupEnabled((v) => !v)}
            role="switch"
            type="button"
          >
            <span
              className={`inline-block size-5 bg-white shadow transition-transform ${signupEnabled ? "translate-x-5" : "translate-x-0"}`}
            />
          </button>
          <span className="text-sm font-medium">Allow new user signups</span>
        </label>
        <p className="mt-1 ml-14 text-xs text-muted-foreground">
          Disable to prevent new accounts. Existing users can still sign in.
        </p>
      </section>

      {/* Workspace limit */}
      <section className="border border-border bg-card p-6">
        <h2 className="font-semibold text-sm">Workspace Limit</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          How many workspaces a single user can create.
        </p>
        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-ui text-muted-foreground">
            Max workspaces per user
          </label>
          <input
            className="h-9 w-24 border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            max={100}
            min={1}
            onChange={(e) => setMaxWorkspaces(Number(e.target.value))}
            type="number"
            value={maxWorkspaces}
          />
        </div>
      </section>

      {/* Maintenance mode */}
      <section className="border border-border bg-card p-6">
        <h2 className="font-semibold text-sm">Maintenance Mode</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Show a maintenance page to all non-admin visitors.
        </p>
        <label className="mt-4 flex cursor-pointer items-center gap-3">
          <button
            aria-checked={maintenanceMode}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center border-2 border-transparent transition-colors ${
              maintenanceMode ? "bg-destructive" : "bg-muted"
            }`}
            onClick={() => setMaintenanceMode((v) => !v)}
            role="switch"
            type="button"
          >
            <span
              className={`inline-block size-5 bg-white shadow transition-transform ${maintenanceMode ? "translate-x-5" : "translate-x-0"}`}
            />
          </button>
          <span className="text-sm font-medium">
            Put platform in maintenance mode
          </span>
        </label>

        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-ui text-muted-foreground">
            Maintenance message
          </label>
          <textarea
            className="w-full border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(e) => setMaintenanceMessage(e.target.value)}
            placeholder="We're performing scheduled maintenance. Back soon."
            rows={3}
            value={maintenanceMessage}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Shown to visitors when maintenance mode is on.
          </p>
        </div>
      </section>

      <button
        className="border border-primary bg-primary px-6 py-2.5 text-xs font-semibold uppercase tracking-ui text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Saving…" : "Save Changes"}
      </button>
    </form>
  );
}
