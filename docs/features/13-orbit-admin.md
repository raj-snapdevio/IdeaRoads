# Feature 13 — Orbit Admin

## Overview

Orbit is a custom-built super-admin panel at `/orbit`. It is completely separate from the workspace-level admin UI. Orbit gives platform operators visibility and control over the entire IdeaRoads installation: all workspaces, all users, feature flags, and background job health.

Orbit is not a third-party service — it is built in-house as part of the same Next.js app.

---

## Core Capabilities

| Section           | Path                   | Description                                           |
| ----------------- | ---------------------- | ----------------------------------------------------- |
| Dashboard         | `/orbit`               | Platform-wide stats and health summary                |
| Workspaces        | `/orbit/workspaces`    | List, search, view, suspend, delete any workspace     |
| Users             | `/orbit/users`         | List, search, view, impersonate any user              |
| Plans             | `/orbit/plans`         | Create, edit, archive, duplicate plan tiers           |
| Platform Settings | `/orbit/settings`      | Signup, limits, maintenance mode (singleton config)   |
| Feature Flags     | `/orbit/feature-flags` | Toggle boolean features on/off platform-wide          |
| Job Queue         | `/orbit/jobs`          | pg-boss background job queue status                   |
| Audit Log         | `/orbit/audit-log`     | Platform-level admin action history (impersonation, etc.) |

---

## Authentication & Access

### How Superadmin Auth Works

1. User signs in via the normal auth flow (Magic Link or Google OAuth)
2. At any protected `/orbit/*` route, the Orbit layout checks:
   - Is there a valid Better Auth session? → If not, redirect to `/signin?next=/orbit`
   - Is the session user in the `superadmins` table? → If not, 403 page
3. Both checks run server-side in `app/orbit/layout.tsx`

There is **no separate login page** for Orbit — it reuses the existing `/signin` flow.

### First Superadmin Seed

When the app starts for the first time with no superadmins in the database, the startup job in `lib/worker/startup.ts` checks `ORBIT_SEED_EMAIL` from env. If set, it upserts a `superadmin` record linked to the user with that email (creating a pending record that activates once the user signs in for the first time).

```
ORBIT_SEED_EMAIL=admin@example.com
```

If `ORBIT_SEED_EMAIL` is not set and no superadmins exist, `/orbit` remains inaccessible until a superadmin row is manually inserted into the database.

### Adding Superadmins

Superadmins can promote other users to superadmin from within Orbit (`/orbit/users/[id]` → "Grant Superadmin"). Only existing superadmins can add or remove superadmins.

### Removing Superadmins

From `/orbit/users/[id]` → "Revoke Superadmin". A superadmin cannot revoke their own access (prevents lockout).

---

## Environment Variables

```
ORBIT_SEED_EMAIL=admin@example.com   # First superadmin email (optional)
```

---

## Database Schema

### `superadmins`

```ts
id          text        PK  (cuid2)
user_id     text        UNIQUE  → user.id (CASCADE DELETE)   -- null for pending (seed email not yet signed up)
email       text        UNIQUE                               -- set for pending records; cleared once user_id resolved
created_at  timestamp   NOT NULL  DEFAULT now()
```

**Constraint:** `CHECK ((user_id IS NOT NULL) OR (email IS NOT NULL))` — at least one identifier required

**Indexes:**
- Index on `user_id` (used in every Orbit auth check)
- Index on `email` (used during sign-in to resolve pending records)

---

### `feature_flags`

```ts
id           text        PK  (cuid2)
key          text        NOT NULL UNIQUE   -- e.g. 'guest_voting', 'public_roadmap'
is_enabled   boolean     NOT NULL  DEFAULT true
description  text        NOT NULL          -- human-readable explanation
created_at   timestamp   NOT NULL  DEFAULT now()
updated_at   timestamp   NOT NULL  DEFAULT now()
```

**Index:** Index on `key` (looked up by key in application code)

---

### `plans`

```ts
id                      text        PK  (cuid2)
name                    text        NOT NULL
slug                    text        NOT NULL UNIQUE   -- e.g. 'free', 'pro', 'business'
description             text
price_usd               numeric(8,2) NOT NULL DEFAULT 0  -- monthly USD price (0 = free)
max_boards              integer               -- null = unlimited
max_members             integer               -- null = unlimited
max_posts_per_month     integer               -- null = unlimited
allow_custom_domain     boolean     NOT NULL  DEFAULT false
allow_api_access        boolean     NOT NULL  DEFAULT false
allow_webhooks          boolean     NOT NULL  DEFAULT false
allow_changelog         boolean     NOT NULL  DEFAULT true
allow_roadmap           boolean     NOT NULL  DEFAULT true
is_default              boolean     NOT NULL  DEFAULT false  -- UNIQUE partial index: WHERE is_default = true
is_archived             boolean     NOT NULL  DEFAULT false
visibility              text        NOT NULL  DEFAULT 'public'  -- 'public' | 'custom'
created_at              timestamp   NOT NULL  DEFAULT now()
updated_at              timestamp   NOT NULL  DEFAULT now()
```

**Notes:**
- `is_default = true` marks the plan auto-assigned to new workspaces — only one row may have this set (enforced via partial unique index)
- `visibility = 'custom'` plans are only available to workspaces explicitly assigned to them by a superadmin
- Archived plans cannot be assigned to new workspaces but existing assignments remain

**Indexes:**
- `UNIQUE (slug)`
- Partial unique index: `UNIQUE (is_default) WHERE is_default = true`

---

### `workspace_plan_assignments`

```ts
workspace_id  text  NOT NULL  → workspaces.id (CASCADE DELETE)
plan_id       text  NOT NULL  → plans.id
assigned_by   text  NOT NULL  → user.id (superadmin)
assigned_at   timestamp NOT NULL DEFAULT now()
PRIMARY KEY (workspace_id)   -- one plan per workspace
```

---

### `platform_settings`

```ts
id                      integer     PK  DEFAULT 1  -- singleton, always id=1
signup_enabled          boolean     NOT NULL  DEFAULT true
max_workspaces_per_user integer     NOT NULL  DEFAULT 5
maintenance_mode        boolean     NOT NULL  DEFAULT false
maintenance_message     text                  -- shown when maintenance_mode = true
updated_at              timestamp   NOT NULL  DEFAULT now()
```

**Usage:** `lib/orbit/settings.ts` caches this row for 60 seconds. Operator edits from `/orbit/settings`.

---

### `workspaces` — added columns

```ts
is_suspended   boolean     NOT NULL  DEFAULT false
suspended_at   timestamp             -- null if not suspended
suspended_by   text                  → user.id (superadmin who suspended)
plan_id        text                  → plans.id (SET NULL) — null means default plan applies
```

When `is_suspended = true`:

- All public-facing workspace routes return 503 with a "This workspace has been suspended" page
- Workspace members (including Owner) cannot access the workspace dashboard
- Suspension is enforced in the `(workspace)` layout and `(public)` layout

---

## File Structure

```
app/
└── orbit/
    ├── layout.tsx                          Orbit layout — superadmin auth check + sidebar
    ├── page.tsx                            Dashboard
    ├── plans/
    │   └── page.tsx                        Plan catalog (create, edit, archive, duplicate)
    ├── settings/
    │   └── page.tsx                        Platform settings (signup, limits, maintenance)
    ├── audit-log/
    │   └── page.tsx                        Platform-level audit log
    ├── workspaces/
    │   ├── page.tsx                        Workspace list
    │   └── [workspaceId]/
    │       └── page.tsx                    Workspace detail
    ├── users/
    │   ├── page.tsx                        User list
    │   └── [userId]/
    │       └── page.tsx                    User detail
    ├── feature-flags/
    │   └── page.tsx                        Feature flags list + toggle
    └── jobs/
        └── page.tsx                        Job queue status

app/api/orbit/
├── stats/
│   └── route.ts                            GET platform stats
├── workspaces/
│   ├── route.ts                            GET list workspaces (paginated + search)
│   └── [workspaceId]/
│       ├── route.ts                        GET workspace detail / PATCH (suspend) / DELETE
│       └── unsuspend/
│           └── route.ts                    POST unsuspend workspace
├── users/
│   ├── route.ts                            GET list users (paginated + search)
│   └── [userId]/
│       ├── route.ts                        GET user detail / PATCH (superadmin)
│       └── impersonate/
│           └── route.ts                    POST start impersonation
├── end-impersonation/
│   └── route.ts                            POST end impersonation session
├── plans/
│   ├── route.ts                            GET list / POST create plan
│   └── [id]/
│       └── route.ts                        GET / PATCH update / DELETE archive plan
├── settings/
│   └── route.ts                            GET platform settings / PATCH update
├── feature-flags/
│   ├── route.ts                            GET all feature flags
│   └── [key]/
│       └── route.ts                        PATCH toggle flag
├── audit-log/
│   └── route.ts                            GET platform-level audit log
└── jobs/
    └── route.ts                            GET job queue status

components/orbit/
├── orbit-sidebar.tsx                       Orbit navigation sidebar
├── orbit-stat-card.tsx                     Summary metric card
├── workspace-table.tsx                     Workspace list table
├── workspace-detail-panel.tsx              Workspace detail + actions
├── user-table.tsx                          User list table
├── user-detail-panel.tsx                   User detail + actions
├── feature-flag-list.tsx                   Feature flag toggles
├── job-queue-table.tsx                     Job queue status table
└── impersonate-banner.tsx                  Banner shown during impersonation session

lib/orbit/
├── auth.ts                                 requireSuperadmin() helper (returns 404, not 403)
├── stats.ts                                getPlatformStats()
├── workspaces.ts                           listOrbitWorkspaces(), suspendWorkspace(), deleteOrbitWorkspace()
├── users.ts                                listOrbitUsers(), grantSuperadmin(), revokeSuperadmin()
├── plans.ts                                listPlans(), createPlan(), updatePlan(), archivePlan(), duplicatePlan()
├── settings.ts                             getPlatformSettings() (60s cached), updatePlatformSettings()
├── feature-flags.ts                        listFeatureFlags(), toggleFlag(), isFeatureEnabled() (60s cached)
└── jobs.ts                                 getJobQueueStatus()
```

---

## Orbit Layout

### `app/orbit/layout.tsx`

Server component — runs on every `/orbit/*` request:

```ts
async function OrbitLayout({ children }) {
  const session = await getServerSession()
  if (!session) redirect("/signin?next=/orbit")

  const isSuperadmin = await db.query.superadmins.findFirst({
    where: eq(superadmins.userId, session.user.id),
  })
  if (!isSuperadmin) notFound()  // 404, not 403 — don't reveal Orbit exists

  return (
    <div className="orbit-layout">
      <OrbitSidebar currentUser={session.user} />
      <main>{children}</main>
    </div>
  )
}
```

Why `notFound()` instead of a 403: Orbit should not be discoverable by non-superadmins.

---

### `components/orbit/orbit-sidebar.tsx`

Client component:

```
┌──────────────────────┐
│  ⬡ Orbit Admin       |
│  ──────────────────  │
│  ■ Dashboard         │
│  □ Workspaces        │
│  □ Users             │
│  □ Feature Flags     │
│  □ Job Queue         │
│  ──────────────────  │
│  [avatar] devang@... │
│  Back to App         │
└──────────────────────┘
```

- Active route highlighted
- "Back to App" → `/` (or the user's primary workspace if they have one)
- Shows superadmin email/name at bottom

---

## Dashboard Page

### `app/orbit/page.tsx`

Server component — fetches stats, renders summary cards:

```
┌────────────────────────────────────────────────────────────────┐
│  Platform Overview                              2026-06-22      │
│                                                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────┐ │
│  │ Workspaces   │ │ Users        │ │ Posts        │ │ Votes │ │
│  │     42       │ │    318       │ │   1,204      │ │ 8,951 │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └───────┘ │
│                                                                │
│  ┌──────────────┐ ┌──────────────┐                            │
│  │ Comments     │ │ Suspended    │                            │
│  │    3,876     │ │      2       │                            │
│  └──────────────┘ └──────────────┘                            │
│                                                                │
│  Recent Workspaces                    Recent Users             │
│  [last 5 workspaces created]          [last 5 users joined]    │
└────────────────────────────────────────────────────────────────┘
```

### `lib/orbit/stats.ts`

```ts
getPlatformStats()
  → parallel COUNT queries:
    - total workspaces (non-deleted)
    - suspended workspaces
    - total users
    - total posts (non-deleted)
    - total votes
    - total comments (non-deleted)
    - new workspaces this month
    - new users this month
  → Returns: PlatformStats object
  → Single db call using Promise.all([...])
```

---

## Workspaces

### `app/orbit/workspaces/page.tsx`

Server component + search via URL params:

```
Workspaces                                          [Search: ___________]

Name           Slug         Owner              Posts   Members  Created      Status
──────────────────────────────────────────────────────────────────────────────────────
Acme Feedback  acme         alice@acme.com     142     8        2026-01-15   Active
TechCorp       techcorp     bob@techcorp.io    89      3        2026-02-20   Active
BadActor       badactor     spam@example.com   2       1        2026-06-21   Suspended

[← Previous]  Page 1 of 5  [Next →]
```

**Columns:** Name (link to detail) | Slug | Owner email | Post count | Member count | Created | Status badge

**Search:** full-text on name, slug, owner email

**Filters:** All / Active / Suspended

---

### `app/orbit/workspaces/[workspaceId]/page.tsx`

Server component:

```
← Workspaces

Acme Feedback                                         [Suspend] [Delete]
acme.idearoads.com

Owner: alice@acme.com
Created: 2026-01-15
Members: 8 | Posts: 142 | Votes: 1,203 | Comments: 438

Boards (3)          Categories (7)         Recent Posts (last 10)
[boards list]       [categories list]      [posts list]
```

**Actions:**

- **Suspend** → AlertDialog: "Suspend this workspace? All members will lose access." → POST to suspend endpoint
- **Unsuspend** → shown if currently suspended → POST to unsuspend endpoint
- **Delete** → AlertDialog: type workspace slug to confirm → DELETE endpoint (hard delete, CASCADE)
- **Visit** → external link to `/{ws-slug}` (superadmin bypasses suspension check)

---

### `lib/orbit/workspaces.ts`

```ts
listOrbitWorkspaces({ page, limit=25, search?, status? })
  → JOIN workspaces + users (owner) + COUNT(boards) + COUNT(posts) + COUNT(workspace_members)
  → ILIKE search on name, slug, owner email
  → filter by is_suspended if status provided
  → returns { workspaces, total, hasMore }

getOrbitWorkspace(workspaceId)
  → full workspace detail with owner, boards, categories, recent 10 posts

suspendWorkspace(workspaceId, suspendedBy: superadminUserId)
  → UPDATE workspaces SET is_suspended=true, suspended_at=now(), suspended_by=suspendedBy
  → createAuditLog (orbit action, workspace scope)

unsuspendWorkspace(workspaceId)
  → UPDATE workspaces SET is_suspended=false, suspended_at=null, suspended_by=null

deleteOrbitWorkspace(workspaceId)
  → db.transaction():
    → DELETE workspaces WHERE id = workspaceId (CASCADE handles children)
    → enqueue SEND_WORKSPACE_DELETED_EMAIL job (from Feature 02)
```

---

## Users

### `app/orbit/users/page.tsx`

```
Users                                               [Search: ___________]

Name           Email                  Joined         Workspaces   Superadmin
────────────────────────────────────────────────────────────────────────────
Devang Patel   devang@debutify.com    2026-01-10     3            ★
Alice Chen     alice@acme.com         2026-01-15     1
Bob Smith      bob@techcorp.io        2026-02-20     1

[← Previous]  Page 1 of 13  [Next →]
```

**Search:** full-text on name, email

**Filters:** All / Superadmins

---

### `app/orbit/users/[userId]/page.tsx`

```
← Users

Devang Patel                              [Impersonate] [Revoke Superadmin]
devang@debutify.com                            ★ Superadmin

Joined: 2026-01-10
Last seen: 2026-06-22
Sign-in methods: Google, Magic Link

Workspace Memberships (3)
  ┌──────────────────┬────────┬───────────────┐
  │ Workspace        │ Role   │ Joined        │
  ├──────────────────┼────────┼───────────────┤
  │ IdeaRoads HQ     │ Owner  │ 2026-01-10    │
  │ Acme Feedback    │ Admin  │ 2026-03-01    │
  │ TechCorp         │ Member │ 2026-04-15    │
  └──────────────────┴────────┴───────────────┘

Recent Posts (last 5)         Recent Comments (last 5)
[list]                        [list]
```

**Actions:**

- **Impersonate** → see Impersonation section below
- **Grant Superadmin** / **Revoke Superadmin** → toggle superadmin status
  - Cannot revoke own superadmin status (button disabled with tooltip: "Cannot revoke your own access")

---

### `lib/orbit/users.ts`

```ts
listOrbitUsers({ page, limit=25, search?, superadminsOnly? })
  → JOIN users + superadmins (LEFT) + COUNT(workspace_members)
  → ILIKE on name, email
  → returns { users: OrbitUser[], total, hasMore }

getOrbitUser(userId)
  → user detail + accounts (auth methods) + workspace memberships + last 5 posts + last 5 comments

grantSuperadmin(userId, grantedBy)
  → INSERT INTO superadmins (userId) ON CONFLICT DO NOTHING
  → createAuditLog

revokeSuperadmin(userId, revokedBy)
  → guard: userId !== revokedBy (cannot self-revoke)
  → DELETE FROM superadmins WHERE user_id = userId
  → createAuditLog
```

---

## Plans

### `app/orbit/plans/page.tsx`

```
Plans                                          [+ New Plan]

Name       Slug      Price    Boards  Members  API  Webhooks  Status
─────────────────────────────────────────────────────────────────────
Free       free      $0       3       5        —    —         Default
Pro        pro       $9/mo    10      25       ✓    ✓         Active
Business   business  $29/mo   ∞       ∞        ✓    ✓         Active
Enterprise enterprise —       ∞       ∞        ✓    ✓         Custom (hidden)
```

- Each row: click → `<PlanFormSheet />` side panel opens for editing
- "Duplicate" button — copies a plan as a new draft with `is_default = false`
- "Archive" button — sets `is_archived = true` (cannot archive the default plan)
- Archived plans shown in a collapsed "Archived" section at the bottom
- `visibility = 'custom'` plans hidden from public plan selection; assignable per-workspace from workspace detail page

### `lib/orbit/plans.ts`

```ts
listPlans()
  → SELECT * FROM plans ORDER BY price_usd ASC, created_at ASC

createPlan(data)
  → INSERT INTO plans
  → if data.isDefault: clear previous default first (UPDATE SET is_default=false), then set new
  → createAuditLog: 'plan.created'

updatePlan(id, changes)
  → UPDATE plans WHERE id = id
  → if changes.isDefault: clear previous default within db.transaction()
  → createAuditLog: 'plan.updated'

archivePlan(id)
  → guard: cannot archive the default plan
  → UPDATE plans SET is_archived = true, updated_at = now()
  → createAuditLog: 'plan.archived'

duplicatePlan(id)
  → SELECT original, INSERT copy with name="{original} (Copy)", is_default=false, is_archived=false
  → createAuditLog: 'plan.duplicated'

assignPlanToWorkspace(workspaceId, planId, assignedBy)
  → UPSERT workspace_plan_assignments (workspaceId) DO UPDATE SET plan_id, assigned_by, assigned_at
  → createAuditLog: 'workspace.plan_assigned'

getWorkspacePlan(workspaceId): Plan
  → JOIN workspace_plan_assignments + plans WHERE workspace_id = workspaceId
  → Falls back to the default plan if no explicit assignment exists
```

### Plan Limit Enforcement

Plan limits are enforced server-side in each relevant service function. A shared helper reads the workspace's current plan:

```ts
// lib/plans/enforce.ts
export async function getWorkspacePlan(workspaceId: string): Promise<Plan> {
  // Joins workspace_plan_assignments → plans, falls back to default plan
}

export async function assertBoardLimit(workspaceId: string): Promise<void> {
  const plan = await getWorkspacePlan(workspaceId)
  if (plan.maxBoards === null) return  // unlimited
  const count = await db.select({ n: count() }).from(boards)
    .where(and(eq(boards.workspaceId, workspaceId), eq(boards.isArchived, false)))
  if (count[0].n >= plan.maxBoards) throw new PlanLimitError("Board limit reached for your plan")
}

export async function assertMemberLimit(workspaceId: string): Promise<void> {
  const plan = await getWorkspacePlan(workspaceId)
  if (plan.maxMembers === null) return
  const count = await db.select({ n: count() }).from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspaceId))
  if (count[0].n >= plan.maxMembers) throw new PlanLimitError("Member limit reached for your plan")
}

export async function assertApiAccess(workspaceId: string): Promise<void> {
  const plan = await getWorkspacePlan(workspaceId)
  if (!plan.allowApiAccess) throw new PlanLimitError("API access is not available on your plan")
}

export async function assertWebhookAccess(workspaceId: string): Promise<void> {
  const plan = await getWorkspacePlan(workspaceId)
  if (!plan.allowWebhooks) throw new PlanLimitError("Webhooks are not available on your plan")
}
```

**Where enforcement is called:**

| Service function | Assertion |
|-----------------|-----------|
| `createBoard()` | `assertBoardLimit(workspaceId)` |
| `inviteMember()` / `acceptInvite()` | `assertMemberLimit(workspaceId)` |
| `createApiKey()` | `assertApiAccess(workspaceId)` |
| `createWebhookEndpoint()` | `assertWebhookAccess(workspaceId)` |

`PlanLimitError` returns HTTP `402 Payment Required` with `{ error: "Plan limit reached", limit: "boards" | "members" | "api_access" | "webhooks" }`. The client shows an upgrade prompt.

---

## Platform Settings

### `app/orbit/settings/page.tsx`

```
Platform Settings

Signup
[Toggle]  Allow new user signups
          "Disable to prevent new accounts. Existing users can still sign in."

Workspace Limit
Max workspaces per user: [5____]
"How many workspaces a single user can create."

Maintenance Mode
[Toggle]  Put the platform in maintenance mode
Message:  [__________________________________]
          "Shown to all visitors when maintenance mode is on."

[Save Changes]
```

### `lib/orbit/settings.ts`

```ts
let _cache: { data: PlatformSettings; expiresAt: number } | null = null

getPlatformSettings()
  → if cache is fresh (expiresAt > now): return cached
  → SELECT * FROM platform_settings WHERE id = 1
  → if no row: INSERT defaults (id=1, signup_enabled=true, max_workspaces=5, maintenance=false)
  → cache result for 60 seconds
  → return settings

updatePlatformSettings(changes)
  → UPSERT platform_settings WHERE id = 1
  → _cache = null  (invalidate immediately)
  → createAuditLog: 'platform.settings_updated'
```

**Maintenance mode** enforced in `middleware.ts`:
```ts
const settings = await getPlatformSettings()
if (settings.maintenanceMode && !isOrbitRoute && !isSuperadmin) {
  return NextResponse.rewrite(new URL("/maintenance", req.url))
}
```

---

## Impersonation

Allows a superadmin to sign in as any user for debugging purposes without knowing their password.

### Flow

```
1. Superadmin clicks "Impersonate" on /orbit/users/[userId]
2. POST /api/orbit/users/[userId]/impersonate
3. Server:
   a. Verifies caller is superadmin
   b. Creates a special Better Auth session for targetUser
      (or signs in as target user using Better Auth's admin API if available,
       otherwise: creates a temporary impersonation cookie containing
       { superadminId, targetUserId, originalSessionId } signed with BETTER_AUTH_SECRET)
   c. Sets httpOnly cookie: impersonation_session (15 min TTL)
   d. Logs to audit_logs: action='impersonation.started', actor=superadminId, entityId=targetUserId
4. Response: { redirectUrl: '/' }
5. Client: window.location.href = redirectUrl
6. User now browsing as the target user
7. ImpersonateBanner shown at top of every page (reads impersonation_session cookie)
```

### `components/orbit/impersonate-banner.tsx`

Rendered in root `app/layout.tsx` — visible when `impersonation_session` cookie is set:

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ⚠ You are impersonating alice@acme.com              [End Impersonation] │
└──────────────────────────────────────────────────────────────────────────┘
```

- Fixed at top, high z-index, amber/yellow background
- "End Impersonation" → POST `/api/orbit/end-impersonation`
  - Clears `impersonation_session` cookie
  - Restores superadmin session (redirects to `/orbit`)
  - Logs: `impersonation.ended`

### `app/api/orbit/end-impersonation/route.ts`

```
POST — no body required
Reads impersonation_session cookie:
  - Clears it
  - If originalSessionId present: re-activates original superadmin session
  - createAuditLog: impersonation.ended
  - Redirects to /orbit
```

### Impersonation Audit

Two audit log entries are always created:

- `impersonation.started` — when impersonation begins
- `impersonation.ended` — when it ends (either manually or on cookie expiry)

These entries are visible in the standard audit log with entity_type = `'user'`.

### Security Notes

- Impersonation cookie is httpOnly (not readable by JS), signed with `BETTER_AUTH_SECRET`
- TTL: 15 minutes — auto-expires
- Any write action taken while impersonating records the impersonator ID in `actor_id` in audit_logs — not the target user's ID
- Impersonation is disabled in production unless `ENABLE_IMPERSONATION=true` is set

```
ENABLE_IMPERSONATION=true   # Default: false (disabled in prod)
```

---

## Feature Flags

### `app/orbit/feature-flags/page.tsx`

```
Feature Flags

Key                      Description                              Status
──────────────────────────────────────────────────────────────────────────
guest_voting             Allow guests to vote with email only    [ON  ●]
public_roadmap           Allow workspaces to make roadmap public [ON  ●]
public_changelog         Allow workspaces to publish changelog   [ON  ●]
magic_link_auth          Magic link sign-in                      [ON  ●]
google_auth              Google OAuth sign-in                    [ON  ●]
changelog_rss            RSS feed for changelog                  [ON  ●]
```

Each row has a toggle — PATCH `/api/orbit/feature-flags/[key]` on change.

### `lib/orbit/feature-flags.ts`

```ts
listFeatureFlags()
  → SELECT * FROM feature_flags ORDER BY key

toggleFlag(key, isEnabled)
  → UPDATE feature_flags SET is_enabled = isEnabled, updated_at = now() WHERE key = key
  → createAuditLog: 'feature_flag.toggled'
  → returns updated flag

isFeatureEnabled(key: string): Promise<boolean>
  → SELECT is_enabled FROM feature_flags WHERE key = key
  → Cache in memory for 60 seconds (module-level Map with TTL)
  → Default: true if flag row does not exist (opt-out model)
```

### Seeding Feature Flags

Default feature flags are seeded at startup in `lib/worker/startup.ts`:

```ts
const DEFAULT_FLAGS = [
  {
    key: "guest_voting",
    description: "Allow guests to vote with email only",
    isEnabled: true,
  },
  {
    key: "public_roadmap",
    description: "Allow workspaces to make roadmap public",
    isEnabled: true,
  },
  {
    key: "public_changelog",
    description: "Allow workspaces to publish changelog",
    isEnabled: true,
  },
  {
    key: "magic_link_auth",
    description: "Magic link sign-in",
    isEnabled: true,
  },
  { key: "google_auth", description: "Google OAuth sign-in", isEnabled: true },
  {
    key: "changelog_rss",
    description: "RSS feed for changelog",
    isEnabled: true,
  },
];

// INSERT INTO feature_flags ON CONFLICT (key) DO NOTHING
```

### Using Feature Flags in Code

```ts
// Server-side check (in API routes / server components)
import { isFeatureEnabled } from "@/lib/orbit/feature-flags";

const guestVotingEnabled = await isFeatureEnabled("guest_voting");
if (!guestVotingEnabled) {
  // require auth to vote
}
```

---

## Job Queue Status

### `app/orbit/jobs/page.tsx`

```
Background Job Queue                        [Refresh]

Active Jobs
───────────────────────────────────────────────────
Job Name                   Count   State   Oldest
SEND_NEW_COMMENT_EMAIL     0       idle    —
SEND_STATUS_CHANGE_EMAIL   3       active  2 min ago
SEND_CHANGELOG_EMAIL       142     active  5 min ago
CLEANUP_EXPIRED_INVITES    0       idle    —
...

Failed Jobs (last 24h)
───────────────────────────────────────────────────
Job Name                   Count   Last Error
SEND_CHANGELOG_EMAIL       2       "ECONNREFUSED smtp.example.com"
```

### `lib/orbit/jobs.ts`

```ts
getJobQueueStatus()
  → queries pg-boss internal tables:
    - pgboss.job: active jobs grouped by name + state
    - pgboss.job WHERE state = 'failed' AND createdon > NOW() - INTERVAL '24h'
  → Returns: { active: JobStat[], failed: FailedJob[] }
```

pg-boss schema tables used:

- `pgboss.job`: name, state, createdon, startedon
- `pgboss.schedule`: name, cron (cron jobs)

No direct pg-boss internal API is called — raw SQL only to avoid coupling to pg-boss internals.

---

## API Reference

| Method | Route                                  | Description                             |
| ------ | -------------------------------------- | --------------------------------------- |
| GET    | `/api/orbit/stats`                     | Platform summary stats                  |
| GET    | `/api/orbit/workspaces`                | List workspaces (paginated, searchable) |
| GET    | `/api/orbit/workspaces/[id]`           | Workspace detail                        |
| PATCH  | `/api/orbit/workspaces/[id]`           | Suspend workspace                       |
| POST   | `/api/orbit/workspaces/[id]/unsuspend` | Unsuspend workspace                     |
| DELETE | `/api/orbit/workspaces/[id]`           | Delete workspace                        |
| GET    | `/api/orbit/users`                     | List users (paginated, searchable)      |
| GET    | `/api/orbit/users/[id]`                | User detail                             |
| PATCH  | `/api/orbit/users/[id]`                | Grant/revoke superadmin                 |
| POST   | `/api/orbit/users/[id]/impersonate`    | Start impersonation                     |
| POST   | `/api/orbit/end-impersonation`         | End impersonation session               |
| GET    | `/api/orbit/feature-flags`             | List feature flags                      |
| PATCH  | `/api/orbit/feature-flags/[key]`       | Toggle feature flag                     |
| GET    | `/api/orbit/jobs`                      | Job queue status                        |

---

### API Auth Middleware

All `/api/orbit/*` routes use a shared helper:

```ts
// lib/orbit/auth.ts
export async function requireSuperadmin(request: NextRequest) {
  const session = await getServerSession();
  if (!session) throw new ApiError(401, "Unauthorized");

  const superadmin = await db.query.superadmins.findFirst({
    where: eq(superadmins.userId, session.user.id),
  });
  if (!superadmin) throw new ApiError(404, "Not found"); // same as layout — don't reveal Orbit

  return { session, superadmin };
}
```

The 404 (not 403) pattern matches the layout — Orbit is invisible to non-superadmins.

---

## Workspace Suspension Enforcement

### In `(workspace)/[ws-slug]/layout.tsx`

```ts
const workspace = await getWorkspaceBySlug(wsSlug)
if (!workspace) notFound()

// Superadmins can still access suspended workspaces
const isSuperadmin = session ? await checkSuperadmin(session.user.id) : false

if (workspace.isSuspended && !isSuperadmin) {
  // Render suspended page — not a redirect, rendered inline
  return <WorkspaceSuspendedPage />
}
```

### `<WorkspaceSuspendedPage />`

Simple full-page message:

```
This workspace has been suspended.
If you believe this is an error, please contact the platform administrator.
```

- No workspace name shown (avoid confirming the workspace exists)
- HTTP 503 status (set via `generateMetadata` or route handler)

### In `(public)/[ws-slug]/layout.tsx`

Same check applied — public visitors also see the suspended page.

---

## Orbit Audit Log

Orbit actions are logged in the same `audit_logs` table used by Feature 12, with `workspace_id = null` for platform-level actions:

| Action                            | Entity Type |
| --------------------------------- | ----------- |
| `workspace.suspended`             | `workspace` |
| `workspace.unsuspended`           | `workspace` |
| `workspace.deleted_by_superadmin` | `workspace` |
| `superadmin.granted`              | `user`      |
| `superadmin.revoked`              | `user`      |
| `impersonation.started`           | `user`      |
| `impersonation.ended`             | `user`      |
| `feature_flag.toggled`            | `platform`  |

These entries are visible in the audit log for the affected workspace (where applicable) and also in a future Orbit-level audit log view. In MVP, they are stored but there is no dedicated Orbit audit log viewer page — they appear in the workspace's audit log when `workspace_id` is set, and are queryable directly from the database for platform-level actions.

---

## User Flows

### First Deployment — Seeding the Superadmin

```
1. Operator sets ORBIT_SEED_EMAIL=admin@example.com in .env
2. App starts → lib/worker/startup.ts runs
3. Checks superadmins table: empty
4. Looks up user by ORBIT_SEED_EMAIL
   → if user exists: INSERT INTO superadmins (user_id) ON CONFLICT DO NOTHING
   → if user does not exist yet: INSERT INTO superadmins (email) — pending record
5. On first sign-in by that email:
   → Better Auth `onSignIn` hook checks superadmins WHERE email = signedInEmail
   → if found: UPDATE superadmins SET user_id = newUserId, email = null
6. Operator signs in as admin@example.com
7. Navigates to /orbit → access granted
```

### Superadmin Suspends a Workspace

```
1. Navigate to /orbit/workspaces
2. Find "BadActor" workspace
3. Click workspace name → /orbit/workspaces/[id]
4. Click "Suspend" → AlertDialog confirmation
5. PATCH /api/orbit/workspaces/[id] { suspended: true }
6. workspaces.is_suspended = true
7. Audit log: workspace.suspended
8. Any visitor to /{ws-slug}/* now sees WorkspaceSuspendedPage
```

### Superadmin Impersonates a User

```
1. Navigate to /orbit/users → find user
2. Click user name → /orbit/users/[id]
3. Click "Impersonate"
4. POST /api/orbit/users/[id]/impersonate
5. impersonation_session cookie set (15 min TTL)
6. Redirected to / — now browsing as the target user
7. ImpersonateBanner visible at top of every page
8. Superadmin investigates reported issue
9. Clicks "End Impersonation" in banner
10. Cookie cleared → redirected back to /orbit
```

### Superadmin Disables Guest Voting Platform-Wide

```
1. Navigate to /orbit/feature-flags
2. Find "guest_voting" → currently ON
3. Toggle to OFF
4. PATCH /api/orbit/feature-flags/guest_voting { isEnabled: false }
5. feature_flags row updated
6. In-memory cache TTL expires within 60 seconds
7. All subsequent vote attempts by guests: isFeatureEnabled('guest_voting') = false → 403
```

---

## Edge Cases

| Case                                                           | Handling                                                                                                                                                |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Superadmin navigates to Orbit with no workspaces in DB         | Dashboard shows all-zero stat cards — no error                                                                                                          |
| Superadmin tries to delete a workspace that is already deleted | 404 from API                                                                                                                                            |
| Superadmin tries to revoke their own superadmin                | API returns 400: "Cannot revoke your own superadmin access"                                                                                             |
| Impersonation cookie expires mid-session                       | Next request to any page: impersonation_session missing → ImpersonateBanner not shown → user is back to their normal session. No explicit logout needed |
| Two superadmins impersonate the same user simultaneously       | Both allowed — impersonation is read-mostly for debugging. No lock needed                                                                               |
| `ORBIT_SEED_EMAIL` set but email is already a superadmin       | `INSERT ON CONFLICT DO NOTHING` — idempotent, no error                                                                                                  |
| Feature flag key not in `feature_flags` table                  | `isFeatureEnabled()` returns `true` (opt-out model — new flags default to enabled until explicitly seeded)                                              |
| `isFeatureEnabled()` DB query fails                            | Falls back to `true` — error logged. Fail-open keeps platform running                                                                                   |
| Superadmin visits suspended workspace                          | `is_suspended` check in layout skipped for superadmins — full workspace visible                                                                         |
| Non-superadmin discovers `/orbit` URL                          | Layout returns `notFound()` → 404 page, same as any other non-existent page. Orbit's existence is not revealed                                          |
| pg-boss table not found (worker hasn't started yet)            | `getJobQueueStatus()` catches the error, returns `{ active: [], failed: [], error: "Queue not initialized" }` — Job Queue page shows error state        |

---

## Acceptance Criteria

**Auth:**

- [ ] `/orbit` returns 404 for non-superadmins (not 403)
- [ ] `/orbit` redirects to `/signin?next=/orbit` for unauthenticated users
- [ ] `ORBIT_SEED_EMAIL` seeds superadmin on first startup

**Dashboard:**

- [ ] Platform stats (workspaces, users, posts, votes, comments, suspended) all accurate
- [ ] Recent workspaces and recent users listed

**Workspaces:**

- [ ] Workspace list paginated (25 per page)
- [ ] Search by name, slug, or owner email
- [ ] Filter by Active / Suspended
- [ ] Workspace detail shows owner, boards, categories, recent posts
- [ ] Suspend workspace → WorkspaceSuspendedPage shown to all visitors including members
- [ ] Unsuspend workspace → workspace accessible again
- [ ] Delete workspace → CASCADE delete + owner notified via email
- [ ] Delete requires typing workspace slug to confirm

**Users:**

- [ ] User list paginated, searchable by name and email
- [ ] User detail shows auth methods, workspace memberships, recent posts, recent comments
- [ ] Grant Superadmin → user gains access to /orbit
- [ ] Revoke Superadmin → user loses access to /orbit
- [ ] Cannot revoke own superadmin (button disabled)

**Impersonation:**

- [ ] Impersonate user → ImpersonateBanner visible, browsing as target
- [ ] ImpersonateBanner shows target user's email
- [ ] "End Impersonation" clears session and returns to /orbit
- [ ] Impersonation cookie expires after 15 minutes
- [ ] Impersonation disabled unless `ENABLE_IMPERSONATION=true`
- [ ] Audit log entries created for start and end of impersonation

**Feature Flags:**

- [ ] All 6 default flags seeded on startup
- [ ] Toggle switches update flag immediately (optimistic UI)
- [ ] `isFeatureEnabled()` respects flag state within 60-second cache TTL
- [ ] Disabling `guest_voting` prevents unauthenticated vote submissions

**Job Queue:**

- [ ] Active jobs listed with count and state
- [ ] Failed jobs in last 24h listed with error message
- [ ] Refresh button re-fetches queue status

---

## Implementation Notes

- Orbit is a **plain Next.js route group** (`app/orbit/`) with its own layout — no special framework or configuration
- All Orbit pages are **server components** — no client state needed except for the feature flag toggles and impersonate button (minimal islands)
- The `isFeatureEnabled()` module-level cache (Map + TTL) means a flag change takes up to 60 seconds to propagate to all server instances in a multi-replica deployment. This is acceptable for MVP (flag changes are rare operational actions, not user-facing UX)
- `workspace_id = null` in `audit_logs` for platform-level Orbit actions — the schema allows null on this column. Queries for workspace-scoped audit logs use `WHERE workspace_id = ?` which naturally excludes platform-level entries
- The Orbit sidebar "Back to App" link: if the superadmin has a workspace (common case), link to `/{first-workspace-slug}`; else link to `/onboarding`. Resolved server-side in the layout
- No separate database connection or schema for Orbit — everything in the same PostgreSQL instance, same Drizzle client
- Orbit has no public-facing pages and is not linked from any marketing or workspace UI — it is purely accessed by navigating to `/orbit` directly
