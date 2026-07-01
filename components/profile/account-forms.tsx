"use client";

import { TriangleAlert } from "lucide-react";
import { useActionState } from "react";
import {
  type ActionState,
  changeEmailAction,
  deleteAccountAction,
  updateNameAction,
} from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: ActionState = {};

function ActionMessage({ state }: { state: ActionState }) {
  if (state.error) {
    return (
      <p className="bg-destructive/10 p-3 text-destructive text-sm">
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p className="bg-success-subtle p-3 text-success-foreground text-sm">
        {state.success}
      </p>
    );
  }
  return null;
}

export function AccountIdentityForms({
  email,
  name,
}: {
  email: string;
  name: string;
}) {
  const [nameState, nameAction, namePending] = useActionState(
    updateNameAction,
    initialState
  );
  const [emailState, emailAction, emailPending] = useActionState(
    changeEmailAction,
    initialState
  );

  return (
    <div className="border border-border divide-y divide-border">
      {/* Display name */}
      <div className="px-5 py-4">
        <div className="flex items-start gap-6">
          <div className="w-40 shrink-0 pt-0.5">
            <p className="text-sm font-medium text-foreground">Display name</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Shown in audit logs and admin views.
            </p>
          </div>
          <form action={nameAction} className="flex-1 min-w-0 space-y-3">
            <Input
              defaultValue={name}
              id="name"
              maxLength={100}
              name="name"
              placeholder="Enter your profile name..."
            />
            <ActionMessage state={nameState} />
            <Button disabled={namePending} size="sm" type="submit">
              {namePending ? "Saving…" : "Save name"}
            </Button>
          </form>
        </div>
      </div>

      {/* Email address */}
      <div className="px-5 py-4">
        <div className="flex items-start gap-6">
          <div className="w-40 shrink-0 pt-0.5">
            <p className="text-sm font-medium text-foreground">Email address</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Used for magic-link sign-in.
            </p>
          </div>
          <form action={emailAction} className="flex-1 min-w-0 space-y-3">
            <Input
              defaultValue={email}
              id="email"
              name="email"
              required
              type="email"
              placeholder="Enter your email address..."
            />
            <ActionMessage state={emailState} />
            <Button disabled={emailPending} size="sm" type="submit">
              {emailPending ? "Saving…" : "Update email"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function DeleteAccountForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(
    deleteAccountAction,
    initialState
  );

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">Danger zone</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Irreversible and destructive actions.
        </p>
      </div>

      <div className="border border-destructive/30 p-5">
        <div className="flex items-start gap-3 mb-5">
          <div className="flex size-8 shrink-0 items-center justify-center bg-destructive/10">
            <TriangleAlert className="size-4 text-destructive" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Delete your account
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              This permanently deletes your profile, all active sessions, and
              linked authentication accounts. Audit records are kept for
              operator history. This action cannot be undone.
            </p>
          </div>
        </div>

        <form action={action} className="space-y-3">
          <div>
            <label
              className="mb-1.5 block text-xs font-medium text-foreground"
              htmlFor="confirmEmail"
            >
              Type <span className="font-mono text-foreground/70">{email}</span>{" "}
              to confirm
            </label>
            <Input
              autoComplete="off"
              id="confirmEmail"
              name="confirmEmail"
              placeholder={email}
            />
          </div>
          <ActionMessage state={state} />
          <Button
            className="border-destructive/40 text-destructive hover:bg-destructive hover:text-white"
            disabled={pending}
            size="sm"
            type="submit"
            variant="outline"
          >
            {pending ? "Deleting…" : "Delete my account"}
          </Button>
        </form>
      </div>
    </section>
  );
}
