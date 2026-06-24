"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { inviteMemberAction } from "@/app/actions/members";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface InviteFormProps {
  workspaceId: string;
  canInviteAdmin: boolean;
}

export function InviteForm({ workspaceId, canInviteAdmin }: InviteFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setEmailError(null);
    setGeneralError(null);
    setSuccess(false);
    setSubmitting(true);

    const result = await inviteMemberAction({
      workspaceId,
      email: email.trim(),
      role,
    });
    setSubmitting(false);

    if (!result.success) {
      if (result.field === "email") {
        setEmailError(result.error);
      } else {
        setGeneralError(result.error);
      }
      return;
    }

    setEmail("");
    setRole("member");
    setSuccess(true);
    router.refresh();
    setTimeout(() => setSuccess(false), 3000);
  }

  return (
    <div>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-eyebrow text-muted-foreground">
        Invite a member
      </h2>
      <form onSubmit={onSubmit} className="space-y-4">
        {generalError && (
          <p className="bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {generalError}
          </p>
        )}
        {success && (
          <p className="bg-muted px-3 py-2 text-sm text-foreground">
            Invitation sent.
          </p>
        )}
        <div className="flex gap-3">
          <div className="flex-1 space-y-1">
            <Input
              autoComplete="off"
              disabled={submitting}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError(null);
              }}
              placeholder="colleague@example.com"
              type="email"
              value={email}
            />
            {emailError && (
              <p className="text-xs text-destructive">{emailError}</p>
            )}
          </div>
          {canInviteAdmin && (
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
          <Button disabled={submitting || !email.trim()} type="submit">
            {submitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Sending…
              </span>
            ) : (
              "Send invite"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
