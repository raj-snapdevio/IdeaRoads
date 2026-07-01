import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LOGO_PATH, PRODUCT_NAME } from "@/config/platform";
import { getInviteLinkByToken } from "@/lib/workspaces/invite-links";
import { JoinButton } from "./_components/join-button";

interface Props {
  params: Promise<{ linkToken: string }>;
}

export default async function JoinPage({ params }: Props) {
  const { linkToken } = await params;
  const link = await getInviteLinkByToken(linkToken);

  if (!link) {
    notFound();
  }

  const now = new Date();

  if (!link.isActive) {
    return (
      <JoinLayout>
        <JoinStateCard
          body="This invite link has been deactivated by a Brand Admin."
          heading="Link deactivated"
        />
      </JoinLayout>
    );
  }

  if (link.expiresAt && link.expiresAt <= now) {
    return (
      <JoinLayout>
        <JoinStateCard
          body="This invite link has expired. Ask a Brand Admin for a new one."
          heading="Link expired"
        />
      </JoinLayout>
    );
  }

  if (link.maxUses !== null && link.useCount >= link.maxUses) {
    return (
      <JoinLayout>
        <JoinStateCard
          body="This invite link has reached its maximum number of uses."
          heading="Link unavailable"
        />
      </JoinLayout>
    );
  }

  if (link.workspace.isSuspended) {
    return (
      <JoinLayout>
        <JoinStateCard
          body="This workspace is currently suspended."
          heading="Workspace unavailable"
        />
      </JoinLayout>
    );
  }

  return (
    <JoinLayout>
      <div className="space-y-1 text-center">
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-muted-foreground">
          Workspace invitation
        </p>
        <h1 className="text-xl font-semibold text-foreground">
          Join {link.workspace.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          You've been invited as a{" "}
          <span className="font-medium text-foreground">{link.role}</span>.
        </p>
      </div>
      <div className="mt-6">
        <JoinButton token={linkToken} />
      </div>
    </JoinLayout>
  );
}

function JoinLayout({ children }: { children: React.ReactNode }) {
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

function JoinStateCard({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="space-y-3 text-center">
      <h1 className="text-lg font-semibold text-foreground">{heading}</h1>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
