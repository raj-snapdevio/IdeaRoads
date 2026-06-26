import { desc } from "drizzle-orm";
import { OrbitPageHeader } from "@/components/admin/orbit-page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { emailEvents, emailOutbox } from "@/db/schema";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";

export const metadata = {
  title: "Email",
};

export default async function OrbitEmailPage() {
  const [outbox, events] = await Promise.all([
    db
      .select()
      .from(emailOutbox)
      .orderBy(desc(emailOutbox.createdAt))
      .limit(50),
    db
      .select()
      .from(emailEvents)
      .orderBy(desc(emailEvents.receivedAt))
      .limit(50),
  ]);

  return (
    <div>
      <OrbitPageHeader
        description="Transactional email queue and inbound delivery events."
        eyebrow="Admin"
        title="Email"
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Outbox</CardTitle>
            <CardDescription>
              Queued and delivered transactional emails.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[38%]">Recipient</TableHead>
                  <TableHead className="w-[38%]">Subject</TableHead>
                  <TableHead className="w-[14%]">Status</TableHead>
                  <TableHead className="w-[10%] text-right">Attempts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outbox.map((email) => (
                  <TableRow key={email.id}>
                    <TableCell className="max-w-0">
                      <span className="block truncate text-sm">
                        {email.payload.to}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-0">
                      <span className="block truncate text-sm text-muted-foreground">
                        {email.payload.subject}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          email.status === "sent"
                            ? "text-success"
                            : "text-warning"
                        }
                      >
                        {email.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {email.attemptCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Events</CardTitle>
            <CardDescription>
              Inbound webhook events from your SMTP provider.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[22%]">Type</TableHead>
                  <TableHead className="w-[45%]">Recipient</TableHead>
                  <TableHead className="w-[33%]">Received</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <span className="block truncate text-sm">
                        {event.eventType}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-0">
                      <span className="block truncate text-sm text-muted-foreground">
                        {event.recipient ?? "-"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(event.receivedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
