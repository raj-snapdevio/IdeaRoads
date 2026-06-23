# Feature 01 — Authentication

## Overview

IdeaRoads uses **Better Auth** for all authentication. No passwords are stored. Users sign in via a **Magic Link** (email-based, one-time link) or **Google OAuth**. Better Auth manages sessions, tokens, and account linking internally.

---

## Auth Methods

| Method | Flow |
|---|---|
| **Magic Link** | User enters email → Better Auth sends a one-time link via Nodemailer SMTP → User clicks link → Signed in / account auto-created |
| **Google OAuth** | User clicks "Continue with Google" → Google consent screen → Callback → Signed in / account auto-created |

- No email + password
- No forgot password / reset password flow (not needed with magic link)
- New users are auto-registered on first sign-in (no separate signup step)
- Both methods live on the same `/signin` page

---

## Dependencies

```
better-auth        — core auth library (server + client)
nodemailer         — SMTP email sending for magic links
@types/nodemailer  — TypeScript types
```

---

## Environment Variables

```env
# Better Auth
BETTER_AUTH_SECRET="generate: openssl rand -base64 32"
BETTER_AUTH_URL="http://localhost:3000"

# Google OAuth (leave blank to disable Google login)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# SMTP — used to send magic link emails
SMTP_HOST="smtp.mailtrap.io"
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
EMAIL_FROM="IdeaRoads <noreply@yourdomain.com>"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="IdeaRoads"
```

---

## Database Schema

Better Auth manages its own tables. These are created via `auth.api` or Drizzle push. Do **not** manually edit these tables.

### `user`
```ts
id            text        PK
name          text        NOT NULL
email         text        NOT NULL UNIQUE
emailVerified boolean     NOT NULL
image         text
createdAt     timestamp   NOT NULL
updatedAt     timestamp   NOT NULL
```

### `session`
```ts
id            text        PK
userId        text        NOT NULL  → user.id (CASCADE DELETE)
token         text        NOT NULL UNIQUE
expiresAt     timestamp   NOT NULL
ipAddress     text
userAgent     text
createdAt     timestamp   NOT NULL
updatedAt     timestamp   NOT NULL
```

### `account`
```ts
id                      text        PK
userId                  text        NOT NULL  → user.id (CASCADE DELETE)
accountId               text        NOT NULL
providerId              text        NOT NULL  (e.g. "google", "magic-link")
accessToken             text
refreshToken            text
idToken                 text
accessTokenExpiresAt    timestamp
refreshTokenExpiresAt   timestamp
scope                   text
password                text        (null — not used)
createdAt               timestamp   NOT NULL
updatedAt               timestamp   NOT NULL
```

### `verification`
```ts
id          text        PK
identifier  text        NOT NULL    (email address)
value       text        NOT NULL    (one-time token)
expiresAt   timestamp   NOT NULL
createdAt   timestamp
updatedAt   timestamp
```

> **Note:** `verification` table stores magic link tokens. Better Auth handles expiry and cleanup automatically.

---

## File Structure

```
lib/
├── auth.ts               Better Auth server instance
├── auth-client.ts        Better Auth browser client
└── email.ts              Nodemailer transporter

db/schema/
└── auth.ts               Drizzle schema for Better Auth tables

app/
├── (auth)/
│   ├── signin/
│   │   └── page.tsx      Sign in page (Magic Link + Google)
│   └── signup/
│       └── page.tsx      Redirects to /signin (no separate signup)
├── post-auth/
│   └── page.tsx          Post-login redirect logic
└── api/
    └── auth/
        └── [...all]/
            └── route.ts  Better Auth API handler (catches all /api/auth/* requests)

components/
└── auth/
    ├── magic-link-form.tsx     Email input + send magic link button
    └── google-signin-button.tsx  Google OAuth button

middleware.ts              Route protection
```

---

## Implementation Details

### `lib/auth.ts` — Server Config

```ts
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { magicLink } from "better-auth/plugins"
import { db } from "@/db"
import * as schema from "@/db/schema"
import { sendMagicLinkEmail } from "@/lib/email"

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLinkEmail({ to: email, url })
      },
    }),
  ],
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,       // 30 days
    updateAge: 60 * 60 * 24,             // refresh if older than 1 day
  },
  user: {
    additionalFields: {},
  },
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
```

---

### `lib/auth-client.ts` — Browser Client

```ts
import { createAuthClient } from "better-auth/react"
import { magicLinkClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [magicLinkClient()],
})

export const {
  signIn,
  signOut,
  useSession,
} = authClient
```

---

### `lib/email.ts` — Nodemailer SMTP

```ts
import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendMagicLinkEmail({
  to,
  url,
}: {
  to: string
  url: string
}) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `Your sign-in link for ${process.env.NEXT_PUBLIC_APP_NAME}`,
    html: `
      <p>Click the link below to sign in. This link expires in 10 minutes.</p>
      <a href="${url}" style="...">Sign in to ${process.env.NEXT_PUBLIC_APP_NAME}</a>
      <p>If you did not request this, you can safely ignore this email.</p>
    `,
    text: `Sign in to ${process.env.NEXT_PUBLIC_APP_NAME}: ${url}`,
  })
}
```

---

### `app/api/auth/[...all]/route.ts`

```ts
import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"

export const { GET, POST } = toNextJsHandler(auth)
```

---

### `app/(auth)/signin/page.tsx`

- Single page for both sign in and sign up (Better Auth auto-creates accounts)
- Contains:
  - `MagicLinkForm` — email input field + "Send Magic Link" button
  - `GoogleSignInButton` — only rendered if `GOOGLE_CLIENT_ID` is set
  - Divider between the two methods
- On magic link submit: show success state "Check your email"
- Redirect after success goes to `/post-auth`

---

### `app/(auth)/signup/page.tsx`

- Simply redirects to `/signin`
- Reason: Better Auth auto-creates a new account on first magic link / OAuth sign-in so there is no separate registration form needed

---

### `app/post-auth/page.tsx` — Redirect Logic

Server component. Runs after successful sign-in.

```
Logic:
1. Get session (auth.api.getSession)
2. If no session → redirect /signin
3. Check if user is a superadmin → redirect /orbit
4. Check if user has any workspace_members record
   → Yes: redirect to their first workspace /{ws-slug}
   → No:  redirect to /onboarding (create first workspace)
```

---

### `components/auth/magic-link-form.tsx`

- Client component (`"use client"`)
- State: `email`, `loading`, `sent`
- On submit: calls `authClient.signIn.magicLink({ email, callbackURL: "/post-auth" })`
- On success: show "Check your inbox" message with the email displayed
- On error: show toast with error message
- Validates email format before submit

---

### `components/auth/google-signin-button.tsx`

- Client component
- Calls `authClient.signIn.social({ provider: "google", callbackURL: "/post-auth" })`
- Only rendered when `NEXT_PUBLIC_GOOGLE_ENABLED=true` (set based on env vars)
- Shows Google logo + "Continue with Google" text

---

## Middleware — Route Protection

**File:** `middleware.ts`

```
Protected route groups:
  /(workspace)/*  → must be signed in
  /onboarding     → must be signed in
  /orbit/*        → must be signed in + must be superadmin (checked in orbit layout)
  /post-auth      → must be signed in

Public routes (no auth required):
  /signin
  /signup
  /(public)/*     (public boards, roadmap, changelog)
  /api/auth/*     (Better Auth endpoints)
  /invite/*       (invite accept pages — handle auth internally)
```

Implementation uses `betterFetch` to call `/api/auth/get-session` from middleware, checking the cookie header.

---

## User Flows

### Magic Link Sign In (new user)
```
1. User visits /signin
2. Enters email → clicks "Send Magic Link"
3. MagicLinkForm shows "Check your inbox" state
4. Better Auth creates a verification token → calls sendMagicLinkEmail()
5. Nodemailer sends email via SMTP with the token URL
6. User clicks link in email
7. Better Auth validates token → creates user + session
8. Redirects to /post-auth
9. post-auth: no workspace found → redirect /onboarding
```

### Magic Link Sign In (returning user)
```
1–7. Same as above
8.  post-auth: workspace found → redirect /{ws-slug}
```

### Google OAuth Sign In
```
1. User visits /signin
2. Clicks "Continue with Google"
3. Redirected to Google consent screen
4. Google redirects back to /api/auth/callback/google
5. Better Auth exchanges code → creates/links account + session
6. Redirects to /post-auth
7. post-auth logic runs (same as magic link)
```

### Sign Out
```
1. User clicks "Sign out" in workspace switcher / navbar dropdown
2. Calls authClient.signOut()
3. Better Auth deletes session
4. Redirects to /signin
```

---

## Session Access Patterns

### In Server Components / Route Handlers
```ts
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

const session = await auth.api.getSession({ headers: await headers() })
if (!session) redirect("/signin")
```

### In API Routes
```ts
import { auth } from "@/lib/auth"

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
}
```

### In Client Components
```ts
import { useSession } from "@/lib/auth-client"

const { data: session, isPending } = useSession()
```

---

## Auth Helper — `lib/api/auth-helpers.ts`

Reusable helpers used across all API routes.

```ts
requireSession(request)
  → Returns session or throws 401 Response

requireWorkspaceMember(request, workspaceSlug)
  → Returns { session, member, workspace } or throws 401 / 403 / 404

requireRole(member, roles: Role[])
  → Throws 403 if member role not in allowed roles
```

---

## Error States

| Scenario | Handling |
|---|---|
| Invalid / expired magic link | Better Auth returns error → show "Link expired" page |
| Google OAuth cancelled | Redirect back to /signin with `?error=cancelled` |
| SMTP send failure | Log error server-side, return 500 to client, show toast |
| Session expired | Middleware catches → redirect /signin |
| User tries to access protected route without session | Middleware redirects to /signin |

---

## Google OAuth Setup (for developers)

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `{APP_URL}/api/auth/callback/google`
6. Copy Client ID and Client Secret to `.env`

Leave `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` blank to disable Google sign-in — the button will not render.

---

## Security Notes

- Magic link tokens are single-use and expire in **10 minutes**
- Sessions expire in **30 days** and are refreshed every 24 hours
- All auth routes go through `api/auth/[...all]` — never expose raw tokens to the client
- `BETTER_AUTH_SECRET` must be a strong random value — never commit to git
- Google OAuth redirect URI must exactly match the registered URI in Google Console

---

## Rate Limiting — Magic Link

The magic link endpoint is an email-flooding vector: an attacker can trigger thousands of emails to a target address within seconds if unconstrained.

**Limits applied in `middleware.ts` before Better Auth handles the request:**

| Signal | Limit | Window |
|--------|-------|--------|
| Per email address | 5 requests | 1 hour |
| Per IP address | 10 requests | 1 hour |

**Implementation:** Sliding window counters stored in PostgreSQL — no Redis required. On limit hit: return `429 Too Many Requests` without forwarding to Better Auth (no email sent, no token generated).

```ts
// lib/rate-limit.ts — PostgreSQL sliding window
async function checkRateLimit(key: string, limit: number, windowSecs: number): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowSecs * 1000)
  const count = await db
    .select({ count: sql<number>`count(*)` })
    .from(rateLimitEvents)
    .where(and(eq(rateLimitEvents.key, key), gte(rateLimitEvents.createdAt, windowStart)))
  if (count[0].count >= limit) return false
  await db.insert(rateLimitEvents).values({ key, createdAt: new Date() })
  return true
}
```

**Schema — `rate_limit_events`:**
```ts
id          text        PK  (cuid2)
key         text        NOT NULL   -- e.g. "magic-link:email:user@example.com"
created_at  timestamp   NOT NULL  DEFAULT now()
```
Index on `(key, created_at)` — sliding window query. Rows older than 1 hour pruned by `CLEANUP_EXPIRED_INVITES` cron (or a dedicated rate-limit cleanup job).

---

## Account Deletion (GDPR Right to Erasure)

Users have the right to delete their account and have their personal data erased.

### `DELETE /api/account`

```
Auth: Requires valid session
Body: { confirmation: "DELETE" }  — explicit user intent required

Logic:
  1. Verify session
  2. Require body.confirmation === "DELETE" — prevents accidental calls
  3. In a single transaction:
     a. Anonymize posts: SET author_name = "Deleted User", author_email = null, author_id = null
     b. Soft-delete comments: already handled (is_deleted = true + body cleared)
     c. SET NULL on votes.user_id for this user's votes (vote count preserved)
     d. Delete all sessions for this user
     e. Delete the user row → CASCADE removes: workspace_members, notifications,
        invites, superadmins (if any), better_auth account/session rows

Returns:
  204     — account deleted, all sessions invalidated
  400     — confirmation string missing or wrong
  401     — not signed in
```

### Profile & Account Settings — `/{ws-slug}/settings/account`

A settings page accessible to any signed-in user (not workspace-specific — redirects to this page from the user avatar dropdown).

**Sections:**

| Section | Fields | Actions |
|---------|--------|---------|
| Profile | Display name, avatar URL | PATCH /api/account |
| Danger Zone | — | "Delete Account" button → confirmation dialog |

### `PATCH /api/account`

```
Auth: Requires valid session
Body: { name?: string, image?: string }

Validates:
  - name: optional, 1–100 chars, trimmed
  - image: optional, valid URL, max 500 chars

Logic:
  → UPDATE user SET name = ?, image = ?, updatedAt = now() WHERE id = session.user.id

Returns:
  200 { user }   — updated user record
```

### Delete Account Flow

```
1. User clicks "Delete Account" in account settings
2. AlertDialog: "This cannot be undone. Type DELETE to confirm."
3. User types "DELETE" → button becomes enabled
4. Submit → DELETE /api/account { confirmation: "DELETE" }
5. Server anonymizes data, deletes user row, invalidates all sessions
6. Client receives 204 → redirects to / (homepage, signed out)
```
