"use client";

import { Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { revokeInviteAction } from "@/app/actions/members";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface PendingInvite {
  createdAt: Date;
  email: string;
  expiresAt: Date;
  id: string;
  role: "owner" | "admin" | "member";
}

interface PendingInvitesListProps {
  actorRole: "owner" | "admin" | "member";
  canManage: boolean;
  invites: PendingInvite[];
  workspaceId: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

function formatExpiry(date: Date): string {
  const diff = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff <= 0) {
    return "Expiring soon";
  }
  if (diff === 1) {
    return "Expires in 1 day";
  }
  return `Expires in ${diff} days`;
}

export function PendingInvitesList({
  invites,
  workspaceId,
  canManage,
  actorRole,
}: PendingInvitesListProps) {
  const router = useRouter();
  const [revoking, setRevoking] = useState<string | null>(null);
  const [pendingRevoke, setPendingRevoke] = useState<PendingInvite | null>(
    null
  );

  async function handleConfirmRevoke() {
    if (!pendingRevoke) {
      return;
    }
    const invite = pendingRevoke;
    setPendingRevoke(null);
    setRevoking(invite.id);
    const result = await revokeInviteAction({
      inviteId: invite.id,
      workspaceId,
    });
    setRevoking(null);
    if (result.success) {
      toast.success("Invitation revoked");
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to revoke invitation.");
    }
  }

  return (
    <>
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-eyebrow text-muted-foreground">
          Pending invitations
          {invites.length > 0 ? ` (${invites.length})` : ""}
        </h2>
        {invites.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No pending invitations.
          </p>
        ) : (
          <div className="space-y-px bg-border">
            {invites.map((invite) => {
              const canRevoke =
                canManage && (actorRole === "owner" || invite.role !== "admin");
              return (
                <div
                  className="flex items-center gap-4 bg-background px-6 py-4"
                  key={invite.id}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {invite.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ROLE_LABELS[invite.role]} ·{" "}
                      {formatExpiry(invite.expiresAt)}
                    </p>
                  </div>
                  {canRevoke && (
                    <Button
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      disabled={revoking === invite.id}
                      onClick={() => setPendingRevoke(invite)}
                      size="sm"
                      variant="ghost"
                    >
                      {revoking === invite.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <X className="size-4" />
                      )}
                      <span className="ml-1.5">Revoke</span>
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        confirmLabel="Revoke"
        description={`Revoke the invitation sent to ${pendingRevoke?.email ?? "this person"}? They will no longer be able to use this invite link.`}
        isPending={!!revoking}
        onConfirm={handleConfirmRevoke}
        onOpenChange={(open) => !open && setPendingRevoke(null)}
        open={!!pendingRevoke}
        title="Revoke Invitation"
      />
    </>
  );
}
