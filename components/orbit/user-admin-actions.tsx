"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  grantAdminAction,
  revokeAdminAction,
} from "@/app/actions/orbit-settings";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Props {
  impersonationEnabled: boolean;
  isAdmin: boolean;
  isCurrentUser: boolean;
  userEmail: string;
  userId: string;
}

export function UserAdminActions({
  userId,
  userEmail,
  isAdmin,
  isCurrentUser,
  impersonationEnabled,
}: Props) {
  const router = useRouter();
  const [grantOpen, setGrantOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);

  async function handleGrant() {
    setIsPending(true);
    const result = await grantAdminAction(userId);
    setIsPending(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Admin access granted to ${userEmail}`);
      setGrantOpen(false);
      router.refresh();
    }
  }

  async function handleRevoke() {
    setIsPending(true);
    const result = await revokeAdminAction(userId);
    setIsPending(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Admin access revoked");
      setRevokeOpen(false);
      router.refresh();
    }
  }

  async function handleImpersonate() {
    setIsImpersonating(true);
    try {
      const response = await fetch(`/api/orbit/users/${userId}/impersonate`, {
        method: "POST",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Impersonation failed");
      }
      window.location.href = "/";
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Impersonation failed"
      );
      setIsImpersonating(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {impersonationEnabled && !isCurrentUser && (
        <button
          className="border border-border bg-card px-3 py-1.5 text-xs font-semibold uppercase tracking-ui transition-colors hover:bg-accent disabled:opacity-50"
          disabled={isImpersonating}
          onClick={handleImpersonate}
          type="button"
        >
          {isImpersonating ? "Starting…" : "Impersonate"}
        </button>
      )}

      {isAdmin ? (
        <button
          className="border border-destructive/40 bg-destructive/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-ui text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={isCurrentUser}
          onClick={() => setRevokeOpen(true)}
          title={
            isCurrentUser ? "Cannot revoke your own admin access" : undefined
          }
          type="button"
        >
          Revoke Admin
        </button>
      ) : (
        <button
          className="border border-border bg-card px-3 py-1.5 text-xs font-semibold uppercase tracking-ui transition-colors hover:bg-accent"
          onClick={() => setGrantOpen(true)}
          type="button"
        >
          Grant Admin
        </button>
      )}

      <ConfirmDialog
        confirmLabel="Grant admin"
        description={`${userEmail} will gain full access to Orbit Admin and all platform controls.`}
        isPending={isPending}
        onConfirm={handleGrant}
        onOpenChange={setGrantOpen}
        open={grantOpen}
        title="Grant admin access?"
        variant="default"
      />

      <ConfirmDialog
        confirmLabel="Revoke admin"
        description={`${userEmail} will lose access to Orbit Admin immediately.`}
        isPending={isPending}
        onConfirm={handleRevoke}
        onOpenChange={setRevokeOpen}
        open={revokeOpen}
        title="Revoke admin access?"
        variant="destructive"
      />
    </div>
  );
}
