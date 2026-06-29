# IdeaRoads

IdeaRoads is an open-source, self-hostable user feedback and feature voting platform. Teams use it to collect product feedback, let users vote on feature requests, track work on a public roadmap, and publish a changelog — all under their own domain.

Inspired by Canny and Fider. MIT licensed. No paid services or cloud vendor lock-in.

---

## Tech Stack

| Layer           | Choice                                    |
| --------------- | ----------------------------------------- |
| Framework       | Next.js 16 (App Router, TypeScript)       |
| UI              | shadcn/ui + Tailwind CSS v4               |
| Database        | PostgreSQL + Drizzle ORM                  |
| Auth            | Better Auth — Magic Link + Google OAuth   |
| Background Jobs | pg-boss (same PostgreSQL DB, no Redis)    |
| Email           | Nodemailer + SMTP + React Email templates |
| Linting         | Biome (replaces ESLint + Prettier)        |
| Deployment      | Docker Compose                            |

---

## Quick Start

```bash
pnpm install
cp .env.example .env
pnpm db:local       # spin up embedded PostgreSQL (dev only)
pnpm db:migrate
pnpm dev            # starts Next.js + background worker concurrently
```

Open `http://localhost:3000` and sign in with a magic link.

To promote yourself to superadmin:

```bash
pnpm make:admin you@example.com
```

Without `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASS` set, the worker logs emails to stdout instead of sending them.

---

## What's Implemented

### Authentication

- Magic link sign-in (no passwords)
- Google OAuth
- Secure cookie sessions with IP and User-Agent tracking
- Post-auth redirect: users go to their workspace (`/{slug}`), admins go to `/orbit`

### Account Settings (`/account/profile`)

- Edit name and email
- View and revoke active sessions
- Export account data as JSON
- Delete account

### Orbit Admin (`/orbit/*`)

Superadmin-only panel — returns 404 for everyone else.

- **Overview** — user count, email queue size, job queue summary
- **Users** — table of all users with inline role promotion and ban/unban
- **Email** — outbox status (queued → sending → sent/failed) and inbound SMTP webhook events (bounces, deliveries, opens, clicks)
- **Queues** — pg-boss job states grouped by queue name

### Background Worker

Runs as a separate process alongside Next.js. Uses pg-boss (no Redis required).

| Job                    | Trigger                 | Description                                     |
| ---------------------- | ----------------------- | ----------------------------------------------- |
| `email.send`           | `enqueueEmail()` called | Process `email_outbox` row → Nodemailer SMTP    |
| `email.outbox-reap`    | Cron every 15 min       | Re-queue emails stuck in `queued` state         |
| `email.events-prune`   | Cron 3 AM daily         | Delete email events older than retention period |
| `scaffold.healthcheck` | Cron every 10 min       | System health check                             |

### Durable Email Outbox

Email is never sent inline. `enqueueEmail()` writes to `email_outbox` first, then enqueues the pg-boss job. If the app crashes between those two steps, the reap cron re-queues any stuck rows. Zero email loss.

### Audit Logging

Fire-and-forget audit trail on user creation, magic link send, logout, data export, and account deletion. Never blocks the primary action.

---

## What's Documented but Not Yet Built

The full product specification lives in [`/docs`](./docs). Features are documented in build order:

| #   | Feature                         |
| --- | ------------------------------- |
| 02  | Workspaces                      |
| 03  | Team Members & Invites          |
| 04  | Feedback Boards                 |
| 05  | Feedback Posts                  |
| 06  | Voting                          |
| 07  | Comments                        |
| 08  | Categories & Status             |
| 09  | Public Roadmap                  |
| 10  | Changelog                       |
| 11  | Notifications                   |
| 12  | Workspace Settings & Moderation |

Start with [`docs/MASTER.md`](./docs/MASTER.md) — it is the single source of truth: full database schema, folder structure, all background jobs, environment variables, and the build order.

---

## Project Structure

```
app/
├── page.tsx                     Landing / sign-in prompt
├── (auth)/login/                Magic link + Google OAuth sign-in
├── post-auth/                   Role-based redirect after sign-in
├── account/                     Account settings (profile, sessions, export)
├── (orbit)/orbit/               Admin panel (workspaces, users, feature flags, settings)
└── api/                         Auth handler, account export, email webhook

lib/
├── auth.ts                      Better Auth config (magic link, Google, admin plugin)
├── authz.ts                     requireSession / requireAdmin helpers
├── audit.ts                     Fire-and-forget audit logging
├── email/                       enqueueEmail(), React Email templates, renderer
└── worker/                      pg-boss init, job handlers, cron schedules

db/
├── schema/                      Drizzle table definitions
└── migrations/                  Auto-generated SQL (drizzle-kit)

scripts/
├── worker.ts                    Worker entry point
├── make-admin.ts                Promote user to superadmin by email
└── dev-db.ts                    Embedded PostgreSQL for local development

docs/
├── MASTER.md                    Complete project blueprint
└── features/                    Per-feature specifications (00–13)
```

---

## Commands

| Command            | Description                              |
| ------------------ | ---------------------------------------- |
| `pnpm dev`         | Start Next.js + worker in watch mode     |
| `pnpm dev:next`    | Start Next.js only                       |
| `pnpm worker`      | Start worker only (watch mode)           |
| `pnpm build`       | Production build                         |
| `pnpm typecheck`   | Run TypeScript type checker              |
| `pnpm lint`        | Lint with Biome                          |
| `pnpm lint:fix`    | Lint and auto-fix                        |
| `pnpm db:local`    | Start embedded PostgreSQL (dev)          |
| `pnpm db:migrate`  | Run pending migrations                   |
| `pnpm db:generate` | Generate migration files from schema     |
| `pnpm db:push`     | Push schema directly (no migration file) |
| `pnpm db:reset`    | Drop all tables and re-migrate           |
| `pnpm make:admin`  | Promote user to superadmin               |

See [`docs/MASTER.md`](./docs/MASTER.md) for the full environment variable reference.
