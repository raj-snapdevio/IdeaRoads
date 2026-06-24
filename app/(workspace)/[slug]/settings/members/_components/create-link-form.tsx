"use client";

import { Check, Copy, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { createInviteLinkAction } from "@/app/actions/members";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CreateLinkFormProps {
  workspaceId: string;
  appUrl: string;
  canCreateAdmin: boolean;
}

export function CreateLinkForm({
  workspaceId,
  appUrl,
  canCreateAdmin,
}: CreateLinkFormProps) {
  const router = useRouter();
  const [role, setRole] = useState<"member" | "admin">("member");
  const [label, setLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreatedUrl(null);
    setSubmitting(true);

    const result = await createInviteLinkAction({
      workspaceId,
      role,
      label: label.trim() || undefined,
    });

    setSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    const url = `${appUrl}/join/${result.data.token}`;
    setCreatedUrl(url);
    setLabel("");
    setRole("member");
    router.refresh();
  }

  async function copyUrl() {
    if (!createdUrl) return;
    await navigator.clipboard.writeText(createdUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-foreground">
        Generate invite link
      </h3>
      <form onSubmit={onSubmit} className="flex flex-wrap gap-3">
        {error && (
          <p className="w-full bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <Input
          className="w-48"
          disabled={submitting}
          maxLength={100}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (optional)"
          type="text"
          value={label}
        />
        {canCreateAdmin && (
          <select
            className="h-10 border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={submitting}
            onChange={(e) => setRole(e.target.value as "member" | "admin")}
            value={role}
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        )}
        <Button disabled={submitting} type="submit">
          {submitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Generating…
            </span>
          ) : (
            "Generate link"
          )}
        </Button>
      </form>
      {createdUrl && (
        <div className="flex items-center gap-2 border border-border bg-muted/40 px-4 py-3">
          <p className="flex-1 min-w-0 truncate font-mono text-xs text-foreground">
            {createdUrl}
          </p>
          <Button
            className="shrink-0"
            onClick={copyUrl}
            size="sm"
            variant="outline"
          >
            {copied ? (
              <span className="flex items-center gap-1.5">
                <Check className="size-3.5" />
                Copied
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Copy className="size-3.5" />
                Copy
              </span>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
