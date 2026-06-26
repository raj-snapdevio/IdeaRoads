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
import { getJobQueueStatus } from "@/lib/orbit/jobs";

export const metadata = { title: "Job Queue" };

export default async function OrbitJobsPage() {
  const { active, failed, error } = await getJobQueueStatus();

  return (
    <div>
      <OrbitPageHeader
        description="pg-boss background job status. Start the worker to populate."
        eyebrow="Orbit"
        title="Job Queue"
      />

      {error && (
        <div className="mb-6 border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
          {error}
        </div>
      )}

      {/* Active jobs */}
      <div className="mb-6 border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-semibold text-sm">Active Jobs</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Queue name</TableHead>
              <TableHead>State</TableHead>
              <TableHead className="text-right">Count</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {active.length === 0 ? (
              <TableRow>
                <TableCell
                  className="py-6 text-center text-muted-foreground"
                  colSpan={3}
                >
                  No active jobs.
                </TableCell>
              </TableRow>
            ) : (
              active.map((job) => (
                <TableRow key={`${job.name}:${job.state}`}>
                  <TableCell className="font-mono text-sm">
                    {job.name}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        job.state === "completed"
                          ? "text-success"
                          : "text-warning"
                      }
                    >
                      {job.state}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {job.count}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Failed jobs (last 24h) */}
      <div className="border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-semibold text-sm">Failed Jobs (last 24h)</h2>
        </div>
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[25%]">Queue name</TableHead>
              <TableHead className="w-[12%] text-right">Count</TableHead>
              <TableHead className="w-[63%]">Last error</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {failed.length === 0 ? (
              <TableRow>
                <TableCell
                  className="py-6 text-center text-muted-foreground"
                  colSpan={3}
                >
                  No failures in the last 24 hours.
                </TableCell>
              </TableRow>
            ) : (
              failed.map((job) => (
                <TableRow key={job.name}>
                  <TableCell className="font-mono text-sm">
                    {job.name}
                  </TableCell>
                  <TableCell className="text-right font-mono text-destructive">
                    {job.count}
                  </TableCell>
                  <TableCell className="max-w-0 font-mono text-xs text-muted-foreground">
                    <span className="block truncate">
                      {job.lastError ?? "—"}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
