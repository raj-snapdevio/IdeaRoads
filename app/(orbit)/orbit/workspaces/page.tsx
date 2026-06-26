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
import { listOrbitWorkspaces } from "@/lib/orbit/workspaces";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Workspaces" };

interface Props {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
  }>;
}

export default async function OrbitWorkspacesPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const search = params.search?.trim() || undefined;
  const status =
    params.status === "active" || params.status === "suspended"
      ? params.status
      : undefined;

  const { workspaces, total } = await listOrbitWorkspaces({
    page,
    search,
    status,
  });
  const totalPages = Math.max(1, Math.ceil(total / 25));

  const buildUrl = (updates: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    if (search) {
      next.set("search", search);
    }
    if (status) {
      next.set("status", status);
    }
    next.set("page", String(page));
    for (const [k, v] of Object.entries(updates)) {
      if (v) {
        next.set(k, v);
      } else {
        next.delete(k);
      }
    }
    return `/orbit/workspaces?${next.toString()}`;
  };

  return (
    <div>
      <OrbitPageHeader
        description="Inspect, suspend, or delete any workspace on the platform."
        eyebrow="Orbit"
        title="Workspaces"
      />

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <form action="/orbit/workspaces" className="flex gap-2" method="GET">
          {status && <input name="status" type="hidden" value={status} />}
          <input
            className="h-9 w-64 border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            defaultValue={search}
            name="search"
            placeholder="Search name, slug, or owner…"
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

        {/* Status filter */}
        <div className="flex gap-1">
          {(["", "active", "suspended"] as const).map((s) => (
            <Link
              className={`flex h-9 items-center border px-3 text-xs font-semibold uppercase tracking-ui transition-colors ${
                (status ?? "") === s
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card hover:bg-accent"
              }`}
              href={buildUrl({ status: s || undefined, page: "1" })}
              key={s || "all"}
            >
              {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </Link>
          ))}
        </div>
      </div>

      <div className="border border-border bg-card">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[20%]">Name</TableHead>
              <TableHead className="w-[14%]">Slug</TableHead>
              <TableHead className="w-[22%]">Owner</TableHead>
              <TableHead className="w-[7%] text-right">Posts</TableHead>
              <TableHead className="w-[8%] text-right">Members</TableHead>
              <TableHead className="w-[18%]">Created</TableHead>
              <TableHead className="w-[11%]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workspaces.length === 0 ? (
              <TableRow>
                <TableCell
                  className="py-10 text-center text-muted-foreground"
                  colSpan={7}
                >
                  No workspaces found.
                </TableCell>
              </TableRow>
            ) : (
              workspaces.map((ws) => (
                <TableRow key={ws.id}>
                  <TableCell className="max-w-0">
                    <Link
                      className="block truncate font-semibold hover:underline"
                      href={`/orbit/workspaces/${ws.id}`}
                    >
                      {ws.name}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-0 font-mono text-muted-foreground text-xs">
                    <span className="block truncate">/{ws.slug}</span>
                  </TableCell>
                  <TableCell className="max-w-0 text-muted-foreground text-xs">
                    <span className="block truncate">
                      {ws.ownerEmail ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {ws.postCount}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {ws.memberCount}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(ws.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={ws.isSuspended ? undefined : "text-success"}
                      variant={ws.isSuspended ? "destructive" : "default"}
                    >
                      {ws.isSuspended ? "Suspended" : "Active"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages} · {total} workspaces
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
