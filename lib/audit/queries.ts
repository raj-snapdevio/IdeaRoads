import { and, count, desc, eq, ilike } from "drizzle-orm";
import { auditLogs } from "@/db/schema";
import { db } from "@/lib/db";

export type AuditLogRow = typeof auditLogs.$inferSelect;

export async function listAuditLogs(
  workspaceId: string,
  opts: {
    page?: number;
    limit?: number;
    actorId?: string;
    actorEmail?: string;
    entityType?: string;
    action?: string;
  } = {}
): Promise<{ logs: AuditLogRow[]; total: number; hasMore: boolean }> {
  const {
    page = 1,
    limit = 50,
    actorId,
    actorEmail,
    entityType,
    action,
  } = opts;
  const offset = (page - 1) * limit;

  const conditions = [eq(auditLogs.workspaceId, workspaceId)];
  if (actorId) {
    conditions.push(eq(auditLogs.actorId, actorId));
  }
  if (actorEmail) {
    conditions.push(ilike(auditLogs.actorEmail, `%${actorEmail}%`));
  }
  if (entityType) {
    conditions.push(eq(auditLogs.entityType, entityType));
  }
  if (action) {
    conditions.push(eq(auditLogs.action, action));
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

  return {
    logs,
    total: Number(total),
    hasMore: offset + logs.length < Number(total),
  };
}
