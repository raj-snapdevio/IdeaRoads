"use client";

import { Loader2, MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  changeRoleAction,
  removeMemberAction,
  transferOwnershipAction,
} from "@/app/actions/members";
import { Button } from "@/components/ui/button";
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
} from "@/config/platform";

interface Member {
  id: string;
  userId: string;
  role: "owner" | "admin" | "member";
  joinedAt: Date;
  user: {
    name: string | null;
    email: string;
  };
}

interface MembersTableProps {
  members: Member[];
  actorMemberId: string;
  actorUserId: string;
  actorRole: "owner" | "admin" | "member";
  workspaceId: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

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

  return (
    <div className="space-y-px bg-border">
      {members.map((member) => {
        const isSelf = member.userId === actorUserId;
        const isOwner = member.role === WORKSPACE_OWNER;
        const canAct =
          actorRole === WORKSPACE_OWNER ||
          (actorRole === WORKSPACE_ADMIN && member.role === WORKSPACE_MEMBER);
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
            key={member.id}
            className="flex items-center gap-4 bg-background px-6 py-4"
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
              {ROLE_LABELS[member.role]}
            </span>
            {showMenu && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-8 p-0 text-muted-foreground hover:text-foreground"
                    disabled={loadingId === member.id}
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
                          Promote to admin
                        </DropdownMenuItem>
                      )}
                      {member.role === WORKSPACE_ADMIN && (
                        <DropdownMenuItem
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
                          Demote to member
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                  {canTransfer && (
                    <DropdownMenuItem
                      onClick={() =>
                        handleAction(member.id, () =>
                          transferOwnershipAction({
                            targetMemberId: member.id,
                            workspaceId,
                          })
                        )
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
                      className="text-destructive focus:text-destructive"
                      onClick={() =>
                        handleAction(member.id, () =>
                          removeMemberAction({
                            memberId: member.id,
                            workspaceId,
                          })
                        )
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
  );
}
