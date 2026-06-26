import Link from "next/link";
import { OrbitPageHeader } from "@/components/admin/orbit-page-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listOrbitUsers } from "@/lib/orbit/users";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Users" };

interface Props {
  searchParams: Promise<{
    page?: string;
    search?: string;
    filter?: string;
  }>;
}

export default async function OrbitUsersPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const search = params.search?.trim() || undefined;
  const adminsOnly = params.filter === "admins";

  const { users, total } = await listOrbitUsers({ page, search, adminsOnly });
  const totalPages = Math.max(1, Math.ceil(total / 25));

  const buildUrl = (updates: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    if (search) {
      next.set("search", search);
    }
    if (adminsOnly) {
      next.set("filter", "admins");
    }
    next.set("page", String(page));
    for (const [k, v] of Object.entries(updates)) {
      if (v) {
        next.set(k, v);
      } else {
        next.delete(k);
      }
    }
    return `/orbit/users?${next.toString()}`;
  };

  return (
    <div>
      <OrbitPageHeader
        description="Inspect, manage roles, and impersonate any user on the platform."
        eyebrow="Orbit"
        title="Users"
      />

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <form action="/orbit/users" className="flex gap-2" method="GET">
          {adminsOnly && <input name="filter" type="hidden" value="admins" />}
          <input
            className="h-9 w-64 border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            defaultValue={search}
            name="search"
            placeholder="Search name or email…"
          />
          <button
            className="h-9 border border-border bg-card px-3 text-xs font-semibold uppercase tracking-ui transition-colors hover:bg-accent"
            type="submit"
          >
            Search
          </button>
          {search && (
            <Link
              className="flex h-9 items-center border border-border bg-card px-3 text-xs font-semibold uppercase tracking-ui transition-colors hover:bg-accent"
              href={buildUrl({ search: undefined, page: "1" })}
            >
              Clear
            </Link>
          )}
        </form>

        {/* Filter */}
        <div className="flex gap-1">
          {(
            [
              { label: "All", value: "" },
              { label: "Admins", value: "admins" },
            ] as const
          ).map(({ label, value }) => (
            <Link
              className={`flex h-9 items-center border px-3 text-xs font-semibold uppercase tracking-ui transition-colors ${
                (adminsOnly ? "admins" : "") === value
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card hover:bg-accent"
              }`}
              href={buildUrl({ filter: value || undefined, page: "1" })}
              key={label}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="border border-border bg-card">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[32%]">User</TableHead>
              <TableHead className="w-[10%]">Role</TableHead>
              <TableHead className="w-[10%]">Status</TableHead>
              <TableHead className="w-[12%] text-right">Workspaces</TableHead>
              <TableHead className="w-[24%]">Joined</TableHead>
              <TableHead className="w-[12%]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  className="py-10 text-center text-muted-foreground"
                  colSpan={6}
                >
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="max-w-0">
                    <div className="truncate font-semibold">{u.email}</div>
                    {u.name && (
                      <div className="truncate text-xs text-muted-foreground">
                        {u.name}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={u.isAdmin ? "text-success" : undefined}
                      variant={u.isAdmin ? "default" : "secondary"}
                    >
                      {u.isAdmin ? "Admin" : "User"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={u.banned ? undefined : "text-success"}
                      variant={u.banned ? "destructive" : "default"}
                    >
                      {u.banned ? "Banned" : "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {u.workspaceCount}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(u.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Link
                      className="text-xs font-semibold uppercase tracking-ui text-muted-foreground hover:text-foreground transition-colors"
                      href={`/orbit/users/${u.id}`}
                    >
                      View →
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages} · {total} users
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  className="border border-border bg-card px-3 py-1.5 text-xs font-semibold uppercase tracking-ui hover:bg-accent"
                  href={buildUrl({ page: String(page - 1) })}
                >
                  ← Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  className="border border-border bg-card px-3 py-1.5 text-xs font-semibold uppercase tracking-ui hover:bg-accent"
                  href={buildUrl({ page: String(page + 1) })}
                >
                  Next →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
