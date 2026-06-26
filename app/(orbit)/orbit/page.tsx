import Link from "next/link";
import { OrbitPageHeader } from "@/components/admin/orbit-page-header";
import { Badge } from "@/components/ui/badge";
import { ADMIN_ROLE } from "@/config/platform";
import {
  getPlatformStats,
  getRecentUsers,
  getRecentWorkspaces,
} from "@/lib/orbit/stats";

export const metadata = {
  title: "Orbit",
};

export default async function OrbitPage() {
  const [stats, recentWorkspaces, recentUsers] = await Promise.all([
    getPlatformStats(),
    getRecentWorkspaces(5),
    getRecentUsers(5),
  ]);

  return (
    <div>
      <OrbitPageHeader
        description="Platform-wide health, activity, and operator controls."
        eyebrow="Orbit"
        title="Platform Overview"
      />

      {/* Stat grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard
          label="Workspaces"
          sub={`+${stats.newWorkspacesThisMonth} this month`}
          value={stats.totalWorkspaces}
        />
        <StatCard
          label="Users"
          sub={`+${stats.newUsersThisMonth} this month`}
          value={stats.totalUsers}
        />
        <StatCard label="Posts" value={stats.totalPosts} />
        <StatCard label="Votes" value={stats.totalVotes} />
        <StatCard label="Comments" value={stats.totalComments} />
        <StatCard
          alert={stats.suspendedWorkspaces > 0}
          label="Suspended"
          value={stats.suspendedWorkspaces}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Recent Workspaces */}
        <div className="border border-border bg-card p-4">
          <div className="flex items-center justify-between border-b border-border px-(--card-spacing) py-4">
            <h2 className="font-semibold text-sm">Recent Workspaces</h2>
            <Link
              className="text-2xs font-semibold uppercase tracking-ui text-muted-foreground hover:text-foreground transition-colors"
              href="/orbit/workspaces"
            >
              View all →
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recentWorkspaces.length === 0 ? (
              <p className="px-(--card-spacing) py-8 text-center text-sm text-muted-foreground">
                No workspaces yet.
              </p>
            ) : (
              recentWorkspaces.map((ws) => (
                <Link
                  className="flex items-center gap-3 px-(--card-spacing) py-3 hover:bg-accent transition-colors"
                  href={`/orbit/workspaces/${ws.id}`}
                  key={ws.id}
                >
                  <div className="grid size-7 shrink-0 place-items-center bg-muted font-bold text-xs text-muted-foreground">
                    {ws.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{ws.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      /{ws.slug}
                    </p>
                  </div>
                  {ws.isSuspended && (
                    <Badge className="shrink-0 text-2xs" variant="destructive">
                      Suspended
                    </Badge>
                  )}
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Users */}
        <div className="border border-border bg-card p-4">
          <div className="flex items-center justify-between border-b border-border px-(--card-spacing) py-4">
            <h2 className="font-semibold text-sm">Recent Users</h2>
            <Link
              className="text-2xs font-semibold uppercase tracking-ui text-muted-foreground hover:text-foreground transition-colors"
              href="/orbit/users"
            >
              View all →
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recentUsers.length === 0 ? (
              <p className="px-(--card-spacing) py-8 text-center text-sm text-muted-foreground">
                No users yet.
              </p>
            ) : (
              recentUsers.map((u) => (
                <Link
                  className="flex items-center gap-3 px-(--card-spacing) py-3 hover:bg-accent transition-colors"
                  href={`/orbit/users/${u.id}`}
                  key={u.id}
                >
                  <div className="grid size-7 shrink-0 place-items-center bg-muted font-bold text-xs text-muted-foreground">
                    {u.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{u.email}</p>
                    {u.name && (
                      <p className="truncate text-xs text-muted-foreground">
                        {u.name}
                      </p>
                    )}
                  </div>
                  {u.role === ADMIN_ROLE && (
                    <span className="shrink-0 text-2xs font-semibold uppercase tracking-ui text-success">
                      Admin
                    </span>
                  )}
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  alert,
}: {
  label: string;
  value: number;
  sub?: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`border bg-card p-6 ${alert && value > 0 ? "border-destructive/30" : "border-border"}`}
    >
      <p className="text-2xs font-semibold uppercase tracking-ui text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-2 font-black text-4xl tracking-normal ${alert && value > 0 ? "text-destructive" : ""}`}
      >
        {value.toLocaleString()}
      </p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
