"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { blockUserAction, unblockUserAction } from "@/app/actions/moderation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { BlockedUserRow } from "@/lib/moderation/queries";

interface Props {
  blockedUsers: BlockedUserRow[];
  workspaceId: string;
}

export function BlockedUsersSection({ workspaceId, blockedUsers }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState("");
  const [unblockTarget, setUnblockTarget] = useState<BlockedUserRow | null>(
    null
  );

  function handleBlock(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    startTransition(async () => {
      const result = await blockUserAction({
        workspaceId,
        email: email.trim(),
        reason: reason.trim() || undefined,
      });

      if (!result.success) {
        setFormError(result.error);
        return;
      }

      toast.success(`${email.trim()} has been blocked`);
      setEmail("");
      setReason("");
      router.refresh();
    });
  }

  function handleUnblockConfirm() {
    if (!unblockTarget) {
      return;
    }
    startTransition(async () => {
      const result = await unblockUserAction({
        blockedId: unblockTarget.id,
        workspaceId,
      });
      setUnblockTarget(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("User unblocked");
      router.refresh();
    });
  }

  const inputClass =
    "w-full h-8 border border-border bg-background px-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">Blocked users</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Blocked users cannot post or comment in this workspace.
        </p>
      </div>

      {/* Block form */}
      <form className="border border-border p-4 mb-4" onSubmit={handleBlock}>
        <p className="text-sm font-medium text-foreground mb-3">Block a user</p>
        <div className="grid gap-3">
          <div>
            <label
              className="block text-xs font-medium text-foreground mb-1"
              htmlFor="block-email"
            >
              Email address
            </label>
            <input
              className={inputClass}
              disabled={isPending}
              id="block-email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
              type="email"
              value={email}
            />
          </div>
          <div>
            <label
              className="block text-xs font-medium text-foreground mb-1"
              htmlFor="block-reason"
            >
              Reason{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </label>
            <input
              className={inputClass}
              disabled={isPending}
              id="block-reason"
              maxLength={300}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Spam, abuse, etc."
              value={reason}
            />
          </div>
          {formError && <p className="text-xs text-destructive">{formError}</p>}
          <div className="flex justify-end">
            <button
              className="px-3.5 py-1.5 text-sm font-medium text-destructive border border-destructive/40 hover:bg-destructive hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isPending || !email.trim()}
              type="submit"
            >
              {isPending ? "Blocking…" : "Block user"}
            </button>
          </div>
        </div>
      </form>

      {/* Blocked list */}
      {blockedUsers.length === 0 ? (
        <div className="border border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">No blocked users.</p>
        </div>
      ) : (
        <div className="border border-border divide-y divide-border">
          {blockedUsers.map((bu) => (
            <div className="flex items-center gap-4 p-4" key={bu.id}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {bu.userName ?? bu.userEmail ?? "Unknown"}
                </p>
                {bu.userName && bu.userEmail && (
                  <p className="text-xs text-muted-foreground">
                    {bu.userEmail}
                  </p>
                )}
                {bu.reason && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Reason: {bu.reason}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  Blocked{" "}
                  {new Intl.DateTimeFormat("en", {
                    dateStyle: "medium",
                  }).format(new Date(bu.createdAt))}
                  {bu.blockedBy?.email
                    ? ` by ${bu.blockedBy.name ?? bu.blockedBy.email}`
                    : ""}
                </p>
              </div>
              <button
                className="shrink-0 px-2.5 py-1 text-xs font-medium border border-border hover:bg-muted transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                disabled={isPending}
                onClick={() => setUnblockTarget(bu)}
                type="button"
              >
                Unblock
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        confirmLabel="Unblock"
        description={`Remove block for ${unblockTarget?.userEmail ?? unblockTarget?.userName ?? "this user"}? They will be able to post and comment again.`}
        isPending={isPending}
        onConfirm={handleUnblockConfirm}
        onOpenChange={(open) => !open && setUnblockTarget(null)}
        open={!!unblockTarget}
        title="Unblock user"
        variant="default"
      />
    </section>
  );
}
