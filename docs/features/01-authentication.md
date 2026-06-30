# Feature 01 — Authentication

## Overview

IdeaRoads has no passwords. People sign in with a **Magic Link** (a one-time link sent to their email) or with **Google**. There is no email-and-password sign-in and no forgot-password or password-reset flow — neither is needed with passwordless sign-in.

The **same sign-in serves all four product roles**: an Orbit Admin, a Brand Admin, a Team Member, and a User all sign in through the same screen. Where they land afterwards depends on what their account already has, not on a different login. (For the role model, see [../PLATFORM.md](../PLATFORM.md).)

A first-time sign-in automatically creates an account — there is no separate registration step. Signing in and signing up are the same action.

Anyone can browse a brand's public boards, roadmap, and changelog without an account. **Creating feedback, voting, commenting, and following the roadmap all require signing in first** — there is no anonymous participation.

---

## Sign-in Methods

| Method | What the person does |
|---|---|
| **Magic Link** | Enters their email, receives a one-time sign-in link, clicks it, and is signed in. A new account is created automatically on first use. |
| **Google** | Clicks "Continue with Google", approves on Google's screen, and is signed in. A new account is created automatically on first use. |

Both methods live on the same sign-in screen. The "Continue with Google" option appears only when Google sign-in is enabled for the deployment.

Product facts:

- No email-and-password sign-in.
- No forgot-password / reset-password flow.
- First sign-in creates the account automatically — no separate signup form.

---

## Pages

IdeaRoads exposes clean, predictable URLs for the sign-in experience:

| Page | Purpose |
|---|---|
| `/signin` | Sign in or sign up (Magic Link + Google) |
| `/signup` | Sends people to `/signin` — there is no separate registration form |
| `/post-auth` | Routes a freshly signed-in person to the right destination |
| `/invite/[token]` | Accept an invitation to join a workspace |

---

## Post Sign-in Routing

After a person signs in, IdeaRoads sends them to the right place automatically:

- **No workspace yet** → onboarding, where they create their first workspace and become its Brand Admin.
- **Already a member of one or more workspaces** → their workspace dashboard.
- **Arrived via an invite link** → the invitation is accepted, then they land on the workspace dashboard.

This routing is the same regardless of how the person signed in.

---

## Sign Out

A signed-in person can sign out at any time from the account menu. Signing out ends their session and returns them to the sign-in screen.

---

## Profile & Account

Any signed-in person can manage their own account:

- **Edit profile** — update their display name and avatar.
- **Delete account** — permanently remove their account. Deletion is irreversible and requires explicit confirmation. After deletion, their feedback is anonymised and their vote counts are preserved, so the brand's data stays intact while the person's identity is erased.

---

## Flows

### Sign in with Magic Link (new person)

```
1. Visit /signin
2. Enter email → request the magic link
3. See a "Check your email" confirmation
4. Open the email and click the one-time link
5. Signed in (account created automatically)
6. Routed via /post-auth → no workspace → onboarding
```

### Sign in with Magic Link (returning person)

```
1–5. Same as above
6.  Routed via /post-auth → existing workspace → workspace dashboard
```

### Sign in with Google

```
1. Visit /signin
2. Choose "Continue with Google"
3. Approve on Google's consent screen
4. Signed in (account created or linked automatically)
5. Routed via /post-auth (same rules as Magic Link)
```

### Accept an invitation

```
1. Open an invite link (/invite/[token])
2. Sign in if not already signed in (Magic Link or Google)
3. The invitation is accepted
4. Land on the workspace dashboard as a Team Member
```

### Sign out

```
1. Open the account menu
2. Choose "Sign out"
3. Session ends → returned to /signin
```

---

## Acceptance Criteria

- A person can sign in with a Magic Link or with Google, and nothing else.
- There is no email-and-password sign-in and no password-reset flow anywhere in the product.
- A first-time sign-in creates an account automatically; there is no separate registration form.
- The same sign-in serves all four roles (Orbit Admin, Brand Admin, Team Member, User).
- After signing in, a person with no workspace reaches onboarding.
- After signing in, a person with one or more workspaces reaches their workspace dashboard.
- A person arriving through an invite link has the invitation accepted and then reaches the workspace dashboard.
- A signed-in person can sign out and is returned to the sign-in screen.
- A signed-in person can edit their display name and avatar.
- A signed-in person can permanently delete their account after explicit confirmation; their feedback is anonymised and vote counts are preserved.
- An expired or already-used Magic Link cannot sign anyone in; the person is told the link is no longer valid.
- The "Continue with Google" option only appears when Google sign-in is enabled.

---

> **Implementation reference.** API endpoints, the sign-in service layer, rate limiting, session handling, and engineering notes live in [../implementation/features/01-authentication.md](../implementation/features/01-authentication.md). The sign-in library and environment configuration are documented in [../implementation/TECH-STACK.md](../implementation/TECH-STACK.md).
