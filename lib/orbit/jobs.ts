import { dbClient } from "@/lib/db";

export interface ActiveJobStat {
  count: number;
  name: string;
  state: string;
}

export interface FailedJobStat {
  count: number;
  lastError: string | null;
  name: string;
}

export interface JobQueueStatus {
  active: ActiveJobStat[];
  error?: string;
  failed: FailedJobStat[];
}

export async function getJobQueueStatus(): Promise<JobQueueStatus> {
  try {
    const [active, failed] = await Promise.all([
      dbClient<ActiveJobStat[]>`
        SELECT name, state, COUNT(*)::int AS count
        FROM pgboss.job
        GROUP BY name, state
        ORDER BY name, state
      `,
      dbClient<FailedJobStat[]>`
        SELECT
          name,
          COUNT(*)::int AS count,
          MAX(output->>'message') AS "lastError"
        FROM pgboss.job
        WHERE state = 'failed'
          AND createdon > NOW() - INTERVAL '24 hours'
        GROUP BY name
        ORDER BY count DESC
      `,
    ]);

    return { active, failed };
  } catch {
    return {
      active: [],
      failed: [],
      error: "Queue not initialized. Run the worker.",
    };
  }
}
