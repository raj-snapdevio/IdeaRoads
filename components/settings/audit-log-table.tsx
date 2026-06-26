"use client";

import Link from "next/link";
import type { AuditLogRow } from "@/lib/audit/queries";

interface Props {
  filterAction?: string;
  filterEntityType?: string;
  hasMore: boolean;
  limit: number;
  logs: AuditLogRow[];
  page: number;
  total: number;
  workspaceSlug: string;
}

const ENTITY_TYPES = [
  "workspace",
  "post",
  "comment",
  "member",
  "webhook",
  "api_key",
  "changelog",
];

function buildUrl(
  slug: string,
  params: Record<string, string | number | undefined>
) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "" && v !== 1) {
      sp.set(k, String(v));
    }
  }
  const qs = sp.toString();
  return `/${slug}/settings/audit-log${qs ? `?${qs}` : ""}`;
}

export function AuditLogTable({
  logs,
  total,
  page,
  limit,
  hasMore,
  workspaceSlug,
  filterAction,
  filterEntityType,
}: Props) {
  const fmt = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const prevUrl =
    page > 1
      ? buildUrl(workspaceSlug, {
          page: page - 1,
          action: filterAction,
          entityType: filterEntityType,
        })
      : null;

  const nextUrl = hasMore
    ? buildUrl(workspaceSlug, {
        page: page + 1,
        action: filterAction,
        entityType: filterEntityType,
      })
    : null;

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <select
          className="h-8 border border-border bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(e) => {
            const val = e.target.value;
            window.location.href = buildUrl(workspaceSlug, {
              action: filterAction,
              entityType: val || undefined,
              page: 1,
            });
          }}
          value={filterEntityType ?? ""}
        >
          <option value="">All types</option>
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1).replace("_", " ")}
            </option>
          ))}
        </select>

        {(filterAction || filterEntityType) && (
          <Link
            className="h-8 inline-flex items-center px-3 border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
            href={`/${workspaceSlug}/settings/audit-log`}
          >
            Clear filters
          </Link>
        )}

        <span className="ml-auto h-8 flex items-center text-xs text-muted-foreground">
          {total} event{total === 1 ? "" : "s"}
        </span>
      </div>

      {/* Table */}
      {logs.length === 0 ? (
        <div className="border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No audit log entries found.
          </p>
        </div>
      ) : (
        <div className="border border-border divide-y divide-border">
          {logs.map((log) => (
            <div className="grid grid-cols-[1fr_auto] gap-4 p-4" key={log.id}>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-foreground bg-muted px-1.5 py-0.5 rounded-sm">
                    {log.action}
                  </span>
                  {log.entityName && (
                    <span className="text-sm text-foreground truncate">
                      {log.entityName}
                    </span>
                  )}
                </div>
                {log.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                    {log.description}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {log.actorName ?? log.actorEmail ?? "System"}
                  {log.entityType && (
                    <span className="ml-2 opacity-60">· {log.entityType}</span>
                  )}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-muted-foreground whitespace-nowrap">
                  {fmt.format(new Date(log.createdAt))}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {(prevUrl || nextUrl) && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Page {page} · {Math.min(page * limit, total)} of {total}
          </span>
          <div className="flex gap-2">
            {prevUrl ? (
              <Link
                className="px-3.5 py-1.5 text-sm border border-border hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                href={prevUrl}
              >
                Previous
              </Link>
            ) : (
              <span className="px-3.5 py-1.5 text-sm border border-border opacity-40 cursor-not-allowed">
                Previous
              </span>
            )}
            {nextUrl ? (
              <Link
                className="px-3.5 py-1.5 text-sm border border-border hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                href={nextUrl}
              >
                Next
              </Link>
            ) : (
              <span className="px-3.5 py-1.5 text-sm border border-border opacity-40 cursor-not-allowed">
                Next
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
