# IdeaRoads — Documentation

This folder contains the complete technical specification for IdeaRoads. Everything needed to build, understand, and contribute to the project lives here.

---

## What is IdeaRoads?

IdeaRoads is an open-source, self-hostable user feedback and feature voting platform. Teams embed it to collect product feedback, let users vote on feature requests, track status on a public roadmap, and publish a changelog — all under their own domain.

**Inspired by:** Upvoty, Canny, Fider  
**License:** MIT  
**Deployment:** Docker Compose (self-hosted, no cloud vendor lock-in)  
**No paid services** — every dependency is free and open-source

---

## Tech Stack at a Glance

| Layer               | Choice                                         |
| ------------------- | ---------------------------------------------- |
| Framework           | Next.js 15 (App Router, TypeScript)            |
| UI                  | shadcn/ui + Tailwind CSS v3                    |
| Forms               | react-hook-form + zod                          |
| Client Data         | SWR                                            |
| Database            | PostgreSQL + Drizzle ORM                       |
| Auth                | Better Auth — Magic Link + Google OAuth        |
| Background Jobs     | pg-boss (same PostgreSQL DB, no Redis)         |
| Email Templates     | React Email (components → HTML, server-side)   |
| Email Delivery      | Nodemailer + SMTP (Mailtrap for dev)           |
| Encryption          | AES-256-GCM (webhook secrets, API keys)        |
| Linting + Formatting | Biome (replaces ESLint + Prettier)            |
| Deployment          | Docker Compose                                 |

---

## Roles

| Role           | Scope     | Description                                                                      |
| -------------- | --------- | -------------------------------------------------------------------------------- |
| **Guest**      | Public    | Not signed in — can view public boards, submit posts with email, vote with email |
| **Member**     | Workspace | Signed-in user with basic access — can post, vote, comment                       |
| **Admin**      | Workspace | Can manage boards, posts, members, moderation                                    |
| **Owner**      | Workspace | Full workspace control including billing-free deletion                           |
| **Superadmin** | Platform  | Access to Orbit admin panel — manages all workspaces and users                   |

---

## How to Read This Documentation

Start with **[MASTER.md](MASTER.md)** — it is the single source of truth for the entire project: full database schema, folder structure, all background jobs, environment variables, and the build order for features.

Then read the **feature files** in order. Each file is self-contained and covers:

- What the feature does and its core behaviour
- Database schema (tables, columns, constraints, indexes)
- Service layer (business logic functions)
- API routes (method, path, auth, validation, logic)
- UI components and pages
- All user flows end-to-end
- Edge cases and acceptance criteria

---

## Document Index

### Foundation

| File                   | Description                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------- |
| [MASTER.md](MASTER.md) | Complete project blueprint — DB schema, folder structure, jobs, env vars, build order |

---

### Features

| #   | File                                                                                | Feature                         | Key Concepts                                                                                      |
| --- | ----------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------- |
| 00  | [00-landing-page.md](features/00-landing-page.md)                                   | Landing Page                    | Marketing site, hero, feature grid, comparison table, quick-start, force-static SSR               |
| 01  | [01-authentication.md](features/01-authentication.md)                               | Authentication                  | Magic Link, Google OAuth, Better Auth, post-auth redirect, `requireSession` helpers               |
| 02  | [02-workspaces.md](features/02-workspaces.md)                                       | Workspaces                      | Workspace creation, slug uniqueness, reserved slugs, onboarding, workspace layout                 |
| 03  | [03-team-members.md](features/03-team-members.md)                                   | Team Members                    | Invites (email + link), role matrix, advisory locks, ownership transfer                           |
| 04  | [04-feedback-boards.md](features/04-feedback-boards.md)                             | Feedback Boards                 | Board CRUD, archive vs delete, `MAX_BOARDS_PER_WORKSPACE`, drag-to-reorder                        |
| 05  | [05-feedback-posts.md](features/05-feedback-posts.md)                               | Feedback Posts                  | Post lifecycle, slug + cuid2 URL, trending sort, merge, moderation modes                          |
| 06  | [06-voting.md](features/06-voting.md)                                               | Voting                          | Signed-in + guest voting, partial unique indexes, dedup on sign-in, optimistic UI                 |
| 07  | [07-comments.md](features/07-comments.md)                                           | Comments                        | Threaded (1 level), soft delete, author snapshot, `comment_count` counter                         |
| 08  | [08-categories-and-status.md](features/08-categories-and-status.md)                 | Categories & Status             | Category CRUD, 6 post statuses, `post_status_changes` audit trail, roadmap column mapping         |
| 09  | [09-public-roadmap.md](features/09-public-roadmap.md)                               | Public Roadmap                  | Derived from post statuses, 3-column board, `roadmap_public` toggle, private board exclusion      |
| 10  | [10-changelog.md](features/10-changelog.md)                                         | Changelog                       | Markdown entries, labels, draft/publish, RSS feed, voter notification with `notified_at` guard    |
| 11  | [11-notifications.md](features/11-notifications.md)                                 | Notifications                   | In-app bell + 7 notification types, pg-boss jobs, 30-second polling, email via Nodemailer         |
| 12  | [12-workspace-settings-moderation.md](features/12-workspace-settings-moderation.md) | Workspace Settings & Moderation | Settings layout, moderation modes, spam keywords, blocked users, audit log                        |
| 13  | [13-orbit-admin.md](features/13-orbit-admin.md)                                     | Orbit Admin                     | Super-admin panel at `/orbit`, workspace/user management, impersonation, feature flags, job queue |

---

## Feature Build Order

Features have dependencies — build them in this sequence:

```
Phase 1 — Foundation
  01  Authentication
  02  Workspaces
  03  Team Members

Phase 2 — Core Feedback Loop
  04  Feedback Boards
  05  Feedback Posts
  06  Voting
  07  Comments

Phase 3 — Organisation & Discovery
  08  Categories & Status
  09  Public Roadmap
  10  Changelog

Phase 4 — Platform Layer
  11  Notifications
  12  Workspace Settings & Moderation
  13  Orbit Admin

Phase 5 — Marketing
  00  Landing Page
```

---

## Key Design Decisions

### No Email/Password Auth

Better Auth with Magic Link only — users never manage passwords. Reduces security surface area and removes the need for forgot/reset password flows entirely.

### No Redis

pg-boss uses the same PostgreSQL instance for the background job queue. One less service to operate in production.

### No Paid Services

Everything is free and open-source: Better Auth (auth), Nodemailer (email), pg-boss (jobs), shadcn/ui (components), Drizzle ORM (database). Orbit Admin is custom-built — not a third-party paid service.

### Denormalised Counters

`vote_count` and `comment_count` on the `posts` table are maintained atomically inside `db.transaction()` with `GREATEST(count - 1, 0)` guards. Avoids expensive COUNT(\*) queries on every page load.

### Partial Unique Indexes on Votes

Drizzle ORM does not support partial unique indexes declaratively. The `votes` table requires raw SQL migrations:

- `UNIQUE (post_id, user_id) WHERE user_id IS NOT NULL`
- `UNIQUE (post_id, user_email) WHERE user_email IS NOT NULL`

### Soft Deletes on Comments Only

Comments are soft-deleted (body → `"[deleted]"`, author fields cleared). Posts and other entities are hard-deleted. This preserves thread structure when a parent comment is removed.

### Audit Log is Fire-and-Forget

`createAuditLog()` is never awaited — it runs as a best-effort background insert. Audit log failure never blocks the primary action.

### Orbit is Invisible

`/orbit` returns 404 (not 403) for non-superadmins. The panel does not reveal itself to users who lack access.

### Durable Email Outbox

Email is never sent synchronously. `enqueueEmail()` inserts a row into `email_outbox` first, then enqueues the pg-boss job. If the app crashes between these two lines, the nightly `CLEANUP_EMAIL_OUTBOX` cron re-queues any rows still stuck in `queued`. Zero email loss.

### Webhook Delivery is SSRF-Protected

Outbound webhook endpoints are validated on every delivery attempt (not cached). All RFC 1918, loopback, link-local, and IPv6 ULA addresses are blocked. Endpoints auto-disable at 50 consecutive failures with email notification to the workspace owner.

### API Keys are Hashed, Never Stored Raw

API key raw values are generated as `ir_live_{cuid2}`, shown to the user once, then discarded. Only the SHA-256 hash is stored in `api_keys.token_hash`. Lookup is O(1) via the unique index on the hash.

### Biome Replaces ESLint + Prettier

A single `biome.json` replaces two separate tool configs. Faster (Rust-based), enforced via pre-push git hook — commits blocked if lint fails.

### Idempotent Job Handlers

Every pg-boss handler reads current state first, checks if the action already completed (state guard), and returns early (no-op) if so. All handlers are safe to retry without side effects. See MASTER.md → Patterns & Conventions for the full pattern.

---

## Route Groups

```
app/
├── (marketing)/          Landing page — force-static, no auth
├── (auth)/               /signin, /signup, /post-auth
├── (public)/[ws-slug]/   Public workspace pages — boards, posts, roadmap, changelog
├── (workspace)/[ws-slug]/Admin workspace pages — settings, members, moderation
└── orbit/                Superadmin panel — /orbit/*
```

---

## URL Patterns

| Page                | URL                                                |
| ------------------- | -------------------------------------------------- |
| Landing             | `/`                                                |
| Sign In             | `/signin`                                          |
| Post-auth redirect  | `/post-auth`                                       |
| Onboarding          | `/onboarding`                                      |
| Public board        | `/{ws-slug}/b/{board-slug}`                        |
| Post detail         | `/{ws-slug}/b/{board-slug}/p/{postId}-{post-slug}` |
| Public roadmap      | `/{ws-slug}/roadmap`                               |
| Public changelog    | `/{ws-slug}/changelog`                             |
| Changelog RSS       | `/{ws-slug}/changelog/feed.xml`                    |
| Workspace dashboard | `/{ws-slug}`                                       |
| Settings            | `/{ws-slug}/settings/general`                      |
| Moderation          | `/{ws-slug}/settings/moderation`                   |
| Audit log           | `/{ws-slug}/settings/audit-log`                    |
| Orbit dashboard     | `/orbit`                                           |
| Orbit workspaces    | `/orbit/workspaces`                                |
| Orbit users         | `/orbit/users`                                     |
| Orbit feature flags | `/orbit/feature-flags`                             |
| Orbit job queue     | `/orbit/jobs`                                      |

---

## Database Tables Summary

| Table                 | Description                                       |
| --------------------- | ------------------------------------------------- |
| `user`                | Better Auth managed                               |
| `session`             | Better Auth managed                               |
| `account`             | Better Auth managed (OAuth providers)             |
| `verification`        | Better Auth managed (magic link tokens)           |
| `workspaces`          | Workspace records with moderation settings        |
| `workspace_members`   | User ↔ workspace with role                        |
| `workspace_invites`   | Email invites and shareable invite links          |
| `boards`              | Feedback boards (workspace-scoped)                |
| `categories`          | Post categories (workspace-scoped, with color)    |
| `posts`               | Feedback posts with denormalised counters         |
| `post_status_changes` | Append-only status change audit trail             |
| `votes`               | User and guest votes on posts                     |
| `comments`            | Threaded comments with soft delete                |
| `changelog_entries`   | Changelog entries (Markdown, draft/published)     |
| `changelog_posts`     | Junction table — changelog entry ↔ posts          |
| `notifications`       | In-app notifications for signed-in users          |
| `blocked_users`                   | Users blocked from a workspace                                        |
| `audit_logs`                      | Admin action history (workspace + platform level)                     |
| `email_outbox`                    | Durable email queue — written first, ensures zero email loss on crash |
| `outbound_webhook_endpoints`      | Customer-registered HTTPS endpoints for workspace events              |
| `outbound_webhook_deliveries`     | Per-attempt delivery log with status + response (30-day retention)    |
| `api_keys`                        | Workspace-scoped REST API keys (SHA-256 hashed, never stored raw)     |
| `superadmins`                     | Platform superadmin access list                                       |
| `feature_flags`                   | Platform-wide boolean feature toggles                                 |
| `platform_settings`               | Singleton operator config (signup, limits, maintenance mode)          |
| `plans`                           | Plan tiers — operator-editable from Orbit, controls workspace limits  |
| `workspace_plan_assignments`      | Per-workspace custom plan override set by superadmin                  |

---

## Background Jobs

| Job                            | Trigger             | Description                                              |
| ------------------------------ | ------------------- | -------------------------------------------------------- |
| `SEND_EMAIL`                   | `enqueueEmail()` called | Process `email_outbox` row → Nodemailer SMTP (queued→sending→sent) |
| `SEND_WORKSPACE_INVITE_EMAIL`  | Member invited          | Render React Email template + enqueue to `email_outbox`            |
| `SEND_MEMBER_REMOVED_EMAIL`    | Member removed          | Render + enqueue to `email_outbox`                                 |
| `SEND_WORKSPACE_DELETED_EMAIL` | Workspace deleted       | Render + enqueue to `email_outbox`                                 |
| `SEND_NEW_COMMENT_EMAIL`       | Comment created         | Notify post author                                                 |
| `SEND_COMMENT_REPLY_EMAIL`     | Reply created           | Notify parent comment author                                       |
| `SEND_STATUS_CHANGE_EMAIL`     | Post status changed     | Notify all voters (1 job per voter)                                |
| `SEND_CHANGELOG_EMAIL`         | Changelog published     | Notify voters of linked posts (`notified_at` guard)                |
| `DELIVER_OUTBOUND_WEBHOOK`     | Workspace event fired   | HMAC-sign + POST to endpoint (retry 5×, SSRF protection)          |
| `CLEANUP_EXPIRED_INVITES`      | Cron — 2 AM daily       | Delete expired `workspace_invites` rows                            |
| `CLEANUP_READ_NOTIFICATIONS`   | Cron — 3 AM daily       | Delete read notifications older than 90 days                       |
| `CLEANUP_EMAIL_OUTBOX`         | Cron — 4 AM daily       | Prune sent `email_outbox` rows older than 30 days                  |
