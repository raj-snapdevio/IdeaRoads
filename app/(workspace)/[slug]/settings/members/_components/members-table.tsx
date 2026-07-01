"use client";

import { Loader2, MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  changeRoleAction,
  removeMemberAction,
  transferOwnershipAction,
} from "@/app/actions/members";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  WORKSPACE_ADMIN,
  WORKSPACE_MEMBER,
  WORKSPACE_OWNER,
  workspaceRoleLabel,
} from "@/config/platform";

interface Member {
  id: string;
  joinedAt: Date;
  role: "owner" | "admin" | "member";
  user: {
    name: string | null;
    email: string;
  };
  userId: string;
}

interface MembersTableProps {
  actorMemberId: string;
  actorRole: "owner" | "admin" | "member";
  actorUserId: string;
  members: Member[];
  workspaceId: string;
}

interface PendingConfirm {
  action: () => Promise<{ success: boolean; error?: string }>;
  confirmLabel: string;
  description: string;
  memberId: string;
  successMessage: string;
  title: string;
}

const ROLE_BADGE: Record<string, string> = {
  owner: "bg-foreground text-background",
  admin: "bg-muted text-foreground",
  member: "bg-muted text-muted-foreground",
};

export function MembersTable({
  members,
  actorMemberId,
  actorUserId,
  actorRole,
  workspaceId,
}: MembersTableProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(
    null
  );

  async function handleAction(
    memberId: string,
    action: () => Promise<{ success: boolean; error?: string }>
  ) {
    setLoadingId(memberId);
    setErrors((prev) => ({ ...prev, [memberId]: "" }));
    const result = await action();
    setLoadingId(null);
    if (!result.success && result.error) {
      setErrors((prev) => ({ ...prev, [memberId]: result.error! }));
    } else {
      router.refresh();
    }
  }

  async function handleConfirmedAction() {
    if (!pendingConfirm) {
      return;
    }
    const { memberId, action, successMessage } = pendingConfirm;
    setPendingConfirm(null);
    setLoadingId(memberId);
    const result = await action();
    setLoadingId(null);
    if (!result.success && result.error) {
      toast.error(result.error);
    } else {
      toast.success(successMessage);
      router.refresh();
    }
  }

  return (
    <>
      <div className="space-y-px bg-border">
        {members.map((member) => {
          const isSelf = member.userId === actorUserId;
          const isOwner = member.role === WORKSPACE_OWNER;
          const canChangeRole = actorRole === WORKSPACE_OWNER && !isOwner;
          const canRemove =
            !isOwner &&
            !isSelf &&
            (actorRole === WORKSPACE_OWNER ||
              (actorRole === WORKSPACE_ADMIN &&
                member.role === WORKSPACE_MEMBER));
          const canTransfer =
            actorRole === WORKSPACE_OWNER && !isOwner && !isSelf;
          const showMenu = canChangeRole || canRemove || canTransfer;

          return (
            <div
              className="flex items-center gap-4 bg-background px-6 py-4"
              key={member.id}
            >
              <div className="flex size-9 shrink-0 items-center justify-center bg-muted text-sm font-semibold text-muted-foreground uppercase">
                {(member.user.name || member.user.email).charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                {member.user.name && (
                  <p className="text-sm font-medium text-foreground truncate">
                    {member.user.name}
                    {isSelf && (
                      <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                        (you)
                      </span>
                    )}
                  </p>
                )}
                <p
                  className={`truncate text-sm ${member.user.name ? "text-muted-foreground" : "font-medium text-foreground"}`}
                >
                  {member.user.email}
                  {!member.user.name && isSelf && (
                    <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                      (you)
                    </span>
                  )}
                </p>
                {errors[member.id] && (
                  <p className="mt-0.5 text-xs text-destructive">
                    {errors[member.id]}
                  </p>
                )}
              </div>
              <span
                className={`shrink-0 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${ROLE_BADGE[member.role]}`}
              >
                {workspaceRoleLabel(member.role)}
              </span>
              {showMenu && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      className="size-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                      disabled={loadingId === member.id}
                      size="sm"
                      variant="ghost"
                    >
                      {loadingId === member.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <MoreHorizontal className="size-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canChangeRole && (
                      <>
                        {member.role === WORKSPACE_MEMBER && (
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() =>
                              handleAction(member.id, () =>
                                changeRoleAction({
                                  memberId: member.id,
                                  workspaceId,
                                  role: "admin",
                                })
                              )
                            }
                          >
                            Promote to Brand Admin
                          </DropdownMenuItem>
                        )}
                        {member.role === WORKSPACE_ADMIN && (
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() =>
                              handleAction(member.id, () =>
                                changeRoleAction({
                                  memberId: member.id,
                                  workspaceId,
                                  role: "member",
                                })
                              )
                            }
                          >
                            Change to Team Member
                          </DropdownMenuItem>
                        )}
                      </>
                    )}
                    {canTransfer && (
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() =>
                          setPendingConfirm({
                            title: "Transfer Ownership",
                            description: `Transfer workspace ownership to ${member.user.name ?? member.user.email}? You will remain a Brand Admin but lose ownership of this workspace.`,
                            memberId: member.id,
                            confirmLabel: "Transfer",
                            action: () =>
                              transferOwnershipAction({
                                targetMemberId: member.id,
                                workspaceId,
                              }),
                            successMessage:
                              "Ownership transferred successfully",
                          })
                        }
                      >
                        Transfer ownership
                      </DropdownMenuItem>
                    )}
                    {(canChangeRole || canTransfer) && canRemove && (
                      <DropdownMenuSeparator />
                    )}
                    {canRemove && (
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive cursor-pointer"
                        onClick={() =>
                          setPendingConfirm({
                            title: "Remove Member",
                            description: `Remove ${member.user.name ?? member.user.email} from this workspace? They will lose all access immediately.`,
                            memberId: member.id,
                            confirmLabel: "Remove",
                            action: () =>
                              removeMemberAction({
                                memberId: member.id,
                                workspaceId,
                              }),
                            successMessage: "Member removed successfully",
                          })
                        }
                      >
                        Remove member
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        confirmLabel={pendingConfirm?.confirmLabel ?? "Confirm"}
        description={pendingConfirm?.description ?? ""}
        isPending={!!loadingId}
        onConfirm={handleConfirmedAction}
        onOpenChange={(open) => !open && setPendingConfirm(null)}
        open={!!pendingConfirm}
        title={pendingConfirm?.title ?? ""}
      />
    </>
  );
}
