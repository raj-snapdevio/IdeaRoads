"use client";

import { Monitor, Phone, Tablet } from "lucide-react";
import {
  revokeSessionAction,
  signOutOtherSessionsAction,
} from "@/app/actions/profile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

export interface SessionRow {
  createdAt: string;
  expiresAt: string;
  id: string;
  ipAddress: string | null;
  isCurrent: boolean;
  userAgent: string | null;
}

function DeviceIcon({ userAgent }: { userAgent: string | null }) {
  if (!userAgent) return <Monitor className="size-4 text-muted-foreground" />;
  if (/iPhone|iPad|Android/i.test(userAgent)) {
    return /iPad/i.test(userAgent) ? (
      <Tablet className="size-4 text-muted-foreground" />
    ) : (
      <Phone className="size-4 text-muted-foreground" />
    );
  }
  return <Monitor className="size-4 text-muted-foreground" />;
}

function describeUserAgent(userAgent: string) {
  const browser = /Firefox/i.test(userAgent)
    ? "Firefox"
    : /Edg/i.test(userAgent)
      ? "Edge"
      : /Chrome/i.test(userAgent)
        ? "Chrome"
        : /Safari/i.test(userAgent)
          ? "Safari"
          : "Browser";
  const os = /Windows/i.test(userAgent)
    ? "Windows"
    : /Macintosh|Mac OS X/i.test(userAgent)
      ? "macOS"
      : /iPhone/i.test(userAgent)
        ? "iPhone"
        : /iPad/i.test(userAgent)
          ? "iPad"
          : /Android/i.test(userAgent)
            ? "Android"
            : /Linux/i.test(userAgent)
              ? "Linux"
              : "";
  return os ? `${browser} on ${os}` : browser;
}

function truncateIp(ip: string) {
  if (ip.length <= 20) return ip;
  return `${ip.slice(0, 18)}…`;
}

export function SessionsCard({ sessions }: { sessions: SessionRow[] }) {
  const otherSessionCount = sessions.filter((s) => !s.isCurrent).length;

  return (
    <section>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Active Sessions
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Devices and browsers currently signed in to your account.
          </p>
        </div>
        {otherSessionCount > 0 && (
          <form action={signOutOtherSessionsAction}>
            <Button size="sm" type="submit" variant="secondary">
              Sign out other sessions
            </Button>
          </form>
        )}
      </div>

      <div className="border border-border divide-y divide-border">
        {sessions.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No active sessions found.
          </p>
        )}
        {sessions.map((session) => (
          <div className="flex items-start gap-3 px-4 py-3.5" key={session.id}>
            {/* Device icon */}
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center border border-border bg-muted">
              <DeviceIcon userAgent={session.userAgent} />
            </div>

            {/* Session details */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {session.userAgent
                    ? describeUserAgent(session.userAgent)
                    : "Unknown device"}
                </span>
                {session.isCurrent && (
                  <Badge className="shrink-0 text-success">Current</Badge>
                )}
              </div>
              <p className="mt-1 max-w-full truncate text-xs text-muted-foreground">
                {session.userAgent ?? "No user agent recorded"}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                {session.ipAddress && (
                  <span className="font-mono" title={session.ipAddress}>
                    {truncateIp(session.ipAddress)}
                  </span>
                )}
                {session.ipAddress && <span>·</span>}
                <span>Signed in {formatDateTime(session.createdAt)}</span>
                <span>·</span>
                <span>Expires {formatDateTime(session.expiresAt)}</span>
              </div>
            </div>

            {/* Action */}
            <div className="shrink-0 pt-0.5">
              {session.isCurrent ? (
                <span className="text-xs text-muted-foreground">Protected</span>
              ) : (
                <form action={revokeSessionAction}>
                  <input name="sessionId" type="hidden" value={session.id} />
                  <Button size="sm" type="submit" variant="secondary">
                    Revoke
                  </Button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
