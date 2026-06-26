"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createWebhookEndpointAction,
  deleteWebhookEndpointAction,
  getWebhookSecretAction,
  updateWebhookEndpointAction,
} from "@/app/actions/webhooks";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  ALL_WEBHOOK_EVENTS,
  WEBHOOK_EVENT_LABELS,
  type WebhookEvent,
} from "@/lib/webhooks/events";

interface Endpoint {
  consecutiveFailures: number;
  createdAt: Date;
  disabledReason: string | null;
  events: string[];
  id: string;
  isEnabled: boolean;
  updatedAt: Date;
  url: string;
  workspaceId: string;
}

interface Props {
  encryptionAvailable: boolean;
  endpoints: Endpoint[];
  workspaceId: string;
}

function SecretDisplay({ secret }: { secret: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(secret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="mt-3 flex items-center gap-2 p-2.5 bg-muted border border-border font-mono text-xs break-all">
      <span className="flex-1 select-all">{secret}</span>
      <button
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none"
        onClick={copy}
        type="button"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

interface EndpointFormProps {
  endpointId?: string;
  initialEvents?: string[];
  initialUrl?: string;
  onCancel?: () => void;
  onSuccess: () => void;
  workspaceId: string;
}

function EndpointForm({
  workspaceId,
  onSuccess,
  onCancel,
  initialUrl = "",
  initialEvents = [],
  endpointId,
}: EndpointFormProps) {
  const [url, setUrl] = useState(initialUrl);
  const [events, setEvents] = useState<string[]>(initialEvents);
  const [urlError, setUrlError] = useState("");
  const [isPending, startTransition] = useTransition();

  function toggleEvent(ev: WebhookEvent) {
    setEvents((prev) =>
      prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUrlError("");

    if (!url.startsWith("https://")) {
      setUrlError("URL must start with https://");
      return;
    }
    if (events.length === 0) {
      toast.error("Select at least one event");
      return;
    }

    startTransition(async () => {
      let result: { success: boolean; error?: string; data?: unknown };

      if (endpointId) {
        result = await updateWebhookEndpointAction({
          endpointId,
          workspaceId,
          url,
          events,
        });
      } else {
        result = await createWebhookEndpointAction({
          workspaceId,
          url,
          events,
        });
      }

      if (!result.success) {
        toast.error((result as { error: string }).error);
        return;
      }

      if (endpointId) {
        toast.success("Endpoint updated");
      } else {
        const rawKey = (result as { data: { secret: string } }).data.secret;
        toast.success(`Endpoint created. Secret: ${rawKey}`, {
          duration: 10_000,
          description: "Store this secret now — it won't be shown again.",
        });
      }

      onSuccess();
    });
  }

  return (
    <form
      className="border border-border p-4 space-y-4"
      onSubmit={handleSubmit}
    >
      <p className="text-sm font-medium text-foreground">
        {endpointId ? "Edit endpoint" : "New endpoint"}
      </p>

      <div>
        <label
          className="block text-xs font-medium text-foreground mb-1"
          htmlFor="wh-url"
        >
          URL
        </label>
        <input
          className="w-full h-8 border border-border bg-background px-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          disabled={isPending}
          id="wh-url"
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/webhook"
          required
          type="url"
          value={url}
        />
        {urlError && (
          <p className="mt-1 text-xs text-destructive">{urlError}</p>
        )}
      </div>

      <div>
        <p className="text-xs font-medium text-foreground mb-2">Events</p>
        <div className="grid grid-cols-2 gap-1.5">
          {ALL_WEBHOOK_EVENTS.map((ev) => (
            <label className="flex items-center gap-2 cursor-pointer" key={ev}>
              <input
                checked={events.includes(ev)}
                className="h-3.5 w-3.5 accent-primary"
                disabled={isPending}
                onChange={() => toggleEvent(ev)}
                type="checkbox"
              />
              <span className="text-xs text-foreground">
                {WEBHOOK_EVENT_LABELS[ev]}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            className="px-3.5 py-1.5 text-sm text-muted-foreground hover:text-foreground border border-border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={isPending}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
        )}
        <button
          className="px-3.5 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          disabled={isPending}
          type="submit"
        >
          {isPending
            ? "Saving…"
            : endpointId
              ? "Save changes"
              : "Create endpoint"}
        </button>
      </div>
    </form>
  );
}

export function WebhookEndpointsSection({
  workspaceId,
  endpoints,
  encryptionAvailable,
}: Props) {
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Endpoint | null>(null);
  const [revealedSecret, setRevealedSecret] = useState<{
    id: string;
    secret: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleToggleEnabled(endpoint: Endpoint) {
    startTransition(async () => {
      const result = await updateWebhookEndpointAction({
        endpointId: endpoint.id,
        workspaceId,
        isEnabled: !endpoint.isEnabled,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(
        endpoint.isEnabled ? "Endpoint disabled" : "Endpoint enabled"
      );
      router.refresh();
    });
  }

  function handleRevealSecret(endpoint: Endpoint) {
    startTransition(async () => {
      const result = await getWebhookSecretAction({
        endpointId: endpoint.id,
        workspaceId,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setRevealedSecret({ id: endpoint.id, secret: result.data.secret });
    });
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) {
      return;
    }
    startTransition(async () => {
      const result = await deleteWebhookEndpointAction({
        endpointId: deleteTarget.id,
        workspaceId,
      });
      setDeleteTarget(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Endpoint deleted");
      router.refresh();
    });
  }

  if (!encryptionAvailable) {
    return (
      <div className="border border-border p-6 text-center">
        <p className="text-sm font-medium text-foreground">
          Webhooks unavailable
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          The{" "}
          <code className="text-xs bg-muted px-1 py-0.5">ENCRYPTION_KEY</code>{" "}
          environment variable is not configured. Contact your server
          administrator.
        </p>
      </div>
    );
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Endpoints</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Events are sent as signed POST requests to your HTTPS URL.
          </p>
        </div>
        {!showCreateForm && (
          <button
            className="shrink-0 px-3.5 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setShowCreateForm(true)}
            type="button"
          >
            Add endpoint
          </button>
        )}
      </div>

      {showCreateForm && (
        <div className="mb-4">
          <EndpointForm
            onCancel={() => setShowCreateForm(false)}
            onSuccess={() => {
              setShowCreateForm(false);
              router.refresh();
            }}
            workspaceId={workspaceId}
          />
        </div>
      )}

      {endpoints.length === 0 && !showCreateForm ? (
        <div className="border border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No webhook endpoints configured.
          </p>
        </div>
      ) : (
        <div className="border border-border divide-y divide-border">
          {endpoints.map((ep) => (
            <div key={ep.id}>
              {editingId === ep.id ? (
                <div className="p-4">
                  <EndpointForm
                    endpointId={ep.id}
                    initialEvents={ep.events}
                    initialUrl={ep.url}
                    onCancel={() => setEditingId(null)}
                    onSuccess={() => {
                      setEditingId(null);
                      router.refresh();
                    }}
                    workspaceId={workspaceId}
                  />
                </div>
              ) : (
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate font-mono">
                          {ep.url}
                        </p>
                        <span
                          className={`shrink-0 inline-block px-1.5 py-0.5 text-[10px] font-medium rounded-sm ${
                            ep.isEnabled
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {ep.isEnabled ? "Active" : "Disabled"}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {ep.events.length} event
                        {ep.events.length === 1 ? "" : "s"}
                        {ep.consecutiveFailures > 0 && (
                          <span className="ml-2 text-destructive">
                            {ep.consecutiveFailures} consecutive failure
                            {ep.consecutiveFailures === 1 ? "" : "s"}
                          </span>
                        )}
                      </p>
                      {revealedSecret?.id === ep.id && (
                        <SecretDisplay secret={revealedSecret.secret} />
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        className="px-2.5 py-1 text-xs border border-border hover:bg-muted transition-colors duration-150 focus-visible:outline-none disabled:opacity-50"
                        disabled={isPending}
                        onClick={() => handleRevealSecret(ep)}
                        type="button"
                      >
                        Secret
                      </button>
                      <button
                        className="px-2.5 py-1 text-xs border border-border hover:bg-muted transition-colors duration-150 focus-visible:outline-none disabled:opacity-50"
                        disabled={isPending}
                        onClick={() => setEditingId(ep.id)}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="px-2.5 py-1 text-xs border border-border hover:bg-muted transition-colors duration-150 focus-visible:outline-none disabled:opacity-50"
                        disabled={isPending}
                        onClick={() => handleToggleEnabled(ep)}
                        type="button"
                      >
                        {ep.isEnabled ? "Disable" : "Enable"}
                      </button>
                      <button
                        className="px-2.5 py-1 text-xs text-destructive border border-destructive/30 hover:bg-destructive hover:text-white transition-colors duration-150 focus-visible:outline-none disabled:opacity-50"
                        disabled={isPending}
                        onClick={() => setDeleteTarget(ep)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        confirmLabel="Delete endpoint"
        description={`Delete the webhook endpoint "${deleteTarget?.url ?? ""}"? All delivery history will also be deleted.`}
        isPending={isPending}
        onConfirm={handleDeleteConfirm}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        open={!!deleteTarget}
        title="Delete endpoint"
        variant="destructive"
      />
    </section>
  );
}
