# IdeaRoads — Tech Stack & Configuration

> **Implementation reference — not product specification.**
> This file documents *how* IdeaRoads is built. For *what* the product does, see the product docs (`README.md`, `MASTER.md`, `PLATFORM.md`, and `features/`).

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

## Authentication (implementation)

- **Magic Link** — email a one-time login link via Nodemailer SMTP.
- **Google OAuth** — one-click sign in / register.
- Powered entirely by **Better Auth** (open-source). No email+password, no paid auth service.

---

## Key Design Decisions

### No Email/Password Auth
Better Auth with Magic Link only — users never manage passwords. Reduces security surface area and removes forgot/reset password flows entirely.

### No Redis
pg-boss uses the same PostgreSQL instance for the background job queue. One less service to operate in production.

### No Paid Services
Everything is free and open-source: Better Auth (auth), Nodemailer (email), pg-boss (jobs), shadcn/ui (components), Drizzle ORM (database). Orbit Admin is custom-built — not a third-party paid service.

### Denormalised Counters
`vote_count` and `comment_count` on the `posts` table are maintained atomically inside `db.transaction()` with `GREATEST(count - 1, 0)` guards. Avoids expensive COUNT(*) queries on every page load.

### Partial Unique Indexes on Votes
Drizzle ORM does not support partial unique indexes declaratively. The `votes` table requires raw SQL migrations:
- `UNIQUE (post_id, user_id) WHERE user_id IS NOT NULL`
- `UNIQUE (post_id, user_email) WHERE user_email IS NOT NULL`

### Soft Deletes on Comments Only
Comments are soft-deleted (body → `"[deleted]"`, author fields cleared). Posts and other entities are hard-deleted. This preserves thread structure when a parent comment is removed.

### Audit Log is Fire-and-Forget
`createAuditLog()` is never awaited — it runs as a best-effort background insert. Audit log failure never blocks the primary action.

### Orbit is Invisible
`/orbit` returns 404 (not 403) for non-Orbit-Admins. The panel does not reveal itself to users who lack access.

### Durable Email Outbox
Email is never sent synchronously. `enqueueEmail()` inserts a row into `email_outbox` first, then enqueues the pg-boss job. If the app crashes between these two lines, the nightly `CLEANUP_EMAIL_OUTBOX` cron re-queues any rows still stuck in `queued`. Zero email loss.

### Webhook Delivery is SSRF-Protected
Outbound webhook endpoints are validated on every delivery attempt (not cached). All RFC 1918, loopback, link-local, and IPv6 ULA addresses are blocked. Endpoints auto-disable at 50 consecutive failures with email notification to the Brand Admin.

### API Keys are Hashed, Never Stored Raw
API key raw values are generated as `ir_live_{cuid2}`, shown to the user once, then discarded. Only the SHA-256 hash is stored in `api_keys.token_hash`. Lookup is O(1) via the unique index on the hash.

### Biome Replaces ESLint + Prettier
A single `biome.json` replaces two separate tool configs. Faster (Rust-based), enforced via pre-push git hook — commits blocked if lint fails.

### Idempotent Job Handlers
Every pg-boss handler reads current state first, checks if the action already completed (state guard), and returns early (no-op) if so. All handlers are safe to retry without side effects.

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
ORBIT_SEED_EMAIL=""            # First Orbit Admin email — seeded at startup if set
ENABLE_IMPERSONATION="false"   # Set to "true" to allow Orbit Admin user impersonation

# Encryption — for webhook secrets and API key display tokens
ENCRYPTION_KEY=""              # generate with: openssl rand -hex 32 (AES-256 key)
```
