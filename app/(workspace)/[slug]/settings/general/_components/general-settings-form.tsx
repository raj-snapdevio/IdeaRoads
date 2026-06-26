"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  deleteWorkspaceAction,
  updateWorkspaceInfoAction,
  updateWorkspaceSettingsAction,
} from "@/app/actions/workspace-settings";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface GeneralSettingsFormProps {
  canManage: boolean;
  changelogPublic: boolean;
  isOwner: boolean;
  roadmapPublic: boolean;
  workspaceDescription: string;
  workspaceId: string;
  workspaceLogoUrl: string;
  workspaceName: string;
  workspaceSlug: string;
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-4 border-b border-border last:border-0 px-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        aria-checked={checked}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed ${
          checked ? "bg-primary" : "bg-muted"
        }`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        role="switch"
        type="button"
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function FormField({
  label,
  htmlFor,
  description,
  children,
  error,
}: {
  label: string;
  htmlFor: string;
  description?: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-4 py-3 border-b border-border last:border-0">
      <div>
        <label
          className="block text-sm font-medium text-foreground mt-0.5"
          htmlFor={htmlFor}
        >
          {label}
        </label>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div>
        {children}
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}

export function GeneralSettingsForm({
  workspaceId,
  workspaceSlug,
  workspaceName,
  workspaceDescription,
  workspaceLogoUrl,
  roadmapPublic,
  changelogPublic,
  canManage,
  isOwner,
}: GeneralSettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Info form state
  const [name, setName] = useState(workspaceName);
  const [slug, setSlug] = useState(workspaceSlug);
  const [description, setDescription] = useState(workspaceDescription);
  const [logoUrl, setLogoUrl] = useState(workspaceLogoUrl);
  const [infoErrors, setInfoErrors] = useState<Record<string, string>>({});

  // Delete workspace state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [isDeleting, startDeleteTransition] = useTransition();

  const appUrl =
    typeof window === "undefined"
      ? (process.env.NEXT_PUBLIC_APP_URL ?? "")
      : window.location.origin;

  function handleRoadmapToggle(value: boolean) {
    startTransition(async () => {
      const result = await updateWorkspaceSettingsAction({
        workspaceId,
        roadmapPublic: value,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(
        value ? "Public roadmap enabled" : "Public roadmap disabled"
      );
      router.refresh();
    });
  }

  function handleChangelogToggle(value: boolean) {
    startTransition(async () => {
      const result = await updateWorkspaceSettingsAction({
        workspaceId,
        changelogPublic: value,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(
        value ? "Public changelog enabled" : "Public changelog disabled"
      );
      router.refresh();
    });
  }

  function handleSaveInfo(e: React.FormEvent) {
    e.preventDefault();
    setInfoErrors({});

    startTransition(async () => {
      const result = await updateWorkspaceInfoAction({
        workspaceId,
        name: name.trim() === workspaceName ? undefined : name.trim(),
        slug: slug.trim() === workspaceSlug ? undefined : slug.trim(),
        description:
          description.trim() === workspaceDescription
            ? undefined
            : description.trim() || null,
        logoUrl:
          logoUrl.trim() === workspaceLogoUrl
            ? undefined
            : logoUrl.trim() || null,
      });

      if (!result.success) {
        if (result.field) {
          setInfoErrors({ [result.field]: result.error });
        } else {
          toast.error(result.error);
        }
        return;
      }

      toast.success("Workspace info saved");

      // If slug changed, navigate to new URL
      if (result.data.newSlug && result.data.newSlug !== workspaceSlug) {
        router.push(`/${result.data.newSlug}/settings/general`);
      } else {
        router.refresh();
      }
    });
  }

  function handleDeleteConfirm() {
    startDeleteTransition(async () => {
      const result = await deleteWorkspaceAction({
        workspaceId,
        workspaceSlug,
        confirmName: deleteConfirmName,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Workspace deleted");
      router.push("/onboarding");
    });
  }

  const inputClass =
    "w-full h-8 border border-border bg-background px-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed";

  const btnPrimary =
    "px-3.5 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="px-8 py-6 max-w-2xl space-y-10">
      {/* Workspace Info */}
      <section>
        <SectionHeader
          description="Update your workspace name, URL, and branding."
          title="Workspace info"
        />
        <form onSubmit={handleSaveInfo}>
          <div className="border border-border p-4">
            <FormField error={infoErrors.name} htmlFor="ws-name" label="Name">
              <input
                className={inputClass}
                disabled={!canManage || isPending}
                id="ws-name"
                maxLength={64}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Workspace"
                value={name}
              />
            </FormField>

            <FormField
              description="Changing this updates all existing links."
              error={infoErrors.slug}
              htmlFor="ws-slug"
              label="URL"
            >
              <div className="flex items-center">
                <span className="inline-flex h-8 items-center border border-r-0 border-border bg-muted px-2.5 text-xs text-muted-foreground shrink-0">
                  {appUrl}/
                </span>
                <input
                  className={`${inputClass} flex-1`}
                  disabled={!canManage || isPending}
                  id="ws-slug"
                  maxLength={48}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  pattern="[a-z0-9][a-z0-9\-]*[a-z0-9]"
                  placeholder="my-workspace"
                  value={slug}
                />
              </div>
            </FormField>

            <FormField
              error={infoErrors.description}
              htmlFor="ws-description"
              label="Description"
            >
              <textarea
                className="w-full border border-border bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                disabled={!canManage || isPending}
                id="ws-description"
                maxLength={300}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of your workspace…"
                rows={3}
                value={description}
              />
              <p className="mt-1 text-xs text-muted-foreground text-right">
                {description.length}/300
              </p>
            </FormField>

            <FormField
              description="Link to a publicly accessible image."
              error={infoErrors.logoUrl}
              htmlFor="ws-logo"
              label="Logo URL"
            >
              <input
                className={inputClass}
                disabled={!canManage || isPending}
                id="ws-logo"
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                type="url"
                value={logoUrl}
              />
            </FormField>
          </div>

          {canManage && (
            <div className="mt-3 flex justify-end">
              <button className={btnPrimary} disabled={isPending} type="submit">
                {isPending ? "Saving…" : "Save changes"}
              </button>
            </div>
          )}
        </form>
      </section>

      {/* Visibility */}
      <section>
        <SectionHeader
          description="Control what the public can see."
          title="Visibility"
        />
        <div className="border border-border">
          <ToggleRow
            checked={roadmapPublic}
            description={`Show your roadmap at ${appUrl}/${workspaceSlug}/roadmap.`}
            disabled={isPending || !canManage}
            label="Public Roadmap"
            onChange={handleRoadmapToggle}
          />
          <ToggleRow
            checked={changelogPublic}
            description={`Show your changelog at ${appUrl}/${workspaceSlug}/changelog.`}
            disabled={isPending || !canManage}
            label="Public Changelog"
            onChange={handleChangelogToggle}
          />
        </div>
      </section>

      {/* Danger zone */}
      {isOwner && (
        <section>
          <SectionHeader
            description="Irreversible and destructive actions."
            title="Danger zone"
          />
          <div className="border border-destructive/30 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Delete workspace
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Permanently delete this workspace and all its data. This
                  cannot be undone.
                </p>
              </div>
              <button
                className="shrink-0 px-3.5 py-1.5 text-sm font-medium text-destructive border border-destructive/40 hover:bg-destructive hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setShowDeleteDialog(true)}
                type="button"
              >
                Delete workspace
              </button>
            </div>
          </div>
        </section>
      )}

      {!canManage && (
        <p className="text-xs text-muted-foreground">
          Only owners and admins can change workspace settings.
        </p>
      )}
      <ConfirmDialog
        cancelLabel="Cancel"
        confirmLabel="Delete workspace"
        description={`This will permanently delete "${workspaceName}" and all its boards, posts, comments, and members. Type the workspace name to confirm.`}
        isPending={isDeleting}
        onConfirm={handleDeleteConfirm}
        onOpenChange={(open) => {
          setShowDeleteDialog(open);
          if (!open) {
            setDeleteConfirmName("");
          }
        }}
        open={showDeleteDialog}
        title="Delete workspace"
        variant="destructive"
      >
        <input
          autoComplete="off"
          className="mt-3 w-full h-8 border border-border bg-background px-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(e) => setDeleteConfirmName(e.target.value)}
          placeholder={workspaceName}
          value={deleteConfirmName}
        />
      </ConfirmDialog>
    </div>
  );
}
