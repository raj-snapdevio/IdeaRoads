# Feature 12 — Workspace Settings & Moderation

## Overview

This feature consolidates all workspace-level configuration under a unified settings layout at `/{ws-slug}/settings/`. It also introduces two new capabilities not covered in earlier features: **Moderation** (post approval mode, comment moderation, spam keywords, blocked users) and the **Audit Log** (a read-only trail of all admin actions in the workspace).

Settings pages already partially implemented in earlier features (General from Feature 02, Members from Feature 03, Categories from Feature 08) are completed and unified here under the shared settings layout and sidebar navigation.

---

## Settings Sections

| Route | Section | Built In | New In |
|---|---|---|---|
| `/{ws-slug}/settings/general` | General — name, slug, description, logo, roadmap/changelog visibility, delete workspace | Feature 02 | Logo upload stub, layout |
| `/{ws-slug}/settings/members` | Members — invite, table, roles, remove, leave, transfer | Feature 03 | Layout only |
| `/{ws-slug}/settings/categories` | Categories — create, edit, delete | Feature 08 | Layout only |
| `/{ws-slug}/settings/moderation` | Moderation — approval mode, spam filter, blocked users | **NEW** | **NEW** |
| `/{ws-slug}/settings/webhooks` | Webhooks — outbound HTTP callbacks for workspace events | **NEW** | **NEW** |
| `/{ws-slug}/settings/api-keys` | API Keys — workspace-scoped REST API keys | **NEW** | **NEW** |
| `/{ws-slug}/settings/audit-log` | Audit Log — read-only action history | **NEW** | **NEW** |

---

## Core Behaviour

### Moderation
- Three post approval modes per workspace:
  - `off` — posts approved immediately (default)
  - `auto` — spam keyword filter applied; flagged posts go to manual review
  - `manual` — all posts require admin approval before going public
- Comment moderation toggle (on/off) — from Feature 07
- Spam keywords: admin-managed list of words/phrases; posts containing them are auto-flagged when mode = `auto`
- Block user: prevents a specific user (by email or user ID) from submitting posts or comments in this workspace
- Blocked users list: manageable table (add/remove)
- Pending posts queue: admin view of all posts awaiting approval

### Outbound Webhooks
- Workspace owners and admins can register HTTPS endpoint URLs
- Select which events to receive per endpoint (multi-select from the event catalog)
- Events: `post.created`, `post.status_changed`, `post.merged`, `post.deleted`, `comment.created`, `vote.cast`, `member.joined`, `member.removed`, `changelog.published`
- Payload signed with HMAC-SHA256: `X-IdeaRoads-Signature: t=<unix>,v1=<hmac-sha256-hex>`
- Signature covers `{timestamp}.{rawBody}` with 300-second replay protection window
- Webhook secrets stored encrypted (AES-256-GCM via `lib/encrypt.ts`), never returned in API responses after creation
- Each endpoint has a delivery log: last 100 deliveries, HTTP status code, response body (truncated to 1KB), attempt count
- Auto-disable at 50 consecutive failures — email sent to workspace owner
- Manual re-enable from settings resets failure counter
- "Test" button: sends a `ping` event to the endpoint immediately

### API Keys
- Generate named API keys for programmatic access to the workspace REST API
- Raw key shown once at creation (copy-and-save UX) — never retrievable again
- Stored as SHA-256 hash only (`token_hash` column), plaintext discarded after display
- Key prefix shown in table for identification (e.g. `ir_live_abc123...` → displayed as `ir_live_abc...`)
- Last-used timestamp updated on every successful API request
- Revoke a key instantly (hard delete the row)
- Keys are workspace-scoped — a key can only access that workspace's data

### Audit Log
- Append-only record of all admin actions in the workspace
- Actions logged: status change, post merge, post delete, post move, post pin, member role change, member remove, member invite, board create/archive/delete, category create/edit/delete, moderation setting change, blocked user add/remove
- Each entry: actor, action, entity type, entity ID, metadata (snapshot), timestamp
- Read-only — cannot be cleared or modified
- Visible to Owner and Admin only
- Paginated — 50 entries per page

---

## Dependencies

```
No new npm packages. Uses lib/encrypt.ts (AES-256-GCM, already in lib/) for webhook secrets.
```

---

## Environment Variables

```
ENCRYPTION_KEY=""   # AES-256 key for webhook secret encryption — openssl rand -hex 32
```

---

## Database Schema

### `blocked_users`

```ts
id            text        PK  (cuid2)
workspace_id  text        NOT NULL  → workspaces.id (CASCADE DELETE)
user_id       text                  → user.id (SET NULL on delete)
user_email    text                  -- stored for guest blocks or fallback
user_name     text                  -- snapshot of name at time of block
blocked_by    text        NOT NULL  → user.id
reason        text                  -- optional admin note
created_at    timestamp   NOT NULL  DEFAULT now()
```

**Constraints:**
- `UNIQUE (workspace_id, user_id)` WHERE `user_id IS NOT NULL`
- `UNIQUE (workspace_id, user_email)` WHERE `user_email IS NOT NULL`

**Indexes:**
- Index on `workspace_id`
- Index on `user_id`
- Index on `user_email`

---

### `audit_logs`

```ts
id            text        PK  (cuid2)
workspace_id  text                  → workspaces.id (CASCADE DELETE)  -- null for platform-level Orbit actions
actor_id      text        NOT NULL  → user.id
actor_name    text        NOT NULL  -- snapshot of actor name
action        text        NOT NULL  -- see Action Reference table
entity_type   text        NOT NULL  -- 'post' | 'board' | 'member' | 'category' | 'workspace' | 'invite' | 'comment'
entity_id     text                  -- ID of affected entity (null if entity deleted)
entity_name   text                  -- snapshot of entity name/title at time of action
metadata      jsonb                 -- action-specific extra data
created_at    timestamp   NOT NULL  DEFAULT now()
```

**Indexes:**
- Index on `(workspace_id, created_at DESC)` — audit log list
- Index on `actor_id`
- Index on `entity_type`

---

### `outbound_webhook_endpoints`

```ts
id                    text        PK  (cuid2)
workspace_id          text        NOT NULL  → workspaces.id (CASCADE DELETE)
url                   text        NOT NULL  -- HTTPS only
encrypted_secret      text        NOT NULL  -- AES-256-GCM encrypted HMAC secret
events                text[]      NOT NULL  DEFAULT []  -- subscribed event keys
is_enabled            boolean     NOT NULL  DEFAULT true
consecutive_failures  integer     NOT NULL  DEFAULT 0
disabled_reason       text                  -- 'consecutive_failures' | 'manual'
created_at            timestamp   NOT NULL  DEFAULT now()
updated_at            timestamp   NOT NULL  DEFAULT now()
```

**Indexes:**
- Index on `workspace_id`

---

### `outbound_webhook_deliveries`

```ts
id              text        PK  (cuid2)
endpoint_id     text        NOT NULL  → outbound_webhook_endpoints.id (CASCADE DELETE)
event           text        NOT NULL  -- e.g. 'post.status_changed'
payload         jsonb       NOT NULL  -- full event payload sent
status          text        NOT NULL  -- 'pending' | 'delivered' | 'failed'
attempts        integer     NOT NULL  DEFAULT 0
response_status integer               -- HTTP response code received
last_error      text                  -- last delivery error message
created_at      timestamp   NOT NULL  DEFAULT now()
```

**Retention:** Pruned after 30 days by the `CLEANUP_WEBHOOK_DELIVERIES` cron (runs nightly at 4am UTC — see Feature 11 scheduler).

**Indexes:**
- Index on `(endpoint_id, created_at DESC)` — delivery log query

---

### `api_keys`

```ts
id            text        PK  (cuid2)
workspace_id  text        NOT NULL  → workspaces.id (CASCADE DELETE)
user_id       text        NOT NULL  → user.id (SET NULL on delete)
name          text        NOT NULL  -- human label e.g. "Zapier Integration"
token_hash    text        NOT NULL UNIQUE  -- SHA-256 of raw key
last_used_at  timestamp             -- updated on every validated request
is_enabled    boolean     NOT NULL  DEFAULT true
created_at    timestamp   NOT NULL  DEFAULT now()
```

**Key format:** `ir_live_{cuid2}` — prefix identifies environment, cuid2 provides entropy.
**Storage:** Only `token_hash` (SHA-256) is stored. Raw key shown once to user at creation, then discarded.

**Indexes:**
- Index on `workspace_id`
- Index on `token_hash` — API authentication lookup (hot path)

---

### `workspaces` columns used (already exist from Feature 02)

```ts
moderation_mode     text    NOT NULL  DEFAULT 'off'
                    -- 'off' | 'auto' | 'manual'
comment_moderation  boolean NOT NULL  DEFAULT false
spam_keywords       text[]  NOT NULL  DEFAULT []
```

---

## Audit Log Action Reference

| Action | Entity Type | Metadata |
|---|---|---|
| `post.status_changed` | `post` | `{ from: string, to: string, note: string }` |
| `post.merged` | `post` | `{ targetPostId: string, targetTitle: string }` |
| `post.deleted` | `post` | `{ title: string, boardName: string }` |
| `post.moved` | `post` | `{ fromBoardId: string, toBoardId: string }` |
| `post.pinned` | `post` | `{ isPinned: boolean }` |
| `post.approved` | `post` | `{}` |
| `board.created` | `board` | `{ name: string, slug: string }` |
| `board.archived` | `board` | `{ archived: boolean }` |
| `board.deleted` | `board` | `{ name: string }` |
| `board.settings_updated` | `board` | `{ changes: object }` |
| `member.invited` | `member` | `{ email: string, role: string }` |
| `member.role_changed` | `member` | `{ from: string, to: string }` |
| `member.removed` | `member` | `{ name: string, email: string }` |
| `member.ownership_transferred` | `member` | `{ newOwnerId: string, newOwnerName: string }` |
| `category.created` | `category` | `{ name: string, color: string }` |
| `category.updated` | `category` | `{ changes: object }` |
| `category.deleted` | `category` | `{ name: string }` |
| `workspace.settings_updated` | `workspace` | `{ changes: object }` |
| `moderation.mode_changed` | `workspace` | `{ from: string, to: string }` |
| `moderation.user_blocked` | `workspace` | `{ targetEmail: string, reason: string }` |
| `moderation.user_unblocked` | `workspace` | `{ targetEmail: string }` |
| `comment.deleted` | `comment` | `{ postTitle: string }` |
| `webhook.created` | `webhook` | `{ url: string, events: string[] }` |
| `webhook.updated` | `webhook` | `{ changes: object }` |
| `webhook.deleted` | `webhook` | `{ url: string }` |
| `webhook.disabled` | `webhook` | `{ reason: string }` |
| `api_key.created` | `api_key` | `{ name: string }` |
| `api_key.revoked` | `api_key` | `{ name: string }` |

---

## File Structure

```
app/
└── (workspace)/
    └── [ws-slug]/
        └── settings/
            ├── layout.tsx                      Settings layout (sidebar nav)
            ├── general/
            │   └── page.tsx                    General settings (Feature 02 + logo stub)
            ├── members/
            │   └── page.tsx                    Members settings (Feature 03)
            ├── categories/
            │   └── page.tsx                    Categories settings (Feature 08)
            ├── moderation/
            │   └── page.tsx                    NEW — moderation settings
            ├── webhooks/
            │   └── page.tsx                    NEW — outbound webhook endpoints
            ├── api-keys/
            │   └── page.tsx                    NEW — API key management
            └── audit-log/
                └── page.tsx                    NEW — audit log viewer
└── api/
    └── workspaces/
        └── [slug]/
            ├── moderation/
            │   └── route.ts                    PATCH moderation settings
            ├── blocked-users/
            │   ├── route.ts                    GET list / POST block user
            │   └── [blockedId]/
            │       └── route.ts                DELETE unblock user
            ├── webhooks/
            │   ├── route.ts                    GET list / POST create endpoint
            │   └── [endpointId]/
            │       └── route.ts                PATCH update / DELETE remove
            ├── api-keys/
            │   ├── route.ts                    GET list / POST generate key
            │   └── [keyId]/
            │       └── route.ts                DELETE revoke key
            └── audit-log/
                └── route.ts                    GET audit log (paginated)

components/
└── settings/
    ├── settings-layout.tsx                     Sidebar + content wrapper
    ├── settings-nav.tsx                        Vertical nav links
    ├── moderation-settings-form.tsx            Approval mode + comment mod + spam keywords
    ├── spam-keywords-editor.tsx                Tag-style keyword list editor
    ├── blocked-users-table.tsx                 List of blocked users + unblock action
    ├── block-user-form.tsx                     Add user to blocklist by email
    ├── pending-posts-section.tsx               Posts awaiting approval (moderation queue)
    ├── webhook-endpoints-table.tsx             Webhook endpoint list + enable/disable/delete
    ├── webhook-endpoint-form.tsx               Create/edit endpoint (URL + event checkboxes)
    ├── webhook-delivery-log.tsx                Last 100 deliveries per endpoint
    ├── api-keys-table.tsx                      Key list with name, last used, revoke button
    └── audit-log-table.tsx                     Read-only audit log list

lib/
├── moderation/
│   ├── block.ts                                Block / unblock service
│   ├── queries.ts                              isBlocked check, list blocked
│   └── index.ts
├── webhooks/
│   ├── dispatch.ts                             dispatchWebhookEvent(workspaceId, event, payload)
│   ├── events.ts                               WEBHOOK_EVENTS enum + labels
│   ├── payloads.ts                             Typed payload builders per event
│   └── queries.ts                              listEndpoints, listDeliveries
├── api-keys/
│   ├── create.ts                               generateApiKey() — returns raw key once
│   ├── validate.ts                             validateApiKey() — hash lookup + last_used_at update
│   └── queries.ts
└── audit/
    ├── log.ts                                  createAuditLog() helper
    ├── queries.ts                              listAuditLogs()
    └── index.ts
```

---

## Implementation Details

### `lib/audit/log.ts`

```ts
createAuditLog({
  workspaceId,
  actorId,
  actorName,
  action,
  entityType,
  entityId?,
  entityName?,
  metadata?,
})
  → inserts audit_logs row
  → fire-and-forget (never awaited in critical path — does not block main action)
  → on error: console.error only — audit log failure never blocks the action
  → returns void
```

**Usage pattern across all service functions:**
```ts
// In changeStatus():
await updatePostStatus(...)
createAuditLog({             // not awaited
  workspaceId,
  actorId: changedBy,
  actorName: actor.name,
  action: "post.status_changed",
  entityType: "post",
  entityId: postId,
  entityName: post.title,
  metadata: { from: fromStatus, to: toStatus, note },
})
```

---

### `lib/audit/queries.ts`

```ts
listAuditLogs(workspaceId, {
  page = 1,
  limit = 50,
  actorId?,      -- filter by actor
  entityType?,   -- filter by entity type
  action?,       -- filter by action
})
  → SELECT * FROM audit_logs WHERE workspace_id = workspaceId
  → apply filters if provided
  → ORDER BY created_at DESC
  → LIMIT/OFFSET pagination
  → returns { logs: AuditLog[], total, hasMore }
```

---

### `lib/moderation/block.ts`

```ts
blockUser(workspaceId, blockedBy, { userEmail, reason? })
  → look up user by email (from user table)
  → if found: userId = user.id, userName = user.name
  → if not found (guest): userId = null, userName = email
  → check not already blocked: UNIQUE constraint handles race
  → INSERT INTO blocked_users { workspaceId, userId, userEmail, userName, blockedBy, reason }
  → createAuditLog({ action: 'moderation.user_blocked', ... })
  → returns blocked_user row

unblockUser(blockedId, workspaceId)
  → DELETE FROM blocked_users WHERE id = blockedId AND workspace_id = workspaceId
  → createAuditLog({ action: 'moderation.user_unblocked', ... })
  → returns void

isBlocked(workspaceId, { userId?, userEmail? })
  → SELECT 1 FROM blocked_users WHERE workspace_id = workspaceId
    AND (user_id = userId OR user_email = userEmail)
  → returns boolean
  → called in createPost() and createComment() pre-flight checks
```

---

### `app/api/workspaces/[slug]/moderation/route.ts`

**PATCH** — Update moderation settings
```
Auth: requireRole(['owner', 'admin'])
Body: {
  moderationMode?: 'off' | 'auto' | 'manual'
  commentModeration?: boolean
  spamKeywords?: string[]
}
Validates:
  - moderationMode: must be valid enum value if provided
  - spamKeywords: array of strings, each 1–100 chars, max 50 keywords
Logic:
  - UPDATE workspaces SET moderation_mode, comment_moderation, spam_keywords, updated_at
  - createAuditLog for mode change if moderationMode changed
Returns: updated workspace (moderation fields only)
```

---

### `app/api/workspaces/[slug]/blocked-users/route.ts`

**GET** — List blocked users
```
Auth: requireRole(['owner', 'admin'])
Returns: blocked_user[] (id, userName, userEmail, reason, blockedAt, blockedByName)
```

**POST** — Block a user
```
Auth: requireRole(['owner', 'admin'])
Body: { email: string, reason?: string }
Validates:
  - email: valid format
  - user not already blocked
  - cannot block yourself
  - cannot block the workspace owner
Calls: blockUser(...)
Returns: 201 + blocked_user
```

---

### `app/api/workspaces/[slug]/blocked-users/[blockedId]/route.ts`

**DELETE** — Unblock user
```
Auth: requireRole(['owner', 'admin'])
Calls: unblockUser(blockedId, workspaceId)
Returns: 204
```

---

### `app/api/workspaces/[slug]/audit-log/route.ts`

**GET** — List audit log
```
Auth: requireRole(['owner', 'admin'])
Query: page=1, limit=50, actorId?, entityType?, action?
Returns: { logs: AuditLog[], total, hasMore }
```

---

### `lib/webhooks/dispatch.ts`

```ts
dispatchWebhookEvent(workspaceId, event, payload)
  → SELECT enabled endpoints WHERE workspace_id = workspaceId AND event = ANY(events)
  → for each endpoint:
      INSERT INTO outbound_webhook_deliveries { endpointId, event, payload, status: 'pending' }
      await queue.send(JOB_NAMES.DELIVER_OUTBOUND_WEBHOOK, { deliveryId: row.id })
  → returns void (fire-and-forget — never awaited in service functions)
```

Called from service functions after the primary mutation succeeds:
```ts
// In createPost():
const post = await insertPost(...)
dispatchWebhookEvent(workspaceId, "post.created", buildPostPayload(post))  // not awaited
```

---

### `lib/worker/handlers/deliver-outbound-webhook.ts`

```ts
handler: async ({ data: { deliveryId } }) => {
  const delivery = await claimDelivery(deliveryId)  // atomic status: pending → sending
  if (!delivery) return  // already processing

  const endpoint = await getEndpoint(delivery.endpointId)
  if (!endpoint.isEnabled) return  // endpoint disabled mid-flight

  const timestamp = Math.floor(Date.now() / 1000)
  const rawBody = JSON.stringify(delivery.payload)
  const secret = decrypt(endpoint.encryptedSecret)  // AES-256-GCM
  const sig = `t=${timestamp},v1=${hmacSha256(secret, `${timestamp}.${rawBody}`)}`

  // SSRF guard: resolve URL, block RFC 1918 / loopback / link-local
  await assertNotSsrf(endpoint.url)

  const res = await fetch(endpoint.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-IdeaRoads-Signature": sig,
    },
    body: rawBody,
    signal: AbortSignal.timeout(10_000),  // 10s timeout per attempt
  })

  if (res.ok) {
    await markDelivered(deliveryId, res.status)
    await resetFailureCount(endpoint.id)
  } else {
    await markFailed(deliveryId, res.status, await res.text())
    const newCount = await incrementFailureCount(endpoint.id)
    if (newCount >= 50) {
      await disableEndpoint(endpoint.id, "consecutive_failures")
      // enqueue email to workspace owner
    }
    throw new Error(`HTTP ${res.status}`)  // let pg-boss retry (up to retryLimit: 5)
  }
}
```

---

### `lib/api-keys/create.ts`

```ts
generateApiKey(workspaceId, userId, name)
  → rawKey = `ir_live_${createId()}`  -- cuid2 for entropy
  → tokenHash = sha256(rawKey)
  → INSERT INTO api_keys { workspaceId, userId, name, tokenHash }
  → createAuditLog({ action: 'api_key.created', ... })
  → returns { id, name, rawKey }  -- rawKey returned ONCE, never stored
```

### `lib/api-keys/validate.ts`

```ts
validateApiKey(rawKey)
  → tokenHash = sha256(rawKey)
  → SELECT * FROM api_keys WHERE token_hash = tokenHash AND is_enabled = true
  → if found: UPDATE api_keys SET last_used_at = now()
  → returns { workspaceId, userId } | null
  → Used in API route middleware: Authorization: Bearer <rawKey>
```

---

## Settings Layout

### `app/(workspace)/[ws-slug]/settings/layout.tsx`

Server component — wraps all settings pages:

```
┌──────────────────────────────────────────────────────┐
│  Workspace Settings                                  │
│  ──────────────────────────────────────────────────  │
│  ┌─────────────┐  ┌────────────────────────────────┐ │
│  │  General    │  │                                │ │
│  │  Members    │  │   {children}                   │ │
│  │  Categories │  │   (active settings page)       │ │
│  │  Moderation │  │                                │ │
│  │  Audit Log  │  │                                │ │
│  └─────────────┘  └────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

- "Audit Log" nav item only shown to Owner and Admin
- "Moderation" nav item only shown to Owner and Admin
- All settings pages require Owner or Admin role (enforced in layout)
- Member role → redirect to workspace dashboard

---

### `components/settings/settings-nav.tsx`

Client component — vertical sidebar navigation:

```ts
const navItems = [
  { label: "General",    href: `/${wsSlug}/settings/general`,    icon: Settings },
  { label: "Members",    href: `/${wsSlug}/settings/members`,    icon: Users },
  { label: "Categories", href: `/${wsSlug}/settings/categories`, icon: Tag },
  { label: "Moderation", href: `/${wsSlug}/settings/moderation`, icon: Shield },
  { label: "Webhooks",   href: `/${wsSlug}/settings/webhooks`,   icon: Webhook },
  { label: "API Keys",   href: `/${wsSlug}/settings/api-keys`,   icon: Key },
  { label: "Audit Log",  href: `/${wsSlug}/settings/audit-log`,  icon: ClipboardList },
]
```

- Active item highlighted
- `href` uses `usePathname()` to determine active state

---

## Moderation Settings Page

### `app/(workspace)/[ws-slug]/settings/moderation/page.tsx`

Server component:
- Fetches workspace (moderation fields)
- Fetches blocked users list
- Fetches pending posts count
- Renders:
  - `<ModerationSettingsForm />` — approval mode + comment moderation + spam keywords
  - `<PendingPostsSection />` — posts awaiting approval
  - `<BlockedUsersTable />` + `<BlockUserForm />`

---

### `components/settings/moderation-settings-form.tsx`

Client component:

**Section 1 — Post Approval Mode:**
```
Post Moderation
  ○ Off            Posts appear immediately after submission
  ○ Automatic      Posts are checked against your spam keywords
  ● Manual         All posts require your approval

[Save Changes]
```

**Section 2 — Comment Moderation:**
```
Comment Moderation
[Toggle switch]  Require admin approval for all comments
"When enabled, comments won't appear until you approve them."

[Save Changes]
```

**Section 3 — Spam Keywords:**
```
Spam Keywords
"Posts containing these words will be flagged for review
 (only applies when Post Moderation is set to Automatic)"

[python] [casino] [free money] [×]
[+ Add keyword...]

[Save Changes]
```

Behaviour:
- Changes to each section saved independently (separate "Save" buttons per section)
- PATCH `/api/workspaces/[slug]/moderation`
- Toast on success
- `<SpamKeywordsEditor />` embedded for keyword management

---

### `components/settings/spam-keywords-editor.tsx`

Client component — tag-style input:

- Existing keywords shown as dismissible chips
- Type a keyword + press Enter or comma → adds chip
- Click × on chip → removes keyword
- Validates: each keyword 1–100 chars, max 50 total
- "Empty" state: "No spam keywords added yet"
- Does not save automatically — value passed to parent form's save handler

---

### `components/settings/pending-posts-section.tsx`

Client component:

- Shows only when `moderation_mode = 'manual'` OR `moderation_mode = 'auto'` with flagged posts
- Header: "Pending Posts ({count})"
- List of unapproved posts: title, author, submitted date, board name
- Per-post actions:
  - "Approve" → PATCH `/api/posts/[postId]/approve`
  - "Delete" → DELETE `/api/posts/[postId]` (AlertDialog)
- Approved posts disappear from list
- "No pending posts" state when queue is empty
- Refresh button to re-fetch queue

---

### `components/settings/blocked-users-table.tsx`

Client component:

**Columns:** Name/Email | Reason | Blocked By | Blocked At | Actions (Unblock)

- "Unblock" → DELETE `/api/workspaces/[slug]/blocked-users/[id]` → row removed
- Empty state: "No blocked users"
- Blocked users shown in chronological order (newest first)

---

### `components/settings/block-user-form.tsx`

Client component — inline form above blocked users table:

```
Block a user
Email:   [_______________________]
Reason:  [______________________] (optional)
[Block User]
```

- Submit → POST `/api/workspaces/[slug]/blocked-users`
- On success: user appears in blocked list, form clears
- Error states: "User not found" (email not in system — allowed, blocks by email), "Already blocked"

---

## Audit Log Page

### `app/(workspace)/[ws-slug]/settings/audit-log/page.tsx`

Server component:
- Fetches first page of audit logs
- Renders `<AuditLogTable />`

---

### `components/settings/audit-log-table.tsx`

Client component:

```
Audit Log                                    [Filter: All ▾] [Actor: All ▾]

2026-06-22 14:32   devang@...   changed status of "Dark mode" to Planned
2026-06-22 13:10   devang@...   merged "Dark Mode Support" into "Dark mode"
2026-06-21 09:45   team@...     removed member john@example.com
2026-06-20 18:22   devang@...   archived board "Old Feedback"
```

**Columns:** Timestamp | Actor | Action description | Entity

**Action description formatting:**
```ts
function formatAuditAction(log: AuditLog): string {
  switch (log.action) {
    case "post.status_changed":
      return `changed status of "${log.entityName}" from ${log.metadata.from} to ${log.metadata.to}`
    case "post.merged":
      return `merged "${log.entityName}" into "${log.metadata.targetTitle}"`
    case "post.deleted":
      return `deleted post "${log.metadata.title}" from ${log.metadata.boardName}`
    case "member.removed":
      return `removed member ${log.metadata.email}`
    case "moderation.user_blocked":
      return `blocked user ${log.metadata.targetEmail}`
    // ... etc
  }
}
```

**Filters:**
- Entity type filter: All / Post / Board / Member / Category / Workspace / Moderation
- Actor filter: dropdown of all workspace admins
- Date range: simple "Last 7 days / 30 days / All time" (no date picker in MVP)

**Pagination:** "Load more" button — 50 per page

---

## General Settings Page (completed)

### `app/(workspace)/[ws-slug]/settings/general/page.tsx`

Sections (combining Feature 02 base + this feature's additions):

**1. Workspace Details**
- Name (text, 2–50 chars)
- Slug (text, with live availability check)
- Description (textarea, max 300 chars)
- Logo (file input — stubbed in MVP: accepts URL string only, no upload)

**2. Visibility**
```
Public Roadmap
[Toggle]  Show your roadmap at /{ws-slug}/roadmap
Anyone with the link can view your planned and completed work.

Changelog
[Toggle]  Show your changelog at /{ws-slug}/changelog
Anyone with the link can view your release notes.
```

**3. Danger Zone** (Owner only)
```
Delete Workspace
"Permanently delete this workspace and all its data."
[Delete Workspace]  → AlertDialog: type workspace name to confirm
```

PATCH `/api/workspaces/[slug]` on save — existing endpoint from Feature 02.

---

## Audit Log Integration Points

`createAuditLog()` is added to all service functions across previous features. Here is the complete integration map:

| Service Function | Feature | Action Logged |
|---|---|---|
| `changeStatus()` | 08 | `post.status_changed` |
| `mergePosts()` | 05 | `post.merged` |
| `deletePost()` | 05 | `post.deleted` |
| `movePost()` | 05 | `post.moved` |
| `togglePin()` | 05 | `post.pinned` |
| `approvePost()` | 05 | `post.approved` |
| `createBoard()` | 04 | `board.created` |
| `toggleArchive()` | 04 | `board.archived` |
| `deleteBoard()` | 04 | `board.deleted` |
| `updateBoard()` | 04 | `board.settings_updated` |
| `createEmailInvite()` | 03 | `member.invited` |
| `changeRole()` | 03 | `member.role_changed` |
| `removeMember()` | 03 | `member.removed` |
| `transferOwnership()` | 03 | `member.ownership_transferred` |
| `createCategory()` | 08 | `category.created` |
| `updateCategory()` | 08 | `category.updated` |
| `deleteCategory()` | 08 | `category.deleted` |
| `updateWorkspace()` | 02 | `workspace.settings_updated` |
| `updateModerationSettings()` | 12 | `moderation.mode_changed` |
| `blockUser()` | 12 | `moderation.user_blocked` |
| `unblockUser()` | 12 | `moderation.user_unblocked` |
| `deleteComment()` (admin) | 07 | `comment.deleted` |

---

## Block Check Integration

`isBlocked()` is called in **pre-flight checks** in two service functions:

```ts
// In createPost() — lib/posts/create.ts
const blocked = await isBlocked(workspaceId, {
  userId: authorId ?? undefined,
  userEmail: authorEmail ?? undefined,
})
if (blocked) throw new Error("You are not allowed to post in this workspace.")

// In createComment() — lib/comments/create.ts
const blocked = await isBlocked(workspaceId, {
  userId: authorId ?? undefined,
  userEmail: authorEmail ?? undefined,
})
if (blocked) throw new Error("You are not allowed to comment in this workspace.")
```

The API returns **403** for blocked users — not 200 with an error message — so there is no ambiguity at the client.

---

## User Flows

### Admin Enables Manual Post Moderation

```
1. Admin navigates to /{ws-slug}/settings/moderation
2. Post Approval Mode: selects "Manual"
3. Clicks "Save Changes"
4. PATCH /api/workspaces/[slug]/moderation { moderationMode: 'manual' }
5. workspace.moderation_mode = 'manual'
6. Audit log: moderation.mode_changed (off → manual)
7. All subsequent posts: is_approved = false (pending review)
8. PendingPostsSection appears showing pending queue
```

### Admin Reviews Pending Posts

```
1. New post submitted while moderation = 'manual'
2. Post created with is_approved = false
3. Admin sees badge: "3 posts pending" on moderation settings page
4. Clicks "Approve" on a post → PATCH /api/posts/[postId]/approve
5. Post is_approved = true → visible publicly
6. SEND_NEW_POST_ALERT enqueued
7. Audit log: post.approved
8. Post count in pending section decrements
```

### Admin Adds Spam Keywords (Auto Mode)

```
1. Admin sets mode to "Automatic"
2. Adds keywords: "casino", "free money", "click here"
3. Save → PATCH moderation { moderationMode: 'auto', spamKeywords: [...] }
4. Next post submitted with "casino" in title/description
5. createPost(): spam check → match found → is_approved = false
6. Post goes to pending queue
7. Admin can approve or delete from moderation page
```

### Admin Blocks a User

```
1. Admin navigates to /{ws-slug}/settings/moderation
2. Finds BlockUserForm at bottom of page
3. Enters email: "troll@example.com", reason: "Spam submissions"
4. POST /api/workspaces/[slug]/blocked-users { email, reason }
5. blocked_users row created
6. Audit log: moderation.user_blocked
7. User appears in blocked users table
8. Next time troll@example.com tries to submit a post:
   createPost() pre-flight: isBlocked() = true → 403
```

### Admin Unblocks a User

```
1. Admin finds user in blocked users table
2. Clicks "Unblock"
3. DELETE /api/workspaces/[slug]/blocked-users/[id]
4. Row removed from table
5. Audit log: moderation.user_unblocked
6. User can submit posts/comments again
```

### Admin Reviews Audit Log

```
1. Admin navigates to /{ws-slug}/settings/audit-log
2. Sees chronological list of all admin actions
3. Filters by Entity Type: "Post"
4. Sees all post-related actions (status changes, merges, deletes)
5. Loads more via "Load more" button
6. Cannot edit or clear the log (read-only)
```

---

## API Reference

| Method | Route | Auth | Description |
|---|---|---|---|
| PATCH | `/api/workspaces/[slug]/moderation` | Admin+ | Update moderation settings |
| GET | `/api/workspaces/[slug]/blocked-users` | Admin+ | List blocked users |
| POST | `/api/workspaces/[slug]/blocked-users` | Admin+ | Block a user |
| DELETE | `/api/workspaces/[slug]/blocked-users/[id]` | Admin+ | Unblock a user |
| GET | `/api/workspaces/[slug]/audit-log` | Admin+ | List audit log entries |

---

## Validation Rules

| Field | Rules |
|---|---|
| `moderationMode` | Must be `'off'`, `'auto'`, or `'manual'` |
| `spamKeywords` | Array of strings, each 1–100 chars, max 50 items, no duplicates |
| Block `email` | Valid email format, not already blocked, not self, not workspace owner |
| Block `reason` | Optional, max 300 chars |
| Audit log `limit` | Max 50 per page |

---

## Edge Cases

| Case | Handling |
|---|---|
| Audit log table grows very large (10,000+ entries) | Paginated at 50/page — query uses indexed `(workspace_id, created_at DESC)`. No performance issue at this scale in MVP |
| Blocked user tries to vote (not just post/comment) | Voting is NOT blocked — only post submission and commenting. Blocking a user from voting would require more complex logic; post-MVP enhancement |
| User blocked by email not in system | `blockUser()` creates record with `user_id = null`, `user_email = email`. Blocks guest submissions from that email |
| Blocked user's account deleted | `user_id` SET NULL on `blocked_users` — email-based block still active |
| Admin blocks themselves | API returns 400: "You cannot block yourself" |
| Admin tries to block the workspace owner | API returns 403: "Cannot block the workspace owner" |
| `createAuditLog()` throws | Error caught + logged to console — main action is not rolled back. Audit log failure is never propagated |
| Two admins save moderation settings simultaneously | Last write wins — no advisory lock needed (moderation settings change is rare and non-critical) |
| Spam keyword matches a legitimate post | Admin can approve the flagged post manually — it's not auto-rejected, just queued |
| Changing moderation mode from 'manual' to 'off' — pending posts remain | Existing pending posts stay `is_approved = false`. Admin must manually approve or delete them; changing mode does not auto-approve the queue |
| Moderation mode changed — existing posts not retroactively affected | Only applies to new submissions. Existing approved/unapproved posts unchanged |

---

## Acceptance Criteria

**Settings Layout:**
- [ ] Settings sidebar nav visible on all settings pages
- [ ] Active section highlighted in nav
- [ ] Settings accessible to Owner and Admin only — Members redirected

**General Settings:**
- [ ] Workspace name, slug, description editable
- [ ] Slug change validated for uniqueness and reserved words
- [ ] Roadmap public/private toggle works (Feature 09 integration)
- [ ] Changelog public/private toggle works (Feature 10 integration)
- [ ] Delete workspace button only visible to Owner
- [ ] Delete workspace requires typing workspace name to confirm

**Moderation:**
- [ ] Three post approval modes selectable (Off / Auto / Manual)
- [ ] Comment moderation toggle works (Feature 07 integration)
- [ ] Spam keywords editor supports add (Enter/comma) and remove (×) actions
- [ ] Max 50 spam keywords enforced
- [ ] Pending posts section shown when moderation mode is manual or auto (with flagged posts)
- [ ] Admin can approve pending posts from moderation settings page
- [ ] Admin can delete pending posts from moderation settings page
- [ ] Blocked users table shows name, email, reason, blocked date, blocked by
- [ ] Admin can block a user by email with optional reason
- [ ] Admin can unblock a user from the table
- [ ] Blocked user receives 403 on post submission
- [ ] Blocked user receives 403 on comment submission
- [ ] Cannot block self or workspace owner

**Audit Log:**
- [ ] Audit log page shows all admin actions chronologically (newest first)
- [ ] Audit log is read-only — no edit or clear actions
- [ ] Actions from all services are logged (22 action types)
- [ ] Audit log filterable by entity type and actor
- [ ] Pagination works: 50 per page, "Load more" button
- [ ] Audit log only accessible to Owner and Admin

---

## Implementation Notes

- `createAuditLog()` is **fire-and-forget** — it is NOT awaited in service functions. It runs as a best-effort background insert. This ensures audit log creation never delays or breaks the primary action
- The settings layout (`settings/layout.tsx`) enforces role check — if the session user is a Member (not Admin/Owner), redirect to workspace dashboard. This is the single enforcement point; individual settings pages do not need to re-check
- `spam_keywords` is stored as a PostgreSQL `text[]` array column — spam check uses substring matching, not exact equality. Implementation iterates the keywords array and applies `ILIKE '%keyword%'` against the post title and body: `SELECT EXISTS (SELECT 1 FROM unnest(spam_keywords) AS kw WHERE lower(postTitle) ILIKE '%' || lower(kw) || '%')`. This ensures a keyword `"spam"` matches `"this is spam"` as expected
- `blocked_users.user_email` is stored even for signed-in users as a fallback — if their account is deleted, the email block remains active for guest submissions
- The Pending Posts section in moderation reuses the existing `listPosts()` query with `{ includeUnapproved: true }` — no new query needed
- Audit log `metadata` is `jsonb` — no fixed schema per action type. This is flexible but means the display logic must handle unknown fields gracefully with a fallback formatter
- The settings layout is within the `(workspace)` route group — it has access to workspace context (slug, name, member role) from the parent layout at `[ws-slug]/layout.tsx`
