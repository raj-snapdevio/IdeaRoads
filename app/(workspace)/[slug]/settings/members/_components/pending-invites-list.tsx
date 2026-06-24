"use client";

import { Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { revokeInviteAction } from "@/app/actions/members";
import { Button } from "@/components/ui/button";

interface PendingInvite {
  id: string;
  email: string;
  role: "owner" | "admin" | "member";
  expiresAt: Date;
  createdAt: Date;
}

interface PendingInvitesListProps {
  invites: PendingInvite[];
  workspaceId: string;
  canManage: boolean;
  actorRole: "owner" | "admin" | "member";
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

function formatExpiry(date: Date): string {
  const diff = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return "Expiring soon";
  if (diff === 1) return "Expires in 1 day";
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleRevoke(invite: PendingInvite) {
    setRevoking(invite.id);
    setErrors((prev) => ({ ...prev, [invite.id]: "" }));
    const result = await revokeInviteAction({
      inviteId: invite.id,
      workspaceId,
    });
    setRevoking(null);
    if (!result.success) {
      setErrors((prev) => ({ ...prev, [invite.id]: result.error }));
    } else {
      router.refresh();
    }
  }

  return (
    <div>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-eyebrow text-muted-foreground">
        Pending invitations{invites.length > 0 ? ` (${invites.length})` : ""}
      </h2>
      {invites.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending invitations.</p>
      ) : (
        <div className="space-y-px bg-border">
          {invites.map((invite) => {
            const canRevoke =
              canManage && (actorRole === "owner" || invite.role !== "admin");
            return (
              <div
                key={invite.id}
                className="flex items-center gap-4 bg-background px-6 py-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {invite.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABELS[invite.role]} ·{" "}
                    {formatExpiry(invite.expiresAt)}
                  </p>
                  {errors[invite.id] && (
                    <p className="mt-0.5 text-xs text-destructive">
                      {errors[invite.id]}
                    </p>
                  )}
                </div>
                {canRevoke && (
                  <Button
                    disabled={revoking === invite.id}
                    onClick={() => handleRevoke(invite)}
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive shrink-0"
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
  );
}
