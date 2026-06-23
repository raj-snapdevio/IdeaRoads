# Feature 11 — Notifications

## Overview

IdeaRoads delivers notifications through two channels: **email** (via Nodemailer SMTP, sent through pg-boss jobs) and **in-app** (a bell icon in the navbar with an unread count badge and a full notification list page). This feature consolidates all notification types already stubbed across Features 03–10, wires them to the `notifications` table, and builds the in-app notification UI. Email delivery handlers are finalised here too.

---

## Notification Types

### Email Notifications

| Event | Recipient | Trigger | Handler |
|---|---|---|---|
| New post submitted | Workspace Owner + Admins | Post approved | `send-new-post-alert.ts` |
| Post status changed | Post voters | Status changed | `send-status-change-email.ts` |
| New comment on post | Post author | Top-level comment approved | `send-new-comment-email.ts` |
| Reply to comment | Parent comment author | Reply approved | `send-comment-reply-email.ts` |
| Workspace invite | Invitee | Invite created | `send-workspace-invite-email.ts` |
| Member removed | Removed member | Member removed | `send-member-removed-email.ts` |
| Workspace deleted | All members | Workspace deleted | `send-workspace-deleted-email.ts` |
| Changelog published | Voters of linked posts | Entry published | `send-changelog-email.ts` |

### In-App Notifications

| Type | Recipient | Trigger | Link |
|---|---|---|---|
| `new_post` | Workspace Owner + Admins | Post approved | Post detail page |
| `status_change` | Post voters (signed-in) | Status changed | Post detail page |
| `new_comment` | Post author (signed-in) | Top-level comment approved | Post detail page |
| `reply` | Parent comment author (signed-in) | Reply approved | Post detail page |
| `invite_accepted` | Workspace inviter | Invite accepted | Members settings |
| `member_removed` | Removed member | Member removed | Dashboard |
| `changelog_published` | Post voters (signed-in) | Entry published | Changelog entry page |

> **Note:** In-app notifications are only created for signed-in users (`user_id` required). Guest voters and guest commenters receive emails only — no in-app notification since they have no account.

---

## Core Behaviour

- All email sending goes through pg-boss — no synchronous SMTP calls in API routes
- In-app notifications are inserted into the `notifications` table by the same job handlers that send emails
- Notification bell shows total unread count across all workspaces the user belongs to
- Unread count refreshed by client-side polling every 30 seconds (no WebSocket/SSE in MVP)
- Clicking a notification marks it as read and navigates to the linked page
- "Mark all as read" on the notifications page marks all unread as read
- Notifications are never hard-deleted — they accumulate (post-MVP: add cleanup/archive)
- No per-user email preference UI in MVP — all email notifications enabled by default
- Self-notification suppressed: users do not receive notifications for their own actions

---

## Dependencies

```
pg-boss                    — job queue for all email sends
nodemailer                 — SMTP email delivery
@react-email/components    — React components for email templates
@react-email/render        — Render React Email components → HTML string (server-side only)
sonner                     — toast for in-app errors
```

---

## Environment Variables

```env
# SMTP (all email notifications)
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
EMAIL_FROM="IdeaRoads <noreply@yourdomain.com>"

NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="IdeaRoads"
```

---

## Database Schema

### `email_preferences`

```ts
id              text        PK  (cuid2)
email           text        NOT NULL UNIQUE   -- keyed by email, not user_id (guest voters have no account)
status_change   boolean     NOT NULL  DEFAULT true   -- receive status-change emails
changelog       boolean     NOT NULL  DEFAULT true   -- receive changelog notification emails
created_at      timestamp   NOT NULL  DEFAULT now()
updated_at      timestamp   NOT NULL  DEFAULT now()
```

**How it works:** A row is created on first unsubscribe. `false` = opted out of that notification type. Missing row = all notifications enabled (opt-out model — no row required for default behaviour).

**Indexes:**
- Index on `email` — looked up before every outgoing notification email

---

### `email_outbox`

```ts
id          text        PK  (cuid2)
to_email    text        NOT NULL
subject     text        NOT NULL
html_body   text        NOT NULL
status      text        NOT NULL  DEFAULT 'queued'
            -- 'queued' | 'sending' | 'sent' | 'failed'
attempts    integer     NOT NULL  DEFAULT 0
last_error  text                  -- last SMTP error message
created_at  timestamp   NOT NULL  DEFAULT now()
updated_at  timestamp   NOT NULL  DEFAULT now()
```

**Why this exists:** Email jobs can be lost if the app crashes between enqueuing a job and the worker executing it. The `email_outbox` table is written first (inside the same DB transaction as the action that triggers the email), then the pg-boss job is enqueued. If the app restarts, the `CLEANUP_EMAIL_OUTBOX` cron finds any rows stuck in `queued` and re-enqueues them. This ensures zero email loss.

**Indexes:**
- Index on `status` — cleanup cron query
- Index on `created_at` — pruning old rows

---

### `notifications`

```ts
id            text          PK  (cuid2)
user_id       text          NOT NULL  → user.id (CASCADE DELETE)
workspace_id  text          NOT NULL  → workspaces.id (CASCADE DELETE)
type          text          NOT NULL
              -- 'new_post' | 'status_change' | 'new_comment' | 'reply'
              -- 'invite_accepted' | 'member_removed' | 'changelog_published'
title         text          NOT NULL   -- short summary e.g. "Status changed to Planned"
body          text                     -- longer description (optional)
link          text          NOT NULL   -- relative URL to navigate to on click
is_read       boolean       NOT NULL   DEFAULT false
created_at    timestamp     NOT NULL   DEFAULT now()
```

**Indexes:**
- Index on `(user_id, is_read)` — unread count query
- Index on `(user_id, created_at DESC)` — notification list query
- Index on `workspace_id`

---

## File Structure

```
app/
├── (workspace)/
│   └── [ws-slug]/
│       └── notifications/
│           └── page.tsx                Full notifications list page
└── api/
    └── notifications/
        ├── route.ts                    GET list / PATCH mark-all-read
        └── [notificationId]/
            └── route.ts                PATCH mark-as-read

components/
└── notifications/
    ├── notification-bell.tsx           Navbar bell icon with unread badge
    ├── notification-item.tsx           Single notification row
    ├── notification-list.tsx           Full scrollable list
    └── notification-empty-state.tsx    Empty state illustration

lib/
├── notifications/
│   ├── queries.ts                      Read operations
│   ├── create.ts                       Insert notification row
│   └── index.ts
└── worker/
    ├── queue.ts                        pg-boss instance (singleton)
    ├── scheduler.ts                    Cron job registration
    ├── job-types.ts                    All job type constants
    └── handlers/
        ├── send-email.ts                       Process email_outbox row → Nodemailer SMTP
        ├── send-new-post-alert.ts
        ├── send-status-change-email.ts
        ├── send-new-comment-email.ts
        ├── send-comment-reply-email.ts
        ├── send-workspace-invite-email.ts
        ├── send-member-removed-email.ts
        ├── send-workspace-deleted-email.ts
        ├── send-changelog-email.ts
        ├── cleanup-expired-invites.ts
        ├── cleanup-read-notifications.ts       Cron — 3am daily, prune >90 days
        └── cleanup-email-outbox.ts             Cron — 4am daily, prune sent rows >30 days

db/schema/
└── email-outbox.ts                     email_outbox table definition

lib/email/
├── index.ts                            enqueueEmail() — insert email_outbox row + enqueue SEND_EMAIL
├── transporter.ts                      Nodemailer transporter singleton
├── renderer.ts                         render(ReactEmailComponent) → HTML string (server-side only)
└── templates/                          React Email components (not plain HTML strings)
    ├── layout.tsx                      Base email layout (header, footer, brand colors)
    ├── new-post-alert.tsx
    ├── status-change.tsx
    ├── new-comment.tsx
    ├── comment-reply.tsx
    ├── workspace-invite.tsx
    ├── member-removed.tsx
    ├── workspace-deleted.tsx
    └── changelog-published.tsx
```

---

## Implementation Details

### `lib/email/index.ts` — Durable Email Outbox

```ts
enqueueEmail({ to, subject, html })
  → INSERT INTO email_outbox { to_email: to, subject, html_body: html, status: 'queued' }
  → await queue.send(JOB_NAMES.SEND_EMAIL, { outboxId: row.id })
  → returns void

  Pattern: DB row is written FIRST, then the job enqueued.
  If the app crashes between these two lines, the CLEANUP_EMAIL_OUTBOX cron (4am daily)
  finds rows stuck in 'queued' and re-enqueues them. Zero email loss.
```

All email handlers call `enqueueEmail()` — they NEVER call `transporter.sendMail()` directly.

**Usage in a handler:**
```ts
// In send-status-change-email.ts
const html = await render(<StatusChangeEmail postTitle={post.title} newStatus={status} />)
await enqueueEmail({
  to: voter.email,
  subject: `Status update: "${post.title}"`,
  html,
})
await createNotification({ userId: voter.userId, ... })
```

---

### `lib/worker/handlers/send-email.ts`

```ts
// Processes a single email_outbox row
handler: async ({ data: { outboxId } }) => {
  // 1. Claim the row atomically
  const row = await db.transaction(async (tx) => {
    const [r] = await tx
      .update(emailOutbox)
      .set({ status: "sending", attempts: sql`attempts + 1`, updatedAt: new Date() })
      .where(and(eq(emailOutbox.id, outboxId), eq(emailOutbox.status, "queued")))
      .returning()
    return r
  })
  if (!row) return  // already being processed by another worker

  try {
    await transporter.sendMail({
      to: row.toEmail,
      subject: row.subject,
      html: row.htmlBody,
    })
    await db.update(emailOutbox)
      .set({ status: "sent", updatedAt: new Date() })
      .where(eq(emailOutbox.id, outboxId))
  } catch (err) {
    await db.update(emailOutbox)
      .set({ status: "failed", lastError: err.message, updatedAt: new Date() })
      .where(eq(emailOutbox.id, outboxId))
    throw err  // let pg-boss retry
  }
}
```

---

### `lib/email/renderer.ts`

```ts
import { render } from "@react-email/render"

export async function renderEmail(component: React.ReactElement): Promise<string> {
  return render(component)
  // Returns full HTML string with inline styles
  // Must be called server-side only (Node.js environment)
}
```

---

### `lib/email/templates/layout.tsx`

Base layout shared by all email templates:

```tsx
export function EmailLayout({ children, preview }: { children: React.ReactNode; preview: string }) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f9f9f9" }}>
        <Container>
          {/* IdeaRoads header */}
          <Section>
            <Text style={{ fontWeight: "bold" }}>{env.NEXT_PUBLIC_APP_NAME}</Text>
          </Section>
          {children}
          {/* Footer with unsubscribe link — required by CAN-SPAM / GDPR */}
          <Section>
            <Text style={{ fontSize: "12px", color: "#888" }}>
              You're receiving this because you voted on a post in {workspaceName}.{" "}
              <Link href={unsubscribeUrl}>Unsubscribe</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
```

---

### `lib/notifications/create.ts`

```ts
createNotification({
  userId,
  workspaceId,
  type,
  title,
  body?,
  link,
})
  → validates: userId and workspaceId are non-null (skip silently if null — guest action)
  → inserts notification row
  → returns notification

  Called from inside job handlers AFTER email is sent
  (if email send fails, in-app notification is still created)
```

---

### `lib/notifications/queries.ts`

```ts
getUnreadCount(userId)
  → SELECT COUNT(*) FROM notifications
    WHERE user_id = userId AND is_read = false
  → returns number

listNotifications(userId, { page = 1, limit = 30 })
  → SELECT * FROM notifications WHERE user_id = userId
  → ORDER BY created_at DESC
  → LIMIT limit OFFSET (page - 1) * limit
  → returns { notifications: Notification[], total, hasMore }

markAsRead(notificationId, userId)
  → UPDATE notifications SET is_read = true
    WHERE id = notificationId AND user_id = userId
  → returns void

markAllAsRead(userId, workspaceId?)
  → UPDATE notifications SET is_read = true
    WHERE user_id = userId
    AND is_read = false
    AND (workspaceId ? workspace_id = workspaceId : true)
  → returns { count: number }   -- rows updated
```

---

### `lib/worker/queue.ts` — pg-boss Singleton

```ts
import PgBoss from "pg-boss"

let boss: PgBoss | null = null

export async function getQueue(): Promise<PgBoss> {
  if (!boss) {
    boss = new PgBoss({
      connectionString: process.env.DATABASE_URL,
      retryLimit: 3,
      retryDelay: 30,      // 30 seconds between retries
      expireInHours: 24,   // job expires after 24 hours if not processed
    })
    await boss.start()
    await registerHandlers(boss)
  }
  return boss
}

export async function enqueue<T>(
  jobName: string,
  data: T,
  options?: PgBoss.SendOptions
) {
  const queue = await getQueue()
  return queue.send(jobName, data, options)
}
```

---

### `lib/worker/job-types.ts`

```ts
export const JobType = {
  SEND_NEW_POST_ALERT:            "SEND_NEW_POST_ALERT",
  SEND_STATUS_CHANGE_EMAIL:       "SEND_STATUS_CHANGE_EMAIL",
  SEND_NEW_COMMENT_EMAIL:         "SEND_NEW_COMMENT_EMAIL",
  SEND_COMMENT_REPLY_EMAIL:       "SEND_COMMENT_REPLY_EMAIL",
  SEND_WORKSPACE_INVITE_EMAIL:    "SEND_WORKSPACE_INVITE_EMAIL",
  SEND_MEMBER_REMOVED_EMAIL:      "SEND_MEMBER_REMOVED_EMAIL",
  SEND_WORKSPACE_DELETED_EMAIL:   "SEND_WORKSPACE_DELETED_EMAIL",
  SEND_CHANGELOG_EMAIL:           "SEND_CHANGELOG_EMAIL",
  CLEANUP_EXPIRED_INVITES:        "CLEANUP_EXPIRED_INVITES",
  CLEANUP_READ_NOTIFICATIONS:     "CLEANUP_READ_NOTIFICATIONS",
  CLEANUP_WEBHOOK_DELIVERIES:     "CLEANUP_WEBHOOK_DELIVERIES",
} as const

export type JobType = typeof JobType[keyof typeof JobType]
```

---

### `lib/worker/scheduler.ts` — Cron Jobs

```ts
import { getQueue } from "./queue"

export async function registerCronJobs() {
  const boss = await getQueue()

  // Nightly at 2am — remove expired invites
  await boss.schedule(
    JobType.CLEANUP_EXPIRED_INVITES,
    "0 2 * * *",
    {},
    { tz: "UTC" }
  )

  // Nightly at 3am — delete read notifications older than 90 days
  await boss.schedule(
    JobType.CLEANUP_READ_NOTIFICATIONS,
    "0 3 * * *",
    {},
    { tz: "UTC" }
  )

  // Nightly at 4am — delete webhook delivery rows older than 30 days
  await boss.schedule(
    JobType.CLEANUP_WEBHOOK_DELIVERIES,
    "0 4 * * *",
    {},
    { tz: "UTC" }
  )
}
```

---

### `lib/email/transporter.ts` — Nodemailer Singleton

```ts
import nodemailer from "nodemailer"

let _transporter: nodemailer.Transporter | null = null

export function getTransporter(): nodemailer.Transporter {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }
  return _transporter
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string
  subject: string
  html: string
  text: string
}) {
  const transporter = getTransporter()
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
    text,
  })
}
```

---

## Job Handlers

All handlers follow the same pattern:

```ts
// Example: send-status-change-email.ts
import { sendEmail } from "@/lib/email/transporter"
import { createNotification } from "@/lib/notifications/create"
import { renderStatusChangeEmail } from "@/lib/email/templates/status-change"

export async function handleSendStatusChangeEmail(job: {
  data: StatusChangeEmailPayload
}) {
  const { voterEmail, voterName, voterUserId, postTitle, postUrl,
          fromStatus, toStatus, note, workspaceName, workspaceId } = job.data

  // 1. Create in-app notification first (only if voter has an account)
  //    Must happen before sendEmail so it is not lost if SMTP throws
  if (voterUserId) {
    await createNotification({
      userId: voterUserId,
      workspaceId,
      type: "status_change",
      title: `"${postTitle}" is now ${formatStatus(toStatus)}`,
      body: note ?? undefined,
      link: postUrl,
    })
  }

  // 2. Send email — pg-boss retries this handler on failure, but the
  //    in-app notification (step 1) is already committed and will not be duplicated
  //    because createNotification is idempotent on (userId, type, link)
  await sendEmail({
    to: voterEmail,
    subject: `Update on "${postTitle}": now ${formatStatus(toStatus)}`,
    html: renderStatusChangeEmail({ ... }),
    text: `The post "${postTitle}" in ${workspaceName} is now ${toStatus}. View it at: ${postUrl}`,
  })
}
```

**Self-notification suppression** is handled by the calling service (before enqueue), not in the handler:
```ts
// In changeStatus() service — exclude the admin who changed the status:
const votersExcludingSelf = voters.filter(v => v.userId !== changedBy)
for (const voter of votersExcludingSelf) {
  await enqueue(JobType.SEND_STATUS_CHANGE_EMAIL, { ...payload, voterUserId: voter.userId })
}

// In createPost() / approvePost() service — exclude the admin who submitted/approved the post:
const adminsExcludingAuthor = workspaceAdmins.filter(a => a.userId !== post.authorId)
for (const admin of adminsExcludingAuthor) {
  await enqueue(JobType.SEND_NEW_POST_ALERT, { ...payload, adminUserId: admin.userId, adminEmail: admin.email })
}
```

---

## All Job Handler Payloads (Consolidated)

### `SEND_NEW_POST_ALERT`
```ts
{
  postId: string
  postTitle: string
  postUrl: string
  authorName: string
  boardName: string
  workspaceName: string
  workspaceId: string
  adminUserId: string       // one job per admin
  adminEmail: string
}
```

### `SEND_STATUS_CHANGE_EMAIL`
```ts
{
  voterEmail: string
  voterName: string
  voterUserId: string | null
  postTitle: string
  postUrl: string
  fromStatus: string
  toStatus: string
  note: string | null
  workspaceName: string
  workspaceId: string
}
```

### `SEND_NEW_COMMENT_EMAIL`
```ts
{
  postAuthorEmail: string
  postAuthorName: string
  postAuthorUserId: string | null
  postTitle: string
  postUrl: string
  commenterName: string
  commentBody: string
  workspaceName: string
  workspaceId: string
}
```

### `SEND_COMMENT_REPLY_EMAIL`
```ts
{
  parentAuthorEmail: string
  parentAuthorName: string
  parentAuthorUserId: string | null
  postTitle: string
  postUrl: string
  replierName: string
  replyBody: string
  workspaceName: string
  workspaceId: string
}
```

### `SEND_WORKSPACE_INVITE_EMAIL`
```ts
{
  inviteId: string
  email: string
  workspaceName: string
  workspaceId: string
  inviterName: string
  role: string
  inviteUrl: string
  expiresAt: string
}
```

### `SEND_MEMBER_REMOVED_EMAIL`
```ts
{
  removedUserEmail: string
  removedUserName: string
  removedUserId: string | null
  workspaceName: string
  workspaceId: string
  removedByName: string
}
```

### `SEND_WORKSPACE_DELETED_EMAIL`
```ts
{
  memberEmail: string
  memberName: string
  workspaceName: string
  ownerName: string
}
```

### `SEND_CHANGELOG_EMAIL`
```ts
{
  voterEmail: string
  voterName: string
  voterUserId: string | null
  entryTitle: string
  entryLabel: string
  entryUrl: string
  entryBodyPreview: string
  linkedPostTitle: string
  workspaceName: string
  workspaceId: string
}
```

---

## API Routes

### `app/api/notifications/route.ts`

**GET** — List notifications
```
Auth: requireSession
Query: page=1, limit=30, workspaceId? (filter by workspace)
Returns: {
  notifications: Notification[],
  total: number,
  hasMore: boolean,
  unreadCount: number
}
```

**PATCH** — Mark all as read
```
Auth: requireSession
Body: { workspaceId?: string }  -- optional: mark all read in one workspace only
Returns: { count: number }       -- number of notifications marked read
```

---

### `app/api/notifications/[notificationId]/route.ts`

**PATCH** — Mark single notification as read
```
Auth: requireSession
Validates: notification belongs to current user
Returns: updated notification
```

---

### `app/api/notifications/count/route.ts`

**GET** — Get unread count only (lightweight — used for polling)
```
Auth: requireSession
Returns: { unreadCount: number }
Cache-Control: no-store (always fresh)
```

---

## Components

### `components/notifications/notification-bell.tsx`

Client component — in the workspace navbar:

```
┌─────────────────┐
│  🔔  3          │  ← bell icon + red badge if unread > 0
└─────────────────┘
```

**Behaviour:**
- Polls `GET /api/notifications/count` every 30 seconds when tab is active
- Stops polling when tab is hidden (`document.visibilityState === 'hidden'`)
- Badge shows unread count (capped at display "99+" if > 99)
- Clicking navigates to `/{ws-slug}/notifications` (not a dropdown — full page)
- Badge disappears after visiting notifications page (mark all read called)
- Uses `useEffect` + `setInterval` for polling — clears on unmount

**Polling implementation:**
```ts
useEffect(() => {
  const fetchCount = async () => {
    if (document.visibilityState === 'hidden') return
    const res = await fetch('/api/notifications/count')
    const data = await res.json()
    setUnreadCount(data.unreadCount)
  }

  fetchCount()
  const interval = setInterval(fetchCount, 30_000)
  document.addEventListener('visibilitychange', fetchCount)

  return () => {
    clearInterval(interval)
    document.removeEventListener('visibilitychange', fetchCount)
  }
}, [])
```

---

### `components/notifications/notification-item.tsx`

Single notification row:

```
┌──────────────────────────────────────────────────────┐
│  ●  "Dark mode support" is now Planned               │  ← title
│     A feature you voted for was updated · 2h ago     │  ← body + relative time
│                                              [unread] │  ← blue dot if unread
└──────────────────────────────────────────────────────┘
```

**Props:**
```ts
{
  notification: Notification
  onRead: (id: string) => void
}
```

**Behaviour:**
- Clicking the row:
  1. If `is_read = false`: calls `PATCH /api/notifications/[id]` to mark read
  2. Calls `onRead(id)` to update local state optimistically
  3. Navigates to `notification.link`
- Unread: slightly highlighted background + blue dot indicator
- Read: normal background, no dot
- Type icon shown next to text:

| Type | Icon |
|---|---|
| `new_post` | FileText |
| `status_change` | ArrowRight |
| `new_comment` | MessageCircle |
| `reply` | CornerDownRight |
| `invite_accepted` | UserCheck |
| `member_removed` | UserX |
| `changelog_published` | Megaphone |

---

### `components/notifications/notification-list.tsx`

Client component — used on the full notifications page:

```
Notifications                          [Mark all as read]
─────────────────────────────────────────────────────────
● "Dark mode" is now Planned · 2h ago
● New comment on "Dark mode" · 3h ago
  "Great idea! We've been waiting for this..."
─ [older notifications] ─────────────────────────────────
  "API Rate Limiting" is now Completed · 2d ago
```

**Behaviour:**
- Groups: "Today", "This Week", "Earlier" — by `created_at`
- Infinite scroll or "Load more" pagination (30 per page)
- "Mark all as read" button → `PATCH /api/notifications` → all unread marked read
- Calls `onRead` for each item when clicked
- Shows `<NotificationEmptyState />` if no notifications

---

### `components/notifications/notification-empty-state.tsx`

Shown when user has no notifications:

```
  🔔
  No notifications yet
  "When posts you've voted on get updates,
   or when someone comments on your posts,
   you'll see them here."
```

---

## Notification Page

### `app/(workspace)/[ws-slug]/notifications/page.tsx`

Server component:
- Fetches first page of notifications on server
- Passes to `<NotificationList />` as initial data
- Marks all unread as read for this workspace on page load:
  - `markAllAsRead(userId, workspaceId)` called server-side on page load
  - This resets the bell badge when the user visits the page
- Shows notification count: "{n} notifications"

---

## Email Templates

All templates follow a consistent base layout:

```
┌─────────────────────────────────┐
│  IdeaRoads                      │  ← logo / app name
├─────────────────────────────────┤
│                                 │
│  {headline}                     │
│                                 │
│  {body paragraph}               │
│                                 │
│  [Primary CTA Button]           │
│                                 │
│  ─────────────────────────────  │
│  You're receiving this because  │
│  {reason}.                      │
│                                 │
│  © 2026 IdeaRoads contributors  │
└─────────────────────────────────┘
```

Each template is a function returning `{ html: string, text: string }`:

```ts
// lib/email/templates/status-change.ts
export function renderStatusChangeEmail(data: {
  postTitle: string
  fromStatus: string
  toStatus: string
  postUrl: string
  note: string | null
  workspaceName: string
}): { html: string; text: string } {
  return {
    html: `...HTML string with inline styles...`,
    text: `The post "${data.postTitle}" in ${data.workspaceName} changed from ${data.fromStatus} to ${data.toStatus}.\n\nView it: ${data.postUrl}`,
  }
}
```

**Styling:** Inline CSS only (email client compatibility). No external stylesheets. Simple, clean layout — not pixel-perfect marketing email.

---

## Worker Startup

pg-boss needs to start and register handlers when the application boots. In Next.js App Router this is done in a **startup file** called from the app's initialisation:

```ts
// lib/worker/startup.ts
import { getQueue } from "./queue"
import { JobType } from "./job-types"
import { handleSendNewPostAlert } from "./handlers/send-new-post-alert"
import { handleSendStatusChangeEmail } from "./handlers/send-status-change-email"
// ... all handlers

export async function startWorker() {
  const boss = await getQueue()

  await boss.work(JobType.SEND_NEW_POST_ALERT, handleSendNewPostAlert)
  await boss.work(JobType.SEND_STATUS_CHANGE_EMAIL, handleSendStatusChangeEmail)
  await boss.work(JobType.SEND_NEW_COMMENT_EMAIL, handleSendNewCommentEmail)
  await boss.work(JobType.SEND_COMMENT_REPLY_EMAIL, handleSendCommentReplyEmail)
  await boss.work(JobType.SEND_WORKSPACE_INVITE_EMAIL, handleSendWorkspaceInviteEmail)
  await boss.work(JobType.SEND_MEMBER_REMOVED_EMAIL, handleSendMemberRemovedEmail)
  await boss.work(JobType.SEND_WORKSPACE_DELETED_EMAIL, handleSendWorkspaceDeletedEmail)
  await boss.work(JobType.SEND_CHANGELOG_EMAIL, handleSendChangelogEmail)
  await boss.work(JobType.CLEANUP_EXPIRED_INVITES, handleCleanupExpiredInvites)
  await boss.work(JobType.CLEANUP_READ_NOTIFICATIONS, handleCleanupReadNotifications)
  await boss.work(JobType.CLEANUP_WEBHOOK_DELIVERIES, handleCleanupWebhookDeliveries)

  await registerCronJobs()
}
```

**Called from:** `app/layout.tsx` root layout using a server-side singleton guard:
```ts
// app/layout.tsx (server component)
import { startWorker } from "@/lib/worker/startup"
if (process.env.NODE_ENV !== "test") {
  startWorker().catch(console.error)
}
```

---

## Self-Notification Suppression

Applied at the **enqueue callsite** (in service functions), not in job handlers:

| Event | Suppression Rule |
|---|---|
| New post alert | Admin who submitted the post does not get alerted to their own post |
| Status change | Admin who changed the status does not get notified if they voted |
| New comment | Post author who is also the commenter is suppressed |
| Comment reply | Parent commenter who is also the replier is suppressed |
| Invite accepted | N/A — inviter receives notification, not invitee |
| Member removed | Removed user receives email — no in-app (they can't access workspace) |

---

## User Flows

### User Receives New Post Notification (Admin)

```
1. User submits feedback post on public board
2. createPost() → post approved → enqueues SEND_NEW_POST_ALERT per admin
3. pg-boss processes job
4. Handler: sends email to admin → creates in-app notification for admin
5. Admin's notification bell badge shows +1
6. Admin visits /{ws-slug}/notifications
7. markAllAsRead() called server-side on page load
8. Sees: "New post: 'Dark mode support' on Feature Requests · 5m ago"
9. Clicks notification → navigates to post detail
10. Bell badge clears
```

### Voter Receives Status Change Notification

```
1. Admin changes post status from 'open' → 'planned'
2. changeStatus() → enqueues SEND_STATUS_CHANGE_EMAIL per voter (excluding admin self)
3. pg-boss processes jobs
4. Per voter:
   a. Sends email: "Update on 'Dark mode': now Planned"
   b. If voter has account: creates in-app notification
5. Voter's bell badge shows +1
6. Voter clicks bell → navigates to /{ws-slug}/notifications
7. Sees: "'Dark mode support' is now Planned"
8. Clicks → navigates to post detail
```

### User Marks Individual Notification as Read

```
1. User sees notification list
2. Clicks a specific unread notification
3. Optimistic: notification background changes to "read" state, dot removed
4. PATCH /api/notifications/[id]
5. Navigation to notification.link
6. Unread count in bell decrements
```

### User Marks All Notifications as Read

```
1. User is on /{ws-slug}/notifications page
   (all read on page load) OR
2. User clicks "Mark all as read" button
3. PATCH /api/notifications { workspaceId }
4. All unread notifications in this workspace marked read
5. Bell badge clears
6. All notification rows lose unread styling
```

### Bell Badge Refresh

```
1. User is on any workspace page
2. NotificationBell component polling every 30s
3. Another user triggers an event (votes, comments, etc.)
4. On next poll: GET /api/notifications/count returns new count
5. Badge updates — no page reload required
```

---

## API Reference

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/notifications` | Session | List notifications (paginated) |
| PATCH | `/api/notifications` | Session | Mark all as read |
| GET | `/api/notifications/count` | Session | Get unread count only |
| PATCH | `/api/notifications/[id]` | Session | Mark single notification as read |
| GET | `/api/unsubscribe` | None (signed token) | One-click unsubscribe (CAN-SPAM compliant) |

### Unsubscribe Endpoint — `GET /api/unsubscribe`

No login required. Link appears in the footer of every outgoing notification email.

**Query params:** `?email=<email>&type=<type>&token=<hmac>`

**Token generation (at email send time):**
```ts
const payload = `${email}:${type}`
const token = createHmac("sha256", env.APP_SECRET).update(payload).digest("hex")
const unsubscribeUrl = `${env.NEXT_PUBLIC_APP_URL}/api/unsubscribe?email=${encodeURIComponent(email)}&type=${type}&token=${token}`
```

**Verification (at route handler):**
```ts
const expected = createHmac("sha256", env.APP_SECRET).update(`${email}:${type}`).digest("hex")
if (!timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
  return Response.json({ error: "Invalid token" }, { status: 400 })
}
// Upsert email_preferences row: set status_change = false OR changelog = false
await db.insert(emailPreferences)
  .values({ email, [type]: false })
  .onConflictDoUpdate({ target: emailPreferences.email, set: { [type]: false, updatedAt: new Date() } })
```

**Response:** Renders a plain confirmation page: "You have been unsubscribed from {type} emails."

**Opt-out check (before every outgoing notification email):**
```ts
const prefs = await db.query.emailPreferences.findFirst({ where: eq(emailPreferences.email, voterEmail) })
if (prefs && !prefs[notificationType]) return  // skip — user has opted out
```

---

## Validation Rules

| Field | Rules |
|---|---|
| Notification `type` | Must be one of the 7 valid type values |
| `notificationId` (mark read) | Must belong to current user |
| `workspaceId` (mark all read) | Optional — if provided, must be a workspace the user belongs to |

---

## Edge Cases

| Case | Handling |
|---|---|
| Job handler throws (SMTP down) | In-app notification (step 1) is already committed before `sendEmail` is called. pg-boss retries the email send up to 3 times with 30s delay. After max retries: job marked failed, email is not delivered, but in-app notification was already persisted. |
| Email bounce / invalid address | SMTP returns error → pg-boss retries. After retries exhausted: failure logged, not re-attempted. No impact on in-app notification |
| In-app notification created for deleted user | `user.id` FK with CASCADE DELETE — notification deleted when user deleted |
| Workspace deleted — member has unread notifications | `workspace_id` FK with CASCADE DELETE — all workspace notifications deleted |
| 1000 voters on a post — status changes | 1000 jobs enqueued by pg-boss. Processed with default concurrency (e.g. 5 at a time). Takes ~200 seconds at 5 emails/s. Acceptable for MVP |
| User votes on post then deletes account | `votes.user_id` SET NULL → `notifications` created with `user_id` would have been cascade-deleted anyway. Future status change: voter has `user_id = null` → email only (no in-app) |
| Admin and voter are same person | Self-notification suppression at enqueue callsite — admin does not receive notification for their own status change |
| Polling while tab is hidden | `visibilitychange` event listener pauses polling when tab hidden, resumes on focus. Reduces unnecessary requests |
| User receives notification for workspace they just left | Workspace leave triggers membership removal → CASCADE deletes notifications for that workspace. Bell count updated on next poll |
| Two events happen within 1 second | Two separate notifications created — no deduplication in MVP |
| Bell badge exceeds 99 | Display "99+" — actual count stored correctly in DB |
| pg-boss not started (cold start) | `startWorker()` called on first request — if server restarts without traffic, jobs queue in pg-boss table and are processed on first incoming request |

---

## Acceptance Criteria

**In-App Notifications:**
- [ ] Notification bell visible in workspace navbar for signed-in users
- [ ] Bell shows unread count badge (red) when there are unread notifications
- [ ] Badge shows "99+" when unread count exceeds 99
- [ ] Unread count refreshes every 30 seconds via polling
- [ ] Polling pauses when browser tab is hidden
- [ ] Clicking bell navigates to `/{ws-slug}/notifications` full page
- [ ] Notifications page shows all notifications grouped by date
- [ ] Unread notifications have distinct visual treatment (blue dot, highlighted bg)
- [ ] Clicking a notification marks it as read and navigates to the linked page
- [ ] "Mark all as read" button clears all unread in current workspace
- [ ] Visiting notifications page marks all as read automatically
- [ ] Bell badge clears after visiting notifications page
- [ ] Empty state shown when user has no notifications
- [ ] In-app notifications created for all 7 event types (signed-in users only)
- [ ] Guests do NOT receive in-app notifications (email only)

**Email Notifications:**
- [ ] New post alert email sent to workspace admins on post approval
- [ ] Status change email sent to all post voters
- [ ] New comment email sent to post author
- [ ] Reply email sent to parent comment author
- [ ] Workspace invite email sent to invitee
- [ ] Member removed email sent to removed member
- [ ] Workspace deleted email sent to all members
- [ ] Changelog published email sent to voters of linked posts
- [ ] Self-notification suppressed across all event types
- [ ] All emails include correct CTA link
- [ ] All emails render in plain text fallback
- [ ] SMTP errors trigger pg-boss retry (up to 3 times)

**Worker:**
- [ ] pg-boss starts on application boot
- [ ] All 8 job types registered with handlers
- [ ] `CLEANUP_EXPIRED_INVITES` cron scheduled at 2am UTC
- [ ] Failed jobs after max retries logged (do not crash the app)

---

## Implementation Notes

- pg-boss uses the **same PostgreSQL database** as the application — no separate Redis or queue service needed. pg-boss creates its own schema (`pgboss`) with job tables
- `startWorker()` uses a module-level singleton guard (`if (!boss)`) — safe to call multiple times across Next.js hot reloads in development without registering duplicate handlers
- Email templates use **inline CSS only** — external stylesheets are stripped by most email clients. Keep templates simple and test with Mailtrap
- In-app notification creation happens **inside the job handler BEFORE the email send** — this guarantees the in-app record is committed even if SMTP throws. pg-boss will retry the handler (re-running `sendEmail`) but `createNotification` is idempotent on `(userId, type, link)` so the notification is never duplicated
- `GET /api/notifications/count` has `Cache-Control: no-store` — it must always return a fresh count, never served from Next.js cache
- Notification polling uses `setInterval` with a `visibilitychange` cleanup — import `useEffect` and `useRef` for stable interval management across re-renders
- The `notifications` table grows unboundedly in MVP. Post-MVP: add a cleanup job that deletes notifications older than 90 days (`DELETE FROM notifications WHERE created_at < now() - interval '90 days'`)
- `markAllAsRead()` is called **server-side** on the notifications page load — this means the bell badge clears without a client-side API call on page visit, giving the user immediate feedback
