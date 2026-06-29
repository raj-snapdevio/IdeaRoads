import { and, count, desc, eq, ilike, isNull, or } from "drizzle-orm";
import { Search, X } from "lucide-react";
import Link from "next/link";
import { OrbitPageHeader } from "@/components/admin/orbit-page-header";
import { auditLogs } from "@/db/schema";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Audit Log" };

interface Props {
  searchParams: Promise<{ page?: string; q?: string; type?: string }>;
}

const ENTITY_TYPES = [
  "user",
  "workspace",
  "platform",
  "post",
  "comment",
  "member",
  "invite",
  "webhook",
  "api_key",
  "feature_flag",
  "profile",
];

function actionBadgeClass(action: string): string {
  if (/delete|ban|suspend|revoke|remove|left/.test(action)) {
    return "bg-destructive/10 text-destructive";
  }
  if (/creat|join|unsuspend|unban|invited|added|grant/.test(action)) {
    return "bg-success-subtle text-success";
  }
  if (/impersonat|auth\.|user\.created/.test(action)) {
    return "bg-warning/10 text-warning";
  }
  return "bg-muted text-muted-foreground";
}

function buildUrl(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "" && String(v) !== "1") {
      sp.set(k, String(v));
    }
  }
  const qs = sp.toString();
  return `/orbit/audit-log${qs ? `?${qs}` : ""}`;
}

export default async function OrbitAuditLogPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const q = params.q?.trim() ?? "";
  const type = params.type ?? "";
  const limit = 50;
  const offset = (page - 1) * limit;

  const conditions: ReturnType<typeof eq>[] = [
    isNull(auditLogs.workspaceId) as ReturnType<typeof eq>,
  ];

  if (q) {
    const searchClause = or(
      ilike(auditLogs.actorEmail, `%${q}%`),
      ilike(auditLogs.actorName, `%${q}%`),
      ilike(auditLogs.entityName, `%${q}%`),
      ilike(auditLogs.description, `%${q}%`),
      ilike(auditLogs.action, `%${q}%`)
    );
    if (searchClause) {
      conditions.push(searchClause as ReturnType<typeof eq>);
    }
  }

  if (type) {
    conditions.push(eq(auditLogs.entityType, type) as ReturnType<typeof eq>);
  }

  const where = and(...conditions);

  const [logs, [{ value: total }]] = await Promise.all([
    db
      .select()
      .from(auditLogs)
      .where(where)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ value: count() }).from(auditLogs).where(where),
  ]);

  const totalCount = Number(total);
  const hasMore = offset + logs.length < totalCount;
  const from = totalCount === 0 ? 0 : offset + 1;
  const to = Math.min(offset + logs.length, totalCount);

  const prevUrl =
    page > 1
      ? buildUrl({ page: page - 1, q: q || undefined, type: type || undefined })
      : null;
  const nextUrl = hasMore
    ? buildUrl({ page: page + 1, q: q || undefined, type: type || undefined })
    : null;

  const hasFilters = q || type;

  return (
    <div>
      <OrbitPageHeader
        description="Platform-level admin actions workspace suspension, role changes, impersonation, and auth events."
        eyebrow="Orbit"
        title="Platform Audit Log"
      />

      {/* Filter bar */}
      <form
        action="/orbit/audit-log"
        className="mb-4 flex flex-wrap items-center gap-2"
        method="get"
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            className="h-8 w-64 border border-border bg-background pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            defaultValue={q}
            name="q"
            placeholder="Search events, actors, entities…"
            type="search"
          />
        </div>

        <select
          className="h-8 border border-border bg-background px-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          defaultValue={type}
          name="type"
        >
          <option value="">All entity types</option>
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1).replace("_", " ")}
            </option>
          ))}
        </select>

        <button
          className="h-8 border border-border bg-card px-3 text-xs font-semibold uppercase tracking-ui transition-colors hover:bg-accent"
          type="submit"
        >
          Filter
        </button>

        {hasFilters && (
          <Link
            className="flex h-8 items-center gap-1.5 border border-border bg-card px-3 text-xs font-semibold uppercase tracking-ui text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            href="/orbit/audit-log"
          >
            <X className="size-3" />
            Clear
          </Link>
        )}

        <span className="ml-auto text-xs text-muted-foreground">
          {totalCount.toLocaleString()} event{totalCount === 1 ? "" : "s"}
        </span>
      </form>

      {/* Table */}
      <div className="border border-border bg-card">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex size-10 items-center justify-center border border-border bg-muted">
              <Search className="size-4 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {hasFilters ? "No matching events" : "No audit events yet"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {hasFilters
                ? "Try adjusting your search or filters."
                : "Platform-level admin actions will appear here."}
            </p>
            {hasFilters && (
              <Link
                className="mt-3 text-xs font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                href="/orbit/audit-log"
              >
                Clear filters
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 border-b border-border bg-muted/60 backdrop-blur-sm">
                <tr>
                  <th className="h-10 px-4 text-left text-2xs font-semibold uppercase tracking-ui text-muted-foreground whitespace-nowrap">
                    Event
                  </th>
                  <th className="h-10 px-4 text-left text-2xs font-semibold uppercase tracking-ui text-muted-foreground whitespace-nowrap">
                    Actor
                  </th>
                  <th className="h-10 px-4 text-left text-2xs font-semibold uppercase tracking-ui text-muted-foreground whitespace-nowrap">
                    Entity
                  </th>
                  <th className="h-10 px-4 text-left text-2xs font-semibold uppercase tracking-ui text-muted-foreground">
                    Description
                  </th>
                  <th className="h-10 px-4 text-right text-2xs font-semibold uppercase tracking-ui text-muted-foreground whitespace-nowrap">
                    When
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => (
                  <tr
                    className="transition-colors hover:bg-muted/30"
                    key={log.id}
                  >
                    {/* Action */}
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex max-w-40 items-center truncate px-1.5 py-0.5 font-mono text-2xs font-semibold uppercase tracking-ui ${actionBadgeClass(log.action)}`}
                          title={log.action}
                        >
                          {log.action}
                        </span>
                        <span className="text-2xs text-muted-foreground/60 uppercase tracking-ui">
                          {log.entityType}
                        </span>
                      </div>
                    </td>

                    {/* Actor */}
                    <td className="max-w-40 px-4 py-3 align-top">
                      <span
                        className="block truncate text-xs text-muted-foreground"
                        title={log.actorEmail ?? log.actorId ?? undefined}
                      >
                        {log.actorName
                          ? log.actorName
                          : (log.actorEmail ??
                            log.actorId ?? (
                              <span className="italic">System</span>
                            ))}
                      </span>
                      {log.actorName && log.actorEmail && (
                        <span
                          className="block truncate text-2xs text-muted-foreground/60"
                          title={log.actorEmail}
                        >
                          {log.actorEmail}
                        </span>
                      )}
                    </td>

                    {/* Entity */}
                    <td className="max-w-40 px-4 py-3 align-top">
                      {log.entityName ? (
                        <span
                          className="block truncate text-xs text-foreground"
                          title={log.entityName}
                        >
                          {log.entityName}
                        </span>
                      ) : log.entityId ? (
                        <span
                          className="block truncate font-mono text-2xs text-muted-foreground"
                          title={log.entityId}
                        >
                          {log.entityId.slice(0, 12)}…
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">
                          —
                        </span>
                      )}
                    </td>

                    {/* Description */}
                    <td className="min-w-50 px-4 py-3 align-top">
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {log.description}
                      </p>
                    </td>

                    {/* When */}
                    <td className="px-4 py-3 align-top text-right">
                      <time
                        className="whitespace-nowrap text-xs text-muted-foreground"
                        dateTime={log.createdAt.toISOString()}
                        title={log.createdAt.toISOString()}
                      >
                        {formatDateTime(log.createdAt)}
                      </time>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {(prevUrl || nextUrl || totalCount > 0) && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-xs text-muted-foreground">
              {totalCount === 0
                ? "No events"
                : `${from.toLocaleString()}–${to.toLocaleString()} of ${totalCount.toLocaleString()} events`}
            </span>
            <div className="flex gap-2">
              {prevUrl ? (
                <Link
                  className="h-7 border border-border bg-card px-3 text-xs font-semibold uppercase tracking-ui transition-colors hover:bg-accent inline-flex items-center"
                  href={prevUrl}
                >
                  ← Previous
                </Link>
              ) : (
                <span className="h-7 cursor-not-allowed border border-border bg-card px-3 text-xs font-semibold uppercase tracking-ui opacity-30 inline-flex items-center">
                  ← Previous
                </span>
              )}
              {nextUrl ? (
                <Link
                  className="h-7 border border-border bg-card px-3 text-xs font-semibold uppercase tracking-ui transition-colors hover:bg-accent inline-flex items-center"
                  href={nextUrl}
                >
                  Next →
                </Link>
              ) : (
                <span className="h-7 cursor-not-allowed border border-border bg-card px-3 text-xs font-semibold uppercase tracking-ui opacity-30 inline-flex items-center">
                  Next →
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
