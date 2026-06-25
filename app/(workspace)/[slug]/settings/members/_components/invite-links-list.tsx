"use client";

import { Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { revokeInviteLinkAction } from "@/app/actions/members";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface InviteLink {
  id: string;
  role: "owner" | "admin" | "member";
  label: string | null;
  maxUses: number | null;
  useCount: number;
  expiresAt: Date | null;
  createdAt: Date;
}

interface InviteLinksListProps {
  links: InviteLink[];
  workspaceId: string;
  appUrl: string;
  canManage: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

export function InviteLinksList({
  links,
  workspaceId,
  appUrl,
  canManage,
}: InviteLinksListProps) {
  const router = useRouter();
  const [revoking, setRevoking] = useState<string | null>(null);
  const [pendingRevoke, setPendingRevoke] = useState<InviteLink | null>(null);

  async function handleConfirmRevoke() {
    if (!pendingRevoke) return;
    const link = pendingRevoke;
    setPendingRevoke(null);
    setRevoking(link.id);
    const result = await revokeInviteLinkAction({
      linkId: link.id,
      workspaceId,
    });
    setRevoking(null);
    if (!result.success) {
      toast.error(result.error ?? "Failed to deactivate invite link.");
    } else {
      toast.success("Invite link deactivated");
      router.refresh();
    }
  }

  return (
    <>
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-eyebrow text-muted-foreground">
          Invite links{links.length > 0 ? ` (${links.length} active)` : ""}
        </h2>
        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No active invite links.
          </p>
        ) : (
          <div className="space-y-px bg-border">
            {links.map((link) => (
              <div
                key={link.id}
                className="flex items-center gap-4 bg-background px-6 py-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {link.label ?? "Invite link"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABELS[link.role]}
                    {link.maxUses !== null
                      ? ` · ${link.useCount}/${link.maxUses} uses`
                      : ` · ${link.useCount} uses`}
                    {link.expiresAt
                      ? ` · Expires ${link.expiresAt.toLocaleDateString()}`
                      : ""}
                  </p>
                </div>
                {canManage && (
                  <Button
                    disabled={revoking === link.id}
                    onClick={() => setPendingRevoke(link)}
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive shrink-0"
                  >
                    {revoking === link.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <X className="size-4" />
                    )}
                    <span className="ml-1.5">Deactivate</span>
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingRevoke}
        onOpenChange={(open) => !open && setPendingRevoke(null)}
        title="Deactivate Invite Link"
        description={`Deactivate "${pendingRevoke?.label ?? "this invite link"}"? Anyone with the link will no longer be able to join.`}
        confirmLabel="Deactivate"
        isPending={!!revoking}
        onConfirm={handleConfirmRevoke}
      />
    </>
  );
}
