import { desc, isNull } from "drizzle-orm";
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
import { auditLogs } from "@/db/schema";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Audit Log" };

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function OrbitAuditLogPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const limit = 50;
  const offset = (page - 1) * limit;

  const logs = await db
    .select()
    .from(auditLogs)
    .where(isNull(auditLogs.workspaceId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  const actionColor = (action: string) => {
    if (
      action.includes("delete") ||
      action.includes("suspend") ||
      action.includes("revoke") ||
      action.includes("ban")
    ) {
      return "destructive";
    }
    if (
      action.includes("grant") ||
      action.includes("impersonation") ||
      action.includes("create")
    ) {
      return "default";
    }
    return "secondary";
  };

  return (
    <div>
      <OrbitPageHeader
        description="Platform-level admin actions — workspace suspension, admin grants, impersonation."
        eyebrow="Orbit"
        title="Platform Audit Log"
      />

      <div className="border border-border bg-card">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[20%]">Action</TableHead>
              <TableHead className="w-[20%]">Actor</TableHead>
              <TableHead className="w-[15%]">Target</TableHead>
              <TableHead className="w-[28%]">Description</TableHead>
              <TableHead className="w-[17%]">When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell
                  className="py-10 text-center text-muted-foreground"
                  colSpan={5}
                >
                  No platform-level audit events yet.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <Badge
                      className="font-mono text-2xs whitespace-nowrap"
                      variant={actionColor(log.action)}
                    >
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-0 text-xs text-muted-foreground">
                    <span className="block truncate">
                      {log.actorEmail ?? log.actorId ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-0 text-xs text-muted-foreground">
                    <span className="block truncate">
                      {log.entityName ?? log.entityId ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-0 text-xs">
                    <span className="block truncate">{log.description}</span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(log.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {logs.length === limit && (
          <div className="flex items-center justify-end border-t border-border px-4 py-3">
            <div className="flex gap-2">
              {page > 1 && (
                <a
                  className="border border-border bg-card px-3 py-1.5 text-xs font-semibold uppercase tracking-ui hover:bg-accent"
                  href={`/orbit/audit-log?page=${page - 1}`}
                >
                  ← Previous
                </a>
              )}
              <a
                className="border border-border bg-card px-3 py-1.5 text-xs font-semibold uppercase tracking-ui hover:bg-accent"
                href={`/orbit/audit-log?page=${page + 1}`}
              >
                Next →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
