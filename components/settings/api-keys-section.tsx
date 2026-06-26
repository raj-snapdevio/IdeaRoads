"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  generateApiKeyAction,
  revokeApiKeyAction,
} from "@/app/actions/api-keys";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface ApiKey {
  createdAt: Date;
  id: string;
  isEnabled: boolean;
  lastUsedAt: Date | null;
  name: string;
}

interface Props {
  keys: ApiKey[];
  workspaceId: string;
}

function NewKeyDisplay({ rawKey }: { rawKey: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(rawKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="mt-4 border border-border bg-muted/50 p-4">
      <p className="text-sm font-medium text-foreground mb-1">
        Your new API key — copy it now
      </p>
      <p className="text-xs text-muted-foreground mb-3">
        This key will not be shown again. Store it securely.
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs text-foreground break-all bg-background border border-border px-2.5 py-2">
          {rawKey}
        </code>
        <button
          className="shrink-0 px-3 py-2 text-xs font-medium border border-border hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={copy}
          type="button"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export function ApiKeysSection({ workspaceId, keys }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setNameError("");
    setNewKey(null);

    if (!name.trim()) {
      setNameError("Name is required.");
      return;
    }

    startTransition(async () => {
      const result = await generateApiKeyAction({
        workspaceId,
        name: name.trim(),
      });

      if (!result.success) {
        setNameError(result.error);
        return;
      }

      setNewKey(result.data.rawKey);
      setName("");
      router.refresh();
    });
  }

  function handleRevokeConfirm() {
    if (!revokeTarget) {
      return;
    }
    startTransition(async () => {
      const result = await revokeApiKeyAction({
        keyId: revokeTarget.id,
        workspaceId,
      });
      setRevokeTarget(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`API key "${revokeTarget.name}" revoked`);
      router.refresh();
    });
  }

  const fmt = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

  return (
    <section>
      {/* Create form */}
      <div className="mb-6">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-foreground">Create key</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Keys are prefixed with <code className="text-xs">ir_live_</code> and
            grant workspace-level access.
          </p>
        </div>

        <form className="border border-border p-4" onSubmit={handleGenerate}>
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                className="w-full h-8 border border-border bg-background px-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                disabled={isPending}
                maxLength={64}
                onChange={(e) => setName(e.target.value)}
                placeholder="Key name (e.g. CI pipeline)"
                type="text"
                value={name}
              />
              {nameError && (
                <p className="mt-1 text-xs text-destructive">{nameError}</p>
              )}
            </div>
            <button
              className="shrink-0 px-3.5 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isPending || !name.trim()}
              type="submit"
            >
              {isPending ? "Creating…" : "Create key"}
            </button>
          </div>
        </form>

        {newKey && <NewKeyDisplay rawKey={newKey} />}
      </div>

      {/* Keys list */}
      <div>
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-foreground">Active keys</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {keys.length} key{keys.length === 1 ? "" : "s"} total
          </p>
        </div>

        {keys.length === 0 ? (
          <div className="border border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No API keys created yet.
            </p>
          </div>
        ) : (
          <div className="border border-border divide-y divide-border">
            {keys.map((key) => (
              <div className="flex items-center gap-4 p-4" key={key.id}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {key.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Created {fmt.format(new Date(key.createdAt))}
                    {key.lastUsedAt
                      ? ` · Last used ${fmt.format(new Date(key.lastUsedAt))}`
                      : " · Never used"}
                  </p>
                </div>
                <button
                  className="shrink-0 px-2.5 py-1 text-xs text-destructive border border-destructive/30 hover:bg-destructive hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  disabled={isPending}
                  onClick={() => setRevokeTarget(key)}
                  type="button"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        confirmLabel="Revoke key"
        description={`Revoke "${revokeTarget?.name ?? ""}"? Any systems using this key will immediately lose access.`}
        isPending={isPending}
        onConfirm={handleRevokeConfirm}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
        open={!!revokeTarget}
        title="Revoke API key"
        variant="destructive"
      />
    </section>
  );
}
