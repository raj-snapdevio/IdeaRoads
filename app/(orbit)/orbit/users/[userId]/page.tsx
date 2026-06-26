import Link from "next/link";
import { notFound } from "next/navigation";
import { UserAdminActions } from "@/components/orbit/user-admin-actions";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/authz";
import { env } from "@/lib/env";
import { getOrbitUser } from "@/lib/orbit/users";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "User Detail" };

interface Props {
  params: Promise<{ userId: string }>;
}

export default async function OrbitUserDetailPage({ params }: Props) {
  const { userId } = await params;
  const [u, session] = await Promise.all([
    getOrbitUser(userId),
    requireAdmin(),
  ]);

  if (!u) {
    notFound();
  }

  const isCurrentUser = session.user.id === userId;
  const impersonationEnabled = env.ENABLE_IMPERSONATION;

  return (
    <div>
      <div className="mb-6">
        <Link
          className="text-2xs font-semibold uppercase tracking-ui text-muted-foreground hover:text-foreground transition-colors"
          href="/orbit/users"
        >
          ← Users
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-black text-2xl tracking-normal">
              {u.name || u.email}
            </h1>
            {u.isAdmin && (
              <Badge className="text-success" variant="default">
                Admin
              </Badge>
            )}
            {u.banned && <Badge variant="destructive">Banned</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{u.email}</p>
        </div>
        <UserAdminActions
          impersonationEnabled={impersonationEnabled}
          isAdmin={u.isAdmin}
          isCurrentUser={isCurrentUser}
          userEmail={u.email}
          userId={u.id}
        />
      </div>

      {/* Meta */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetaCard label="Joined" value={formatDateTime(u.createdAt)} />
        <MetaCard label="Last updated" value={formatDateTime(u.updatedAt)} />
        <MetaCard
          label="Sign-in methods"
          value={u.authMethods.length > 0 ? u.authMethods.join(", ") : "—"}
        />
        <MetaCard
          label="Workspaces"
          value={String(u.workspaceMemberships.length)}
        />
      </div>

      {u.banReason && (
        <div className="mb-8 border border-destructive/20 bg-destructive/5 p-4">
          <p className="text-sm font-semibold text-destructive">
            Ban reason: {u.banReason}
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Workspace memberships */}
        <div className="border border-border bg-card lg:col-span-3">
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-semibold text-sm">
              Workspace Memberships ({u.workspaceMemberships.length})
            </h2>
          </div>
          {u.workspaceMemberships.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              No workspace memberships.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {u.workspaceMemberships.map((m) => (
                <div
                  className="flex items-center gap-4 px-4 py-3"
                  key={m.workspaceId}
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      className="font-semibold text-sm hover:underline"
                      href={`/orbit/workspaces/${m.workspaceId}`}
                    >
                      {m.workspaceName}
                    </Link>
                    <p className="font-mono text-xs text-muted-foreground">
                      /{m.workspaceSlug}
                    </p>
                  </div>
                  <Badge variant="secondary">{m.role}</Badge>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDateTime(m.joinedAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Posts */}
        <div className="border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-semibold text-sm">Recent Posts</h2>
          </div>
          {u.recentPosts.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No posts.</p>
          ) : (
            <div className="divide-y divide-border">
              {u.recentPosts.map((p) => (
                <div className="px-4 py-2.5" key={p.id}>
                  <p className="truncate text-sm font-medium">{p.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(p.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Comments */}
        <div className="border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-semibold text-sm">Recent Comments</h2>
          </div>
          {u.recentComments.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              No comments.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {u.recentComments.map((c) => (
                <div className="px-4 py-2.5" key={c.id}>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {c.body}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDateTime(c.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-card p-4">
      <p className="text-2xs font-semibold uppercase tracking-ui text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}
