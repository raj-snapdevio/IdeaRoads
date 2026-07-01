import Image from "next/image";
import Link from "next/link";
import { LOGO_PATH, PRODUCT_NAME } from "@/config/platform";
import { getCurrentSession } from "@/lib/authz";
import { getInviteByToken } from "@/lib/workspaces/invites";
import { InviteAcceptButton } from "./_components/invite-accept-button";

interface Props {
  params: Promise<{ token: string }>;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) {
    return email;
  }
  return `${local.charAt(0)}${"*".repeat(Math.min(local.length - 1, 4))}@${domain}`;
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const invite = await getInviteByToken(token);

  if (!invite) {
    return (
      <InviteLayout>
        <InviteStateCard
          body="This invitation link is invalid or no longer exists."
          heading="Invitation not found"
        />
      </InviteLayout>
    );
  }

  const now = new Date();

  if (invite.acceptedAt) {
    return (
      <InviteLayout>
        <InviteStateCard
          body={`This invitation to ${invite.workspace.name} has already been accepted.`}
          heading="Invitation already used"
          link={{ href: `/${invite.workspace.slug}`, label: "Go to workspace" }}
        />
      </InviteLayout>
    );
  }

  if (invite.revokedAt) {
    return (
      <InviteLayout>
        <InviteStateCard
          body="This invitation has been revoked by a Brand Admin."
          heading="Invitation revoked"
        />
      </InviteLayout>
    );
  }

  if (invite.expiresAt <= now) {
    return (
      <InviteLayout>
        <InviteStateCard
          body="This invitation has expired. Ask a Brand Admin to send a new one."
          heading="Invitation expired"
        />
      </InviteLayout>
    );
  }

  const session = await getCurrentSession();
  const inviterName =
    invite.inviter?.name || invite.inviter?.email || "Someone";

  if (!session) {
    return (
      <InviteLayout>
        <div className="space-y-1 text-center">
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-muted-foreground">
            Workspace invitation
          </p>
          <h1 className="text-xl font-semibold text-foreground">
            Join {invite.workspace.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {inviterName} invited you to join as a{" "}
            <span className="font-medium text-foreground">{invite.role}</span>.
          </p>
        </div>
        <div className="mt-6">
          <Link
            className="flex w-full items-center justify-center bg-foreground px-4 py-2.5 text-sm font-semibold text-background hover:bg-foreground/90 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href={`/signin?next=/invite/${token}`}
          >
            Sign in to accept
          </Link>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            You'll need to sign in with {maskEmail(invite.email)}.
          </p>
        </div>
      </InviteLayout>
    );
  }

  if (session.user.email.toLowerCase() !== invite.email.toLowerCase()) {
    return (
      <InviteLayout>
        <InviteStateCard
          body={`This invitation was sent to ${maskEmail(invite.email)}. You're signed in as ${session.user.email}.`}
          heading="Wrong account"
          link={{ href: "/signin", label: "Sign in with a different account" }}
        />
      </InviteLayout>
    );
  }

  return (
    <InviteLayout>
      <div className="space-y-1 text-center">
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-muted-foreground">
          Workspace invitation
        </p>
        <h1 className="text-xl font-semibold text-foreground">
          Join {invite.workspace.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {inviterName} invited you as a{" "}
          <span className="font-medium text-foreground">{invite.role}</span>.
        </p>
      </div>
      <div className="mt-6">
        <InviteAcceptButton token={token} />
      </div>
    </InviteLayout>
  );
}

function InviteLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-page px-4 py-10">
      <div className="w-full max-w-sm">
        <Link
          className="mb-8 flex justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href="/"
        >
          <Image
            alt={PRODUCT_NAME}
            className="h-9 w-auto"
            height={164}
            priority
            src={LOGO_PATH}
            width={500}
          />
        </Link>
        <div className="border border-border bg-background p-8">{children}</div>
      </div>
    </main>
  );
}

function InviteStateCard({
  heading,
  body,
  link,
}: {
  heading: string;
  body: string;
  link?: { href: string; label: string };
}) {
  return (
    <div className="space-y-3 text-center">
      <h1 className="text-lg font-semibold text-foreground">{heading}</h1>
      <p className="text-sm text-muted-foreground">{body}</p>
      {link && (
        <Link
          className="inline-block text-sm font-medium text-foreground underline underline-offset-4 hover:text-muted-foreground transition-colors duration-150"
          href={link.href}
        >
          {link.label}
        </Link>
      )}
    </div>
  );
}
