# Feature 02 — Workspaces

## Overview

A **Workspace** is the top-level container in IdeaRoads. Everything — boards, posts, votes, members, changelog entries — lives inside a workspace. Each workspace has its own slug, which forms the base of all URLs: `/{ws-slug}/...`

A user can own or belong to multiple workspaces and switch between them from the sidebar. When a user signs in for the first time and has no workspace, they are redirected to `/onboarding` to create one.

---

## Core Behaviour

- One user can create or belong to multiple workspaces
- Each workspace is fully isolated — no data bleeds between workspaces
- The workspace **slug** is unique platform-wide and used in every URL
- A default **"Feature Requests"** board is created automatically when a workspace is created
- Only the **Owner** can delete a workspace
- Deleting a workspace hard-deletes all data via PostgreSQL `CASCADE` and enqueues a deletion email job
- Workspace settings (name, slug, description, logo) are editable by Owner and Admin

---

## Dependencies

```
@paralleldrive/cuid2    — generate collision-resistant IDs
slugify                 — auto-generate slug from workspace name
pg-boss                 — enqueue SEND_WORKSPACE_DELETED_EMAIL job
nodemailer              — deliver the deletion email
```

---

## Environment Variables

No new environment variables beyond Feature 01. Uses:

```env
DATABASE_URL
BETTER_AUTH_SECRET
BETTER_AUTH_URL
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_APP_NAME
SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / EMAIL_FROM
```

---

## Database Schema

### `workspaces`

```ts
id                text          PK  (cuid2)
slug              text          NOT NULL  UNIQUE
name              text          NOT NULL
description       text
logo_url          text
owner_id          text          NOT NULL  → user.id (CASCADE DELETE)
roadmap_public    boolean       NOT NULL  DEFAULT true
changelog_public  boolean       NOT NULL  DEFAULT true
moderation_mode   text          NOT NULL  DEFAULT 'off'   -- 'off' | 'auto' | 'manual'
comment_moderation boolean      NOT NULL  DEFAULT false
spam_keywords     text[]        NOT NULL  DEFAULT []
created_at        timestamp     NOT NULL  DEFAULT now()
updated_at        timestamp     NOT NULL  DEFAULT now()
```

**Indexes:**
- `UNIQUE` on `slug`
- Index on `owner_id`

---

## File Structure

```
app/
├── onboarding/
│   └── page.tsx                        Create first workspace (server + client)
├── post-auth/
│   └── page.tsx                        Updated: redirect to workspace or onboarding
├── (workspace)/
│   └── [ws-slug]/
│       ├── layout.tsx                  Workspace layout — sidebar, nav, switcher
│       ├── page.tsx                    Workspace dashboard (boards overview)
│       └── settings/
│           └── general/
│               └── page.tsx            Edit workspace / delete workspace
└── api/
    └── workspaces/
        ├── route.ts                    GET (list mine) / POST (create)
        └── [slug]/
            └── route.ts                GET (single) / PATCH (update) / DELETE

components/
├── workspace/
│   ├── workspace-switcher.tsx          Dropdown: list workspaces + create new
│   ├── workspace-nav.tsx               Sidebar navigation for a workspace
│   ├── create-workspace-form.tsx       Onboarding form (name → auto-slug)
│   └── workspace-settings-form.tsx     Edit name / slug / description / logo
└── layout/
    └── navbar.tsx                      Top bar with switcher + user menu

lib/
└── workspaces/
    ├── workspace.ts                    CRUD service functions
    └── index.ts                        Re-exports

db/schema/
└── workspaces.ts                       Drizzle table definition

lib/worker/handlers/
└── send-workspace-deleted-email.ts     pg-boss job handler
```

---

## Implementation Details

### `db/schema/workspaces.ts`

```ts
import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core"
import { user } from "./auth"

export const workspaces = pgTable("workspaces", {
  id:                 text("id").primaryKey(),
  slug:               text("slug").notNull().unique(),
  name:               text("name").notNull(),
  description:        text("description"),
  logoUrl:            text("logo_url"),
  ownerId:            text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  roadmapPublic:      boolean("roadmap_public").notNull().default(true),
  changelogPublic:    boolean("changelog_public").notNull().default(true),
  moderationMode:     text("moderation_mode").notNull().default("off"),
  commentModeration:  boolean("comment_moderation").notNull().default(false),
  spamKeywords:       text("spam_keywords").array().notNull().default([]),
  createdAt:          timestamp("created_at").notNull().defaultNow(),
  updatedAt:          timestamp("updated_at").notNull().defaultNow(),
})
```

---

### `lib/workspaces/workspace.ts` — Service Layer

```ts
createWorkspace({ name, ownerId })
  → generates cuid2 id
  → generates unique slug from name (slugify + collision check)
  → inserts workspace row
  → inserts workspace_members row (role: 'owner')
  → inserts default board ("Feature Requests", slug: "feature-requests")
  → returns workspace

getWorkspaceBySlug(slug)
  → returns workspace or null

getWorkspacesForUser(userId)
  → returns all workspaces where user is a member (via workspace_members join)

updateWorkspace(id, { name?, slug?, description?, logoUrl? })
  → if slug changes: check slug not taken, check not reserved
  → updates workspace row
  → returns updated workspace

deleteWorkspace(id, requesterId)
  → verifies requester is owner
  → fetches all workspace member emails (for notification)
  → hard deletes workspace (CASCADE removes all child data)
  → enqueues SEND_WORKSPACE_DELETED_EMAIL job with member emails + workspace name
```

---

### `app/api/workspaces/route.ts`

**GET** — List workspaces for the signed-in user
```
Auth: requireSession
Returns: workspace[] (id, slug, name, logoUrl, role)
```

**POST** — Create a new workspace
```
Auth: requireSession
Body: { name: string }
Validates: name required, 2–50 chars
Calls: createWorkspace({ name, ownerId: session.user.id })
Returns: 201 + workspace
```

---

### `app/api/workspaces/[slug]/route.ts`

**GET** — Get single workspace
```
Auth: requireWorkspaceMember(slug)
Returns: workspace + member role
```

**PATCH** — Update workspace
```
Auth: requireRole(['owner', 'admin'])
Body: { name?, slug?, description?, logoUrl? }
Validates:
  - name: 2–50 chars
  - slug: 2–50 chars, lowercase, alphanumeric + hyphens only, not reserved
  - slug unique platform-wide
Returns: updated workspace
```

**DELETE** — Delete workspace
```
Auth: requireRole(['owner'])
Validates: no additional body needed
Calls: deleteWorkspace(workspace.id, session.user.id)
Returns: 204
```

---

### `app/onboarding/page.tsx`

- Server component wrapper, client form inside
- Checks session (redirect `/signin` if not signed in)
- Checks if user already has a workspace (redirect `/{ws-slug}` if yes)
- Renders `<CreateWorkspaceForm />`
- On success: redirect to `/{new-ws-slug}?welcome=1`

---

### `app/(workspace)/[ws-slug]/layout.tsx`

- Server component
- Calls `getWorkspaceBySlug(params['ws-slug'])`
- If workspace not found → 404
- Checks session → if not signed in redirect `/signin`
- Checks user is a member of this workspace → if not redirect `/signin`
- Passes workspace + member role as props to children via Context or props
- Renders: `<WorkspaceNav />` (sidebar) + `<Navbar />` (top bar) + `{children}`

---

### `app/(workspace)/[ws-slug]/page.tsx`

- Workspace dashboard
- Lists all boards in this workspace (name, post count, visibility)
- Shows welcome banner if `?welcome=1` query param is present (client component, localStorage dismiss)
- Quick actions: create board, invite member
- If no boards (beyond default): prompt to create first board

---

### `app/(workspace)/[ws-slug]/settings/general/page.tsx`

- Renders `<WorkspaceSettingsForm />` pre-filled with current workspace data
- Separate "Danger Zone" section with delete workspace button
- Delete triggers AlertDialog: type workspace name to confirm → calls DELETE `/api/workspaces/[slug]`
- On delete success: redirect `/post-auth` (which detects remaining workspaces and routes to `/{ws-slug}` or `/onboarding`)

---

### `components/workspace/create-workspace-form.tsx`

- Client component
- Fields: `name` (text input)
- Auto-generates slug preview as user types (slugify, debounced)
- Slug field is editable (user can override)
- Slug availability check: debounced GET `/api/workspaces/check-slug?slug=xxx`
- Submit: POST `/api/workspaces`
- On success: `router.push(`/${slug}?welcome=1`)`

---

### `components/workspace/workspace-switcher.tsx`

- Client component — dropdown menu in the sidebar header
- Shows current workspace name + logo avatar
- Lists all workspaces the user belongs to with role badge
- "Create workspace" option at the bottom → navigates to `/onboarding`
- Clicking a workspace navigates to `/{ws-slug}`
- Fetch workspace list from `/api/workspaces` on mount

---

### `components/workspace/workspace-nav.tsx`

- Client component (needs active state for current route)
- Sidebar nav items:
  - Dashboard (/{ws-slug})
  - Boards list (each board as nav item)
  - All Posts (/{ws-slug}/posts) — admin only
  - Roadmap (/{ws-slug}/roadmap) — admin link to admin view
  - Changelog (/{ws-slug}/changelog) — admin only
  - Notifications (/{ws-slug}/notifications)
  - Settings (/{ws-slug}/settings/general) — admin/owner only
- Board list items are collapsible
- "New Board" button at bottom of boards list (admin/owner only)

---

## Slug Rules

Handled in `lib/workspaces/workspace.ts` and enforced in API validation:

```
- 2 to 50 characters
- Lowercase letters, numbers, hyphens only
- Cannot start or end with a hyphen
- Must be unique platform-wide
- Cannot be a reserved slug
```

**Reserved slugs** (defined in `config/platform.ts`):

```ts
export const RESERVED_WORKSPACE_SLUGS = [
  "api", "admin", "orbit", "signin", "signup", "onboarding",
  "dashboard", "settings", "invite", "post-auth", "docs",
  "changelog", "roadmap", "public", "static", "assets",
  "www", "mail", "help", "support", "status",
]
```

---

## Auto-Slug Generation

```ts
import slugify from "slugify"

function generateSlug(name: string): string {
  return slugify(name, {
    lower: true,
    strict: true,   // removes special chars
    trim: true,
  })
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = generateSlug(base)
  let suffix = 0
  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`
    const exists = await db.query.workspaces.findFirst({
      where: eq(workspaces.slug, candidate),
    })
    if (!exists) return candidate
    suffix++
  }
}
```

---

## Background Jobs

### `SEND_WORKSPACE_DELETED_EMAIL`

**Trigger:** When a workspace is deleted (inside `deleteWorkspace()` after successful DB delete)

**Payload:**
```ts
{
  workspaceName: string
  ownerName: string
  memberEmails: string[]
}
```

**Handler:** `lib/worker/handlers/send-workspace-deleted-email.ts`
- Loops over `memberEmails`
- Sends one email per member via Nodemailer
- Subject: `"[IdeaRoads] {workspaceName} has been deleted"`
- Body: workspace name, owner name, note that all data has been removed

---

## User Flows

### Create First Workspace (new user)

```
1. User completes magic link / Google sign-in
2. post-auth: no workspace_members record found → redirect /onboarding
3. User types workspace name → slug auto-generates + shows preview
4. User submits form → POST /api/workspaces
5. Server: creates workspace, member record (owner), default board
6. Redirect to /{ws-slug}?welcome=1
7. Dashboard shows welcome banner (dismissed on click, stored in localStorage)
```

### Create Additional Workspace

```
1. User clicks workspace switcher → "Create workspace"
2. Redirected to /onboarding
3. Same form flow as above
4. On success: redirect to new /{ws-slug}?welcome=1
```

### Switch Workspace

```
1. User clicks workspace switcher in sidebar
2. Dropdown shows all workspaces they belong to
3. Clicks target workspace
4. Navigate to /{target-ws-slug}
5. Workspace layout loads with new workspace context
```

### Edit Workspace

```
1. Owner or Admin navigates to /{ws-slug}/settings/general
2. WorkspaceSettingsForm pre-filled with current data
3. User edits name or slug
4. Slug change: real-time availability check shows green/red indicator
5. Submit → PATCH /api/workspaces/[slug]
6. If slug changed: all URLs update — user is redirected to new /{new-slug}/settings/general
7. Toast: "Workspace updated"
```

### Delete Workspace

```
1. Owner navigates to /{ws-slug}/settings/general
2. Clicks "Delete Workspace" in Danger Zone
3. AlertDialog: "Type the workspace name to confirm"
4. User types name → DELETE button becomes enabled
5. Submit → DELETE /api/workspaces/[slug]
6. Server: hard deletes workspace + all data (CASCADE)
7. Server: enqueues SEND_WORKSPACE_DELETED_EMAIL job
8. Client: redirect to /post-auth
9. /post-auth: detects remaining workspaces → redirects to /{ws-slug} or /onboarding
10. All workspace members receive deletion email
```

---

## API Reference

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/workspaces` | Session | List all workspaces for current user |
| POST | `/api/workspaces` | Session | Create a new workspace |
| GET | `/api/workspaces/[slug]` | Member | Get workspace details |
| PATCH | `/api/workspaces/[slug]` | Admin+ | Update workspace name/slug/description/logo |
| DELETE | `/api/workspaces/[slug]` | Owner | Delete workspace + all data |
| GET | `/api/workspaces/check-slug` | Session | Check if slug is available (query param: `?slug=`) |

---

## Validation Rules

| Field | Rules |
|---|---|
| `name` | Required, 2–50 chars, any characters allowed |
| `slug` | Required, 2–50 chars, `[a-z0-9-]` only, no leading/trailing hyphens, not reserved, platform-unique |
| `description` | Optional, max 300 chars |
| `logoUrl` | Optional, must be a valid URL (logo upload is post-MVP — accept URL string for now) |

---

## Edge Cases

| Case | Handling |
|---|---|
| User visits `/{ws-slug}` of a workspace they are not a member of | Layout returns 403 — redirect to their own workspace or `/signin` |
| Slug collision on auto-generate | `uniqueSlug()` appends `-1`, `-2`, etc. until unique |
| User changes slug and then navigates back to old slug URL | Old slug 404s — no redirect. User must use new slug. |
| Owner tries to leave workspace | Not allowed — must transfer ownership first or delete the workspace |
| Last workspace deleted | post-auth detects no workspaces → redirect `/onboarding` |
| Two users create workspace with same name simultaneously | Slug uniqueness enforced at DB level with `UNIQUE` constraint — second insert fails, server returns 409, client shows "Slug taken, try another name" |
| Workspace name with special characters (e.g. "Acme & Co!") | Slugify strips special chars → `acme-co`. User can override slug manually |

---

## Acceptance Criteria

- [ ] New user is redirected to `/onboarding` after first sign-in
- [ ] Workspace is created with a unique slug derived from the name
- [ ] Default "Feature Requests" board is created with the workspace
- [ ] User is redirected to `/{ws-slug}?welcome=1` after workspace creation
- [ ] Welcome banner displays on first visit and dismisses on click
- [ ] Workspace switcher lists all workspaces the user belongs to
- [ ] Creating a second workspace works from the switcher
- [ ] Owner can edit workspace name, slug, description via settings
- [ ] Slug change redirects user to new URL after save
- [ ] Slug availability is checked in real time with debounce
- [ ] Reserved slugs are blocked (e.g. "api", "orbit", "admin")
- [ ] Owner can delete workspace after typing the workspace name to confirm
- [ ] Deletion hard-deletes all workspace data (verified via DB check)
- [ ] All members receive a deletion email after workspace is deleted
- [ ] Non-owner cannot access the delete button
- [ ] Visiting a workspace you're not a member of returns 403
- [ ] Workspace nav renders correct items based on member role

---

## Implementation Notes

- `pg_advisory_xact_lock(hashtext(workspaceId)::bigint)` inside `db.transaction()` for member mutations (prevents race conditions on concurrent role changes — added in Feature 03)
- Workspace deletion uses PostgreSQL `CASCADE` — no manual child deletion needed; child tables (`boards`, `posts`, `votes`, `workspace_members`, etc.) all have `ON DELETE CASCADE` FK to `workspaces.id`
- `updated_at` is not auto-updated by PostgreSQL triggers — service layer must manually set it on every `UPDATE`
- Logo upload is stubbed for MVP — `logoUrl` field accepts a URL string; S3/R2 upload to be added post-MVP
- Workspace context (workspace object + member role) is fetched once in the layout server component and passed down — do not re-fetch in every child page
- `RESERVED_WORKSPACE_SLUGS` lives in `config/platform.ts` — add new reserved words there as new routes are added
