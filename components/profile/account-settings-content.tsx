import { desc, eq } from "drizzle-orm";
import { Download } from "lucide-react";
import { AccountIdentityForms, DeleteAccountForm } from "./account-forms";
import { type SessionRow, SessionsCard } from "./sessions-card";
import { Button } from "@/components/ui/button";
import { session as sessionTable, user } from "@/db/schema";
import { db } from "@/lib/db";

export async function AccountSettingsContent({
  userId,
  currentSessionToken,
}: {
  userId: string;
  currentSessionToken: string;
}) {
  const [freshUser, sessions] = await Promise.all([
    db.query.user.findFirst({ where: eq(user.id, userId) }),
    db
      .select({
        createdAt: sessionTable.createdAt,
        expiresAt: sessionTable.expiresAt,
        id: sessionTable.id,
        ipAddress: sessionTable.ipAddress,
        token: sessionTable.token,
        userAgent: sessionTable.userAgent,
      })
      .from(sessionTable)
      .where(eq(sessionTable.userId, userId))
      .orderBy(desc(sessionTable.createdAt)),
  ]);

  if (!freshUser) return null;

  const sessionRows: SessionRow[] = sessions.map((s) => ({
    createdAt: s.createdAt.toISOString(),
    expiresAt: s.expiresAt.toISOString(),
    id: s.id,
    ipAddress: s.ipAddress,
    isCurrent: s.token === currentSessionToken,
    userAgent: s.userAgent,
  }));

  return (
    <div className="space-y-10">
      {/* Profile */}
      <section>
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-foreground">Profile</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Your display name and email address for this account.
          </p>
        </div>
        <AccountIdentityForms email={freshUser.email} name={freshUser.name} />
      </section>

      {/* Active sessions */}
      <SessionsCard sessions={sessionRows} />

      {/* Export */}
      <section>
        <div className="border border-border p-5">
          <div className="flex items-start gap-4">
            <div className="flex size-9 shrink-0 items-center justify-center border border-border bg-muted">
              <Download className="size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                Export your data
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Download a JSON archive of everything we store: your profile,
                linked auth accounts, active sessions, and audit history.
              </p>
              <div className="mt-4">
                <Button asChild size="sm" variant="secondary">
                  <a download href="/api/account/export">
                    <Download className="size-3.5" />
                    Download JSON export
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Delete account */}
      <DeleteAccountForm email={freshUser.email} />
    </div>
  );
}
