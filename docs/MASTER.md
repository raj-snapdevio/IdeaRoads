# IdeaRoads — Master Plan

> Open-source user feedback & feature voting platform.
> Self-hostable, zero paid dependencies, MIT licensed.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend + Backend | Next.js 15 (App Router, TypeScript) |
| UI Components | shadcn/ui (Radix primitives) |
| Styling | Tailwind CSS v3 |
| Forms | react-hook-form + zod (zodResolver) |
| Client Data Fetching | SWR |
| Date Utilities | date-fns |
| ID Generation | @paralleldrive/cuid2 |
| Database | PostgreSQL + Drizzle ORM |
| Background Jobs / Cron | pg-boss (same PostgreSQL DB, no Redis) |
| Email Templates | React Email (components → HTML) |
| Email Delivery | Nodemailer (configurable SMTP) |
| Dev Email Testing | Mailtrap free tier / Mailhog (local) |
| Auth | Better Auth (Magic Link + Google OAuth) |
| Encryption | AES-256-GCM (`lib/encrypt.ts`, for webhook secrets + API keys) |
| Linting + Formatting | Biome (replaces ESLint + Prettier, faster) |
| Super Admin Panel | Orbit Admin (custom built at `/orbit`) |
| Deployment | Docker Compose (self-hosted) |
| License | MIT |

### Key Dev Dependencies

| Package | Purpose |
|---|---|
| `drizzle-kit` | Migration generation CLI (`pnpm db:generate`) |
| `biome` | Linting + formatting (single tool, no config sprawl) |
| `embedded-postgres` | Local dev DB (no Docker required for solo dev) |
| `@react-email/components` | Email template primitives |
| `@react-email/render` | React Email → HTML string (server-side only) |

---

## Roles

### Platform Level

| Role | Description |
|---|---|
| **Super Admin** | Full access to Orbit Admin — manage all workspaces, users, feature flags, suspend/delete anything |

### Workspace Level

| Role | Description |
|---|---|
| **Owner** | Created the workspace. Full control — settings, delete workspace, transfer ownership |
| **Admin** | Manage boards, posts, members, categories, moderation. Cannot delete workspace |
| **Member** | Internal team — view all posts including private boards, cannot manage settings |

### Public Level

| Role | Description |
|---|---|
| **Authenticated User** | Signed-in via Magic Link or Google — submit posts, vote, comment |
| **Guest / Anonymous** | Not signed in — view public boards/roadmap/changelog, vote & comment with email |

---

## Authentication

- **Magic Link** — User enters email → receives one-time login link → clicks → signed in (no password)
- **Google OAuth** — One-click sign in / register via Google
- Powered entirely by **Better Auth** (open-source)
- Magic link email sent via Nodemailer SMTP
- No email+password, no paid auth service

---

## Features

### Feature 1 — Authentication

- Magic link sign in / register
- Google OAuth sign in / register
- Post-auth redirect: check workspace → redirect to `/{ws-slug}` or `/onboarding`
- Email verification (handled via magic link flow)
- Session management via Better Auth

**Pages:**
- `/signin` — Enter email for magic link or click Google
- `/signup` — Same as signin (Better Auth handles new vs existing)
- `/post-auth` — Server redirect logic after auth

---

### Feature 2 — Workspaces

- Create workspace (name + auto-generated slug)
- Each workspace is an isolated tenant (own boards, posts, members)
- Workspace switcher in sidebar
- Onboarding flow for first-time users (create first workspace)
- Edit workspace name / slug / description / logo
- Delete workspace (owner only, with name confirmation)
- Default board ("Feature Requests") created on workspace creation
- Workspace slug used in all routes: `/{ws-slug}/...`

**Pages:**
- `/onboarding` — Create first workspace
- `/{ws-slug}` — Workspace dashboard
- `/{ws-slug}/settings/general` — Edit / delete workspace

**DB Tables:** `workspaces`

---

### Feature 3 — Team Members

- Invite member by email (sends invite email via Nodemailer)
- Shareable invite link (no email needed, token-based)
- Roles: Owner, Admin, Member
- Role change by Owner or Admin
- Remove member (by Owner or Admin)
- Leave workspace (any member except Owner)
- Transfer ownership (Owner only)
- Invite expiry (7 days) + nightly cleanup cron via pg-boss
- Welcome banner on first join (`?welcome=1` query param)

**Pages:**
- `/{ws-slug}/settings/members` — Member table, invite, manage roles
- `/invite/[token]/page.tsx` — Email invite accept page
- `/invite/link/[linkToken]/page.tsx` — Shareable link accept page

**DB Tables:** `workspace_members`, `workspace_invites`

**Jobs:**
- `SEND_WORKSPACE_INVITE_EMAIL`
- `SEND_MEMBER_REMOVED_EMAIL`
- `SEND_WORKSPACE_DELETED_EMAIL`
- `CLEANUP_EXPIRED_INVITES` (nightly cron)

---

### Feature 4 — Feedback Boards

- Create board (name, slug, description, visibility)
- Board visibility: Public or Private (invite-only)
- Reorder boards (display_order)
- Archive board (hidden from public, data preserved)
- Delete board (only if archived OR it's not the last active board)
- Board-level settings page
- Max boards per workspace: configurable in `config/platform.ts` (default 10)

**Pages:**
- `/{ws-slug}` — Boards list (sidebar nav)
- `/{ws-slug}/b/[board-slug]` — Admin board view
- `/{ws-slug}/b/[board-slug]/settings` — Board settings
- `/(public)/[ws-slug]/b/[board-slug]` — Public board view

**DB Tables:** `boards`

---

### Feature 5 — Feedback Posts

- Submit post: title + description (plain text)
- Post URL: `/(public)/[ws-slug]/b/[board-slug]/p/[postId]-[slug]`
- Post list with sort: Trending / Newest / Top Voted
- Filter by: status, category, board
- Pin posts (pinned appear first)
- Admin toolbar: pin, change status, move to board, merge, delete
- Merge duplicate posts (votes merge into target post)
- Move post to different board
- Author can edit / delete own post
- Post status history log

**Pages:**
- `/(public)/[ws-slug]/b/[board-slug]/page.tsx` — Board post list
- `/(public)/[ws-slug]/b/[board-slug]/p/[postId]/page.tsx` — Post detail

**DB Tables:** `posts`, `post_status_changes`

**Jobs:**
- `SEND_NEW_POST_ALERT` (notify workspace admins)

---

### Feature 6 — Voting

- Upvote / remove vote (toggle)
- Logged-in users: vote by user ID
- Anonymous users: vote by email (guest voting with email prompt)
- Optimistic UI — instant vote count update, toast on failure
- Vote count shown on post card
- "My Votes" filter chip on board page (logged-in only)
- Admin view voter list (who voted on a post)
- One vote per user/email per post (idempotent)

**DB Tables:** `votes`

---

### Feature 7 — Comments

- Comment on any post (logged-in users)
- Guest comments with email
- Nested replies (1 level deep)
- Admin: delete any comment
- Author: delete own comment
- Comment count shown on post card
- Soft delete (body replaced with "[deleted]")
- Email notification to post author on new comment

**DB Tables:** `comments`

**Jobs:**
- `SEND_NEW_COMMENT_EMAIL`
- `SEND_COMMENT_REPLY_EMAIL`

---

### Feature 8 — Categories & Status

**Categories:**
- Admin creates custom categories per workspace (name, slug, color)
- Assign category to post on submit or via admin toolbar
- Filter board by category
- Category chip shown on post cards

**Status:**
- Statuses: `open | under_review | planned | in_progress | completed | closed`
- Admin changes status via dropdown (admin toolbar)
- Status badge shown on post card + detail page
- Status change history logged in `post_status_changes`
- Auto-notify all voters when status changes

**Pages:**
- `/{ws-slug}/settings/categories` — Manage categories

**DB Tables:** `categories`, `post_status_changes`

**Jobs:**
- `SEND_STATUS_CHANGE_EMAIL` (notify all voters of that post)

---

### Feature 9 — Public Roadmap

- Public page at `/(public)/[ws-slug]/roadmap`
- Posts grouped in 3 columns: **Planned | In Progress | Completed**
- No login required to view
- Each post card links to its detail page
- Vote button visible on roadmap cards
- Toggle roadmap public/private per workspace (setting)

**Pages:**
- `/(public)/[ws-slug]/roadmap/page.tsx`
- `/{ws-slug}/settings/general` — Roadmap visibility toggle

---

### Feature 10 — Changelog

- Admin creates changelog entries (title + markdown body + label + date)
- Labels: `New Feature | Improvement | Bug Fix | Security | Deprecation`
- Entry can be linked to one or more posts
- Publishing an entry auto-notifies voters of all linked posts
- Public changelog page: `/(public)/[ws-slug]/changelog`
- RSS feed: `/(public)/[ws-slug]/changelog/feed.xml`
- Unpublished drafts visible to admins only

**Pages:**
- `/{ws-slug}/changelog` — Admin changelog list
- `/{ws-slug}/changelog/new` — Create entry
- `/{ws-slug}/changelog/[id]/edit` — Edit entry
- `/(public)/[ws-slug]/changelog/page.tsx` — Public changelog
- `/(public)/[ws-slug]/changelog/feed.xml/route.ts` — RSS feed

**DB Tables:** `changelog_entries`, `changelog_posts`

**Jobs:**
- `SEND_CHANGELOG_EMAIL` (notify voters of linked posts)

---

### Feature 11 — Notifications

**Email Notifications (via Nodemailer SMTP + durable outbox):**
- New post submitted → workspace admins
- Status changed → post voters
- New comment on post → post author
- Reply to comment → parent commenter
- Invite sent → invitee
- Member removed → removed user
- Changelog published → voters of linked posts

**In-App Notifications:**
- Notification bell in navbar with unread count badge
- Notification types: `status_change | new_comment | reply | invite_accepted | new_post`
- Mark single / all as read
- Clicking notification navigates to relevant page

**Pages:**
- `/{ws-slug}/notifications` — Full notifications list

**DB Tables:** `notifications`, `email_outbox`

---

### Feature 12 — Workspace Settings & Moderation

**General Settings (`/{ws-slug}/settings/general`):**
- Edit workspace name, slug, description, logo
- Toggle roadmap public/private
- Toggle changelog public/private
- Delete workspace (owner only, name confirmation)

**Members Settings (`/{ws-slug}/settings/members`):**
- Member table with avatar, role, join date, search, role filter
- Invite by email / copy invite link
- Change member role (inline dropdown)
- Remove member (AlertDialog confirm)
- Revoke pending invite
- Transfer ownership (owner only)

**Moderation (`/{ws-slug}/settings/moderation`):**
- Post moderation mode: `off | auto | manual`
- Comment moderation: on/off
- Spam keywords list (block posts containing keywords)
- Block user from workspace (by user ID or email)
- Pending posts queue (approve / delete)
- Audit log — all admin actions

**Categories (`/{ws-slug}/settings/categories`):**
- Create / edit / delete categories
- Set category color

**Webhooks (`/{ws-slug}/settings/webhooks`):**
- Register HTTPS endpoint URLs to receive workspace events
- Select which events to subscribe to (post created, status changed, member joined, etc.)
- HMAC-SHA256 signed payloads (Stripe-style: `X-IdeaRoads-Signature: t=<unix>,v1=<hmac>`)
- Auto-disable after 50 consecutive delivery failures
- Delivery log (last 30 days): status, attempt count, HTTP response code

**API Keys (`/{ws-slug}/settings/api-keys`):**
- Generate named API keys for workspace-scoped REST API access
- Key shown once at creation (stored as SHA-256 hash only)
- Revoke keys
- Last-used timestamp shown in table

**Audit Log (`/{ws-slug}/settings/audit-log`):**
- Read-only trail of all admin actions in the workspace
- Filterable by action type, actor, date range
- Paginated (50 per page)

**DB Tables:** `blocked_users`, `audit_logs`, `outbound_webhook_endpoints`, `outbound_webhook_deliveries`, `api_keys`

---

### Feature 13 — Orbit Admin

> Platform super-admin panel at `/orbit`. Accessible only to users in the `superadmins` table. Returns 404 (not 403) for non-superadmins.

**Dashboard (`/orbit`):**
- Platform stats: total workspaces, users, posts, votes, comments, suspended workspaces
- Recent signups, recent workspaces

**Workspaces (`/orbit/workspaces`):**
- List all workspaces (search, filter active/suspended)
- View workspace details (owner, boards, categories, recent posts)
- Suspend / unsuspend workspace
- Delete workspace

**Users (`/orbit/users`):**
- List all users (search by email/name)
- View user details + their workspaces
- Grant / revoke superadmin
- Impersonate user (with `ENABLE_IMPERSONATION=true`, 15-min TTL, audit logged)

**Plans (`/orbit/plans`):**
- Create / edit / archive / duplicate plan tiers
- Set name, price, limits (boards, members, posts), feature access flags
- Assign custom plans to specific workspaces (operator override)

**Platform Settings (`/orbit/settings`):**
- Operator-tunable config: signup enabled/disabled, max workspaces per user, maintenance mode
- Stored in singleton `platform_settings` table, cached 60s

**Feature Flags (`/orbit/feature-flags`):**
- Toggle platform-wide boolean flags (guest voting, Google OAuth, changelog RSS, etc.)

**Job Queue (`/orbit/jobs`):**
- pg-boss queue status: active jobs, failed jobs (last 24h), error messages

**Audit Log (`/orbit/audit-log`):**
- Platform-level admin actions (impersonation, workspace suspension, superadmin grants)

**Pages:**
- `/orbit/page.tsx`
- `/orbit/workspaces/page.tsx`
- `/orbit/users/page.tsx`
- `/orbit/plans/page.tsx`
- `/orbit/settings/page.tsx`
- `/orbit/feature-flags/page.tsx`
- `/orbit/jobs/page.tsx`
- `/orbit/audit-log/page.tsx`

**DB Tables:** `superadmins`, `feature_flags`, `platform_settings`

**Env Vars:**
- `ORBIT_SEED_EMAIL` — first superadmin email, seeded at startup
- `ENABLE_IMPERSONATION` — default false, must be explicitly enabled

---

## Full Database Schema

```sql
-- Better Auth (managed by Better Auth internals)
user                id, name, email, email_verified, image, created_at, updated_at
session             id, user_id, token, expires_at, ip_address, user_agent, created_at
account             id, user_id, account_id, provider_id, access_token, password, created_at
verification        id, identifier, value, expires_at, created_at

-- Workspaces
workspaces          id, slug, name, description, logo_url, owner_id,
                    roadmap_public, changelog_public,
                    moderation_mode (off|auto|manual),
                    comment_moderation, spam_keywords[],
                    is_suspended, suspended_at, suspended_by,
                    created_at, updated_at

workspace_members   id, workspace_id, user_id,
                    role (owner|admin|member), joined_at
                    UNIQUE(workspace_id, user_id)

workspace_invites   id, workspace_id, invited_by, email, role,
                    token, is_invite_link, expires_at, accepted_at, created_at

-- Boards
boards              id, slug, name, description, workspace_id,
                    is_public, is_archived, display_order,
                    created_by, created_at, updated_at
                    UNIQUE(workspace_id, slug)

-- Categories
categories          id, slug, name, color, workspace_id, created_at, updated_at
                    UNIQUE(workspace_id, slug)
                    UNIQUE(workspace_id, name)

-- Posts
posts               id, slug, title, description, status (pgEnum),
                    vote_count, comment_count,
                    board_id, workspace_id,
                    author_id, author_email, author_name,
                    category_id, is_pinned, is_locked, is_approved,
                    merged_into_id, created_at, updated_at

post_status_changes id, post_id, from_status, to_status,
                    changed_by, note, created_at

-- Votes
votes               id, post_id, workspace_id,
                    user_id, user_email, user_name, created_at
                    -- Partial unique indexes (raw SQL migration):
                    -- UNIQUE (post_id, user_id) WHERE user_id IS NOT NULL
                    -- UNIQUE (post_id, user_email) WHERE user_email IS NOT NULL

-- Comments
comments            id, post_id, parent_id, body,
                    author_id, author_email, author_name, author_avatar,
                    is_deleted, is_approved, created_at, updated_at

-- Changelog
changelog_entries   id, workspace_id, title, body,
                    label (new_feature|improvement|bug_fix|security|deprecation),
                    is_published, published_at, notified_at,
                    created_by, created_at, updated_at

changelog_posts     changelog_entry_id, post_id   -- composite PK

-- Notifications
notifications       id, user_id, workspace_id, type, title, body,
                    link, is_read, created_at

-- Email
email_outbox        id, to_email, subject, html_body,
                    status (queued|sending|sent|failed),
                    attempts, last_error, created_at, updated_at
                    -- Durable queue: insert row first, then enqueue SEND_EMAIL job
                    -- Worker atomically transitions: queued → sending → sent|failed
                    -- Survives app crashes between enqueue and send

-- Moderation
blocked_users       id, workspace_id, user_id, user_email, user_name,
                    blocked_by, reason, created_at
                    -- UNIQUE(workspace_id, user_id) WHERE user_id IS NOT NULL
                    -- UNIQUE(workspace_id, user_email) WHERE user_email IS NOT NULL

audit_logs          id, workspace_id, actor_id, actor_name,
                    action, entity_type, entity_id, entity_name,
                    metadata (jsonb), created_at
                    -- workspace_id nullable for platform-level (Orbit) actions
                    -- Fire-and-forget: createAuditLog() is never awaited

-- Outbound Webhooks
outbound_webhook_endpoints   id, workspace_id, url, encrypted_secret,
                             events (text[]), is_enabled,
                             consecutive_failures, disabled_reason,
                             created_at, updated_at

outbound_webhook_deliveries  id, endpoint_id, event, payload (jsonb),
                             status (pending|delivered|failed),
                             attempts, response_status, last_error,
                             created_at

-- API Keys
api_keys            id, workspace_id, user_id, name,
                    token_hash,   -- SHA-256 of the raw key, never stored in plaintext
                    last_used_at, is_enabled, created_at

-- Orbit Admin
superadmins         id, user_id UNIQUE, created_at

feature_flags       id, key UNIQUE, is_enabled, description, created_at, updated_at

platform_settings   id (always 1, singleton),
                    signup_enabled, max_workspaces_per_user,
                    maintenance_mode, updated_at
```

---

## Folder Structure

```
idearoads/
├── app/
│   ├── layout.tsx
│   ├── globals.css
│   ├── page.tsx                                  Landing page
│   │
│   ├── (auth)/
│   │   ├── signin/page.tsx                       Magic link + Google
│   │   └── signup/page.tsx                       Same as signin
│   │
│   ├── onboarding/page.tsx                       Create first workspace
│   ├── post-auth/page.tsx                        Redirect after login
│   ├── invite/[token]/page.tsx                   Email invite accept
│   ├── invite/link/[linkToken]/page.tsx          Link invite accept
│   │
│   ├── (workspace)/
│   │   └── [ws-slug]/
│   │       ├── layout.tsx                        Workspace layout (sidebar)
│   │       ├── page.tsx                          Dashboard
│   │       ├── b/
│   │       │   └── [board-slug]/
│   │       │       ├── page.tsx                  Admin board view
│   │       │       └── settings/page.tsx
│   │       ├── posts/page.tsx                    All posts (admin)
│   │       ├── changelog/
│   │       │   ├── page.tsx
│   │       │   ├── new/page.tsx
│   │       │   └── [id]/edit/page.tsx
│   │       ├── notifications/page.tsx
│   │       └── settings/
│   │           ├── layout.tsx                    Settings sidebar nav
│   │           ├── general/page.tsx
│   │           ├── members/page.tsx
│   │           ├── categories/page.tsx
│   │           ├── moderation/page.tsx
│   │           ├── webhooks/page.tsx             Outbound webhooks
│   │           ├── api-keys/page.tsx             API key management
│   │           └── audit-log/page.tsx            Admin action history
│   │
│   ├── (public)/
│   │   └── [ws-slug]/
│   │       ├── b/
│   │       │   └── [board-slug]/
│   │       │       ├── page.tsx                  Public board
│   │       │       └── p/[postId]/page.tsx       Post detail + comments
│   │       ├── roadmap/page.tsx                  Public roadmap
│   │       └── changelog/
│   │           ├── page.tsx                      Public changelog
│   │           └── feed.xml/route.ts             RSS feed
│   │
│   ├── orbit/
│   │   ├── layout.tsx                            Orbit layout (superadmin check → 404)
│   │   ├── page.tsx                              Platform dashboard
│   │   ├── workspaces/
│   │   │   ├── page.tsx
│   │   │   └── [workspaceId]/page.tsx
│   │   ├── users/
│   │   │   ├── page.tsx
│   │   │   └── [userId]/page.tsx
│   │   ├── plans/page.tsx                        Plan catalog editor
│   │   ├── settings/page.tsx                     Platform settings
│   │   ├── feature-flags/page.tsx
│   │   ├── jobs/page.tsx                         pg-boss queue status
│   │   └── audit-log/page.tsx                    Platform-level audit log
│   │
│   └── api/
│       ├── auth/[...all]/route.ts
│       ├── workspaces/
│       │   ├── route.ts
│       │   └── [slug]/
│       │       ├── route.ts
│       │       ├── members/
│       │       │   ├── route.ts
│       │       │   ├── me/route.ts
│       │       │   └── [memberId]/route.ts
│       │       ├── invites/route.ts
│       │       ├── boards/route.ts
│       │       ├── categories/route.ts
│       │       ├── moderation/route.ts
│       │       ├── blocked-users/
│       │       │   ├── route.ts
│       │       │   └── [id]/route.ts
│       │       ├── webhooks/
│       │       │   ├── route.ts
│       │       │   └── [endpointId]/route.ts
│       │       ├── api-keys/
│       │       │   ├── route.ts
│       │       │   └── [keyId]/route.ts
│       │       ├── audit-log/route.ts
│       │       └── changelog/
│       │           ├── route.ts
│       │           └── [id]/route.ts
│       ├── boards/
│       │   └── [boardId]/
│       │       ├── route.ts
│       │       └── posts/route.ts
│       ├── posts/
│       │   └── [postId]/
│       │       ├── route.ts
│       │       ├── vote/route.ts
│       │       ├── approve/route.ts
│       │       ├── status/route.ts
│       │       ├── pin/route.ts
│       │       ├── merge/route.ts
│       │       ├── move/route.ts
│       │       └── comments/route.ts
│       ├── comments/
│       │   └── [commentId]/route.ts
│       ├── notifications/
│       │   ├── route.ts
│       │   └── count/route.ts
│       └── orbit/
│           ├── stats/route.ts
│           ├── workspaces/
│           │   ├── route.ts
│           │   └── [id]/
│           │       ├── route.ts
│           │       └── unsuspend/route.ts
│           ├── users/
│           │   ├── route.ts
│           │   └── [id]/
│           │       ├── route.ts
│           │       └── impersonate/route.ts
│           ├── end-impersonation/route.ts
│           ├── feature-flags/
│           │   ├── route.ts
│           │   └── [key]/route.ts
│           ├── plans/
│           │   ├── route.ts
│           │   └── [id]/route.ts
│           ├── settings/route.ts
│           └── jobs/route.ts
│
├── components/
│   ├── ui/                         button, input, label, card, badge,
│   │                               dialog, select, dropdown-menu,
│   │                               textarea, avatar, separator,
│   │                               sonner toaster, tabs, tooltip, switch, sheet
│   ├── providers.tsx               ThemeProvider + Toaster (sonner)
│   ├── impersonate-banner.tsx      Shown site-wide during impersonation sessions
│   ├── layout/
│   │   ├── navbar.tsx
│   │   ├── workspace-nav.tsx
│   │   └── workspace-switcher.tsx
│   ├── posts/
│   │   ├── post-card.tsx
│   │   ├── vote-button.tsx
│   │   ├── status-badge.tsx
│   │   ├── submit-post-modal.tsx
│   │   ├── admin-post-toolbar.tsx
│   │   ├── merge-post-modal.tsx
│   │   └── move-post-modal.tsx
│   ├── comments/
│   │   ├── comment-thread.tsx
│   │   └── comment-form.tsx
│   ├── boards/
│   │   ├── board-card.tsx
│   │   └── create-board-modal.tsx
│   ├── changelog/
│   │   ├── changelog-entry-card.tsx
│   │   └── changelog-form.tsx
│   ├── notifications/
│   │   └── notification-bell.tsx
│   ├── settings/
│   │   ├── settings-nav.tsx
│   │   ├── moderation-settings-form.tsx
│   │   ├── spam-keywords-editor.tsx
│   │   ├── blocked-users-table.tsx
│   │   ├── block-user-form.tsx
│   │   ├── pending-posts-section.tsx
│   │   ├── audit-log-table.tsx
│   │   ├── webhook-endpoints-table.tsx
│   │   ├── webhook-endpoint-form.tsx
│   │   └── api-keys-table.tsx
│   └── orbit/
│       ├── orbit-sidebar.tsx
│       ├── orbit-stat-card.tsx
│       ├── workspace-table.tsx
│       ├── user-table.tsx
│       ├── feature-flag-list.tsx
│       ├── plan-form-sheet.tsx
│       ├── job-queue-table.tsx
│       └── impersonate-banner.tsx
│
├── db/
│   ├── index.ts                  Drizzle client (pg pool singleton)
│   ├── migrations/               Auto-generated SQL (drizzle-kit — never hand-write)
│   └── schema/
│       ├── auth.ts               Better Auth tables
│       ├── workspaces.ts         workspaces, workspace_members, workspace_invites
│       ├── boards.ts
│       ├── posts.ts              posts, post_status_changes
│       ├── votes.ts
│       ├── comments.ts
│       ├── changelog.ts          changelog_entries, changelog_posts
│       ├── notifications.ts
│       ├── email-outbox.ts       email_outbox (durable email queue)
│       ├── moderation.ts         blocked_users, audit_logs
│       ├── webhooks.ts           outbound_webhook_endpoints, outbound_webhook_deliveries
│       ├── api-keys.ts           api_keys
│       ├── orbit.ts              superadmins, feature_flags, platform_settings
│       └── index.ts              Re-exports all tables
│
├── lib/
│   ├── auth.ts                   Better Auth server config
│   ├── auth-client.ts            Better Auth client
│   ├── env.ts                    Zod env validation — validates all process.env at startup
│   ├── encrypt.ts                AES-256-GCM encrypt/decrypt (webhook secrets, API key display)
│   ├── utils.ts                  cn(), slugify(), formatDate(), uniqueSlug()
│   ├── api/
│   │   └── auth-helpers.ts       requireSession, requireWorkspaceMember, requireRole
│   ├── email/
│   │   ├── index.ts              enqueueEmail() — inserts email_outbox row + enqueues SEND_EMAIL job
│   │   ├── renderer.ts           React Email component → HTML string (server-side only)
│   │   └── templates/            React Email components
│   │       ├── layout.tsx        Base email layout
│   │       ├── magic-link.tsx
│   │       ├── workspace-invite.tsx
│   │       ├── member-removed.tsx
│   │       ├── workspace-deleted.tsx
│   │       ├── new-comment.tsx
│   │       ├── comment-reply.tsx
│   │       ├── status-change.tsx
│   │       └── changelog-published.tsx
│   ├── workspaces/
│   │   ├── workspace.ts
│   │   ├── members.ts
│   │   └── invites.ts
│   ├── boards/
│   │   ├── queries.ts
│   │   ├── create.ts
│   │   ├── update.ts
│   │   └── delete.ts
│   ├── posts/
│   │   ├── queries.ts
│   │   ├── create.ts
│   │   ├── update.ts
│   │   ├── delete.ts
│   │   └── merge.ts
│   ├── voting/
│   │   ├── cast.ts
│   │   ├── remove.ts
│   │   └── list.ts
│   ├── comments/
│   │   ├── queries.ts
│   │   ├── create.ts
│   │   └── delete.ts
│   ├── changelog/
│   │   ├── queries.ts
│   │   ├── create.ts
│   │   └── publish.ts
│   ├── notifications/
│   │   ├── create.ts
│   │   └── queries.ts
│   ├── audit/
│   │   ├── log.ts                createAuditLog() — fire-and-forget, never awaited
│   │   └── queries.ts            listAuditLogs()
│   ├── moderation/
│   │   ├── block.ts              blockUser(), unblockUser(), isBlocked()
│   │   └── queries.ts
│   ├── webhooks/
│   │   ├── dispatch.ts           dispatchWebhookEvent() — fan-out to endpoints
│   │   ├── events.ts             WEBHOOK_EVENTS enum (post.created, status.changed, etc.)
│   │   ├── payloads.ts           Typed payload builders per event
│   │   └── queries.ts
│   ├── api-keys/
│   │   ├── create.ts             generateApiKey() — returns raw key once, stores hash
│   │   ├── validate.ts           validateApiKey() — hash lookup
│   │   └── queries.ts
│   ├── orbit/
│   │   ├── auth.ts               requireSuperadmin() helper (returns 404 not 403)
│   │   ├── stats.ts              getPlatformStats()
│   │   ├── workspaces.ts         listOrbitWorkspaces(), suspendWorkspace(), etc.
│   │   ├── users.ts              listOrbitUsers(), grantSuperadmin(), revokeSuperadmin()
│   │   ├── feature-flags.ts      listFeatureFlags(), toggleFlag(), isFeatureEnabled()
│   │   ├── plans.ts              Plan CRUD
│   │   ├── settings.ts           getPlatformSettings() — 60s cached singleton
│   │   └── jobs.ts               getJobQueueStatus()
│   └── worker/
│       ├── job-types.ts          JOB_NAMES enum (all job name constants)
│       ├── queue.ts              pg-boss singleton (getQueue())
│       ├── startup.ts            Register all handlers + crons, called from root layout
│       └── handlers/
│           ├── send-email.ts                     Process email_outbox row → SMTP
│           ├── send-workspace-invite-email.ts
│           ├── send-member-removed-email.ts
│           ├── send-workspace-deleted-email.ts
│           ├── send-new-post-alert.ts
│           ├── send-status-change-email.ts
│           ├── send-new-comment-email.ts
│           ├── send-comment-reply-email.ts
│           ├── send-changelog-email.ts
│           ├── deliver-outbound-webhook.ts       HMAC sign + HTTP POST + retry
│           ├── cleanup-expired-invites.ts        Cron — 2am daily
│           ├── cleanup-read-notifications.ts     Cron — 3am daily
│           └── cleanup-email-outbox.ts           Cron — 4am daily (prune sent rows >30d)
│
├── hooks/
│   ├── use-mutation.ts           Server action wrapper (loading state + optimistic updates)
│   └── use-toast.ts              Sonner toast wrapper
│
├── config/
│   └── platform.ts               MAX_BOARDS_PER_WORKSPACE, RESERVED_SLUGS,
│                                 DELETED_COMMENT_BODY, WEBHOOK_EVENTS, etc.
│
├── middleware.ts                  Protect /[ws-slug]/*, /orbit/* routes
├── docker-compose.yml             PostgreSQL + App
├── biome.json                     Linting + formatting config (replaces ESLint + Prettier)
├── .env.example
├── LICENSE                        MIT
└── README.md
```

---

## Background Jobs (pg-boss)

Every job **must** have an entry in `QUEUE_OPTIONS` in `lib/worker/startup.ts` with explicit config:

```ts
QUEUE_OPTIONS[JOB_NAMES.SEND_EMAIL] = {
  retryLimit: 3,
  expireInHours: 1,
  policy: undefined,       // on-demand, parallel
}

QUEUE_OPTIONS[JOB_NAMES.CLEANUP_EXPIRED_INVITES] = {
  retryLimit: 1,
  expireInHours: 6,
  policy: "exclusive",     // cron — only one worker at a time
}
```

| Job | Trigger | Handler | Queue Policy |
|---|---|---|---|
| `SEND_EMAIL` | `enqueueEmail()` called | Process `email_outbox` row → Nodemailer SMTP | on-demand, retry 3 |
| `SEND_WORKSPACE_INVITE_EMAIL` | Member invited | Render + enqueue to `email_outbox` | on-demand, retry 3 |
| `SEND_MEMBER_REMOVED_EMAIL` | Member removed | Render + enqueue to `email_outbox` | on-demand, retry 3 |
| `SEND_WORKSPACE_DELETED_EMAIL` | Workspace deleted | Render + enqueue to `email_outbox` | on-demand, retry 3 |
| `SEND_NEW_POST_ALERT` | Post submitted | Notify workspace admins | on-demand, retry 3 |
| `SEND_STATUS_CHANGE_EMAIL` | Post status changed | Notify all voters (1 job per voter) | on-demand, retry 3 |
| `SEND_NEW_COMMENT_EMAIL` | Comment added | Notify post author | on-demand, retry 3 |
| `SEND_COMMENT_REPLY_EMAIL` | Reply added | Notify parent commenter | on-demand, retry 3 |
| `SEND_CHANGELOG_EMAIL` | Entry published | Notify voters of linked posts | on-demand, retry 3 |
| `DELIVER_OUTBOUND_WEBHOOK` | Workspace event | HMAC-sign + POST to endpoint (5 attempts) | on-demand, retry 5 |
| `CLEANUP_EXPIRED_INVITES` | Cron — 2am daily | Delete expired `workspace_invites` rows | exclusive cron |
| `CLEANUP_READ_NOTIFICATIONS` | Cron — 3am daily | Delete read notifications >90 days old | exclusive cron |
| `CLEANUP_EMAIL_OUTBOX` | Cron — 4am daily | Prune sent `email_outbox` rows >30 days | exclusive cron |
| `CLEANUP_WEBHOOK_DELIVERIES` | Cron — 4am daily | Prune `outbound_webhook_deliveries` rows >30 days | exclusive cron |

---

## Outbound Webhook Events

Events dispatched to customer-registered endpoints:

| Event | Trigger |
|---|---|
| `post.created` | New post submitted (and approved) |
| `post.status_changed` | Post status updated |
| `post.merged` | Post merged into another |
| `post.deleted` | Post deleted |
| `comment.created` | New comment added |
| `vote.cast` | Vote cast on a post |
| `member.joined` | New member joined workspace |
| `member.removed` | Member removed from workspace |
| `changelog.published` | Changelog entry published |

**Delivery:** HMAC-SHA256 signed payload, header `X-IdeaRoads-Signature: t=<unix>,v1=<hmac>`. Auto-disabled at 50 consecutive failures. 30-day delivery log retention.

**SSRF Protection:** All endpoint URLs validated on every delivery — RFC 1918, loopback, link-local, and IPv6 ULA ranges blocked.

---

## Patterns & Conventions

### Durable Email Outbox

Never send email directly from service functions. Always:
1. `enqueueEmail({ to, subject, html })` → inserts `email_outbox` row (status=queued) + enqueues `SEND_EMAIL` job
2. Worker processes the job: atomically `queued → sending → sent` (or `failed` with error)
3. If app crashes between insert and send, the row survives. `CLEANUP_EMAIL_OUTBOX` cron re-queues any stuck rows.

```ts
// Correct — durable
await enqueueEmail({ to: user.email, subject: "...", html: renderedHtml })

// Wrong — not durable, no retry, no audit trail
await transporter.sendMail({ to: user.email, ... })
```

### Idempotent Job Handlers

Every handler is safe to retry. Pattern:
1. Read current entity state
2. Check if action already completed (state guard) — if yes, return early (no-op)
3. Acquire advisory lock if mutating shared state (member counts, etc.)
4. Perform mutation inside `db.transaction()`
5. Call `createAuditLog()` (fire-and-forget, not awaited)

```ts
// In every handler:
const post = await db.query.posts.findFirst({ where: eq(posts.id, postId) })
if (!post || post.status === targetStatus) return  // already done, skip

await db.transaction(async (tx) => {
  await tx.update(posts).set({ status: targetStatus }).where(eq(posts.id, postId))
  await tx.insert(postStatusChanges).values({ ... })
})
createAuditLog({ action: "post.status_changed", ... })  // not awaited
```

### Advisory Locks

Use `pg_advisory_xact_lock(hashtext(id)::bigint)` inside `db.transaction()` for any mutation that must be serialized per-entity:
- Workspace member mutations (add/remove/role-change)
- Vote counter increments/decrements
- Subscription state transitions

```ts
await db.transaction(async (tx) => {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${workspaceId})::bigint)`)
  // safe to mutate workspace_members now
})
```

### Audit Log — Fire and Forget

`createAuditLog()` is **never awaited**. It is a best-effort background insert. Audit log failure never blocks or rolls back the primary action.

```ts
await updatePostStatus(...)     // must succeed
createAuditLog({ ... })         // not awaited — best-effort
```

### Zod Environment Validation

All `process.env` accesses go through `lib/env.ts`. Validated at startup with Zod — app fails fast on missing/malformed vars, never silently uses `undefined`.

```ts
// lib/env.ts
import { z } from "zod"

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  SMTP_HOST: z.string(),
  // ...
})

export const env = envSchema.parse(process.env)
```

### Import Alias

Always use `@/` alias — never relative paths. Configured in `tsconfig.json`:

```ts
// Correct
import { db } from "@/db"
import { requireSession } from "@/lib/api/auth-helpers"

// Wrong
import { db } from "../../db"
```

### `use-mutation` Hook

All client-side calls to Server Actions go through `hooks/use-mutation.ts`:

```ts
const { mutate, isPending, error } = useMutation(createPostAction)

// Handles:
// - loading state (isPending)
// - error state (error)
// - optimistic updates (optional)
// - sonner toast on success/failure
```

### React Email Templates

All email HTML is generated from React Email components (server-side only). Never build HTML strings manually.

```ts
// lib/email/renderer.ts
import { render } from "@react-email/render"
import { WorkspaceInviteEmail } from "@/lib/email/templates/workspace-invite"

const html = await render(<WorkspaceInviteEmail inviteUrl={url} workspaceName={name} />)
await enqueueEmail({ to: email, subject: "You've been invited", html })
```

### Biome (Linting + Formatting)

Biome replaces both ESLint and Prettier. Single config file, single command:

```
pnpm lint        → biome check .
pnpm lint:fix    → biome check --write .
pnpm format      → biome format --write .
```

Pre-push git hook runs `biome check` — commits blocked if lint fails.

### Feature Flag Checks

```ts
import { isFeatureEnabled } from "@/lib/orbit/feature-flags"

const guestVotingEnabled = await isFeatureEnabled("guest_voting")
// Cached 60 seconds. Returns true if flag not found (opt-out model).
```

---

## Feature Build Order

| # | Feature | Depends On |
|---|---|---|
| 1 | Authentication (Magic Link + Google) | — |
| 2 | Workspaces | Auth |
| 3 | Team Members | Workspaces |
| 4 | Feedback Boards | Workspaces |
| 5 | Feedback Posts | Boards |
| 6 | Voting | Posts |
| 7 | Comments | Posts |
| 8 | Categories & Status | Posts, Boards |
| 9 | Public Roadmap | Posts, Status |
| 10 | Changelog | Posts, Workspaces |
| 11 | Notifications | Posts, Comments, Status, Changelog |
| 12 | Workspace Settings & Moderation | Workspaces, Members |
| 13 | Orbit Admin | All |
| 00 | Landing Page | — (build last) |

---

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://idearoads:idearoads@localhost:5432/idearoads"

# Better Auth
BETTER_AUTH_SECRET="generate with: openssl rand -base64 32"
BETTER_AUTH_URL="http://localhost:3000"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="IdeaRoads"

# Google OAuth (optional — leave blank to disable)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# SMTP — works with any SMTP server (Mailtrap for dev, any for prod)
SMTP_HOST="smtp.mailtrap.io"
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
EMAIL_FROM="IdeaRoads <noreply@yourdomain.com>"

# Orbit Admin
ORBIT_SEED_EMAIL=""            # First superadmin email — seeded at startup if set
ENABLE_IMPERSONATION="false"   # Set to "true" to allow superadmin user impersonation

# Encryption — for webhook secrets and API key display tokens
ENCRYPTION_KEY=""              # generate with: openssl rand -hex 32 (AES-256 key)
```

---

*This file is the single source of truth for the IdeaRoads MVP. Update it as decisions change.*
