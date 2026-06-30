# Feature 13 — Orbit Admin

> Product behaviour only. For roles and permissions see [PLATFORM.md](../PLATFORM.md). For the technical reference (access control, seeding, impersonation, plan enforcement, feature flags, API endpoints, components) see [Feature 13 implementation reference](../implementation/features/13-orbit-admin.md).

## Overview

Orbit Admin is the platform-management area for **IdeaRoads internal staff only**. It lives at `/orbit` and is completely separate from the workspace-level controls a Brand Admin uses. Orbit Admin gives IdeaRoads operators visibility and control over the entire platform: every workspace, every user, platform plans, settings, feature flags, and background-job health.

Orbit Admin is reachable only by Orbit Admins. It is **invisible to everyone else** — a Brand Admin, Team Member, or User who navigates to an Orbit URL sees a standard not-found page, so the area's existence is never revealed. It is not linked from any marketing page or workspace screen.

An Orbit Admin is separate from a Brand Admin and **never participates in a customer workspace** unless they are actively impersonating a user for support.

---

## Orbit Areas

| Area | URL | What it does |
| --- | --- | --- |
| Dashboard | `/orbit` | Platform-wide stats and a health summary at a glance |
| Workspaces | `/orbit/workspaces` | List, search, view, suspend/unsuspend, and delete any workspace |
| Users | `/orbit/users` | List, search, view, grant/revoke Orbit Admin access, and impersonate any user |
| Plans | `/orbit/plans` | Create, edit, archive, and duplicate plan tiers |
| Platform Settings | `/orbit/settings` | Turn signups on/off, set limits, and toggle maintenance mode |
| Feature Flags | `/orbit/feature-flags` | Turn platform-wide features on or off |
| Job Queue | `/orbit/jobs` | Monitor the health of background jobs |
| Platform Audit Log | `/orbit/audit-log` | History of platform-level admin actions (suspensions, impersonations, and more) |

Signing in to Orbit Admin uses the same sign-in page as everyone else — there is no separate Orbit login. After signing in, an Orbit Admin navigates to `/orbit` and the platform area opens.

---

## Dashboard

The dashboard is the Orbit Admin landing screen. It surfaces the key platform metrics first — total workspaces, total users, total feedback posts, total votes, total comments, and how many workspaces are currently suspended. It also lists the most recently created workspaces and the most recently joined users so an operator can see activity at a glance. With no data yet, the dashboard simply shows zeros rather than an error.

---

## Workspaces

The Workspaces area lists every workspace on the platform, paginated and searchable by name, slug, or the owning Brand Admin's email, and filterable by **Active** or **Suspended**. Each row shows the workspace name, slug, owning Brand Admin, post count, member count, creation date, and status.

Opening a workspace shows its full detail: the owning Brand Admin, creation date, member/post/vote/comment counts, and its boards, categories, and most recent posts. From here an Orbit Admin can:

- **Suspend** a workspace — it immediately becomes unavailable.
- **Unsuspend** a workspace — it becomes available again.
- **Delete** a workspace — a permanent removal that requires typing the workspace slug to confirm; the workspace and all its data are removed and the owning Brand Admin is notified by email.

### Suspension behaviour

When a workspace is suspended, it is unavailable to **everyone** — its members (including the Brand Admin) lose access to the dashboard, and public visitors to the feedback portal see an "this workspace has been suspended" notice instead of the portal. The notice deliberately does not reveal the workspace name. The workspace stays suspended until an Orbit Admin restores it.

---

## Users

The Users area lists every person on the platform, paginated and searchable by name or email, with a filter to show only Orbit Admins. Each row shows the user's name, email, join date, number of workspace memberships, and whether they are an Orbit Admin.

Opening a user shows their detail: join date, last-seen date, sign-in methods, workspace memberships (and their role in each), and their recent posts and comments. From here an Orbit Admin can:

- **Grant Orbit Admin** — give another user access to Orbit Admin.
- **Revoke Orbit Admin** — remove another user's access. An Orbit Admin **cannot revoke their own access**, which prevents anyone from accidentally locking themselves out.
- **Impersonate** the user (when impersonation is enabled — see below).

Only existing Orbit Admins can grant or revoke Orbit Admin access.

---

## Impersonation

Impersonation lets an Orbit Admin temporarily act as a specific user to investigate a reported problem from that user's point of view. It is **opt-in and disabled by default**, **time-limited**, and **fully audited**.

While impersonating, a clear banner is shown at the top of every page identifying who is being impersonated, with a one-click way to end the session. Ending impersonation (or letting it time out) returns the Orbit Admin to their own session. Every impersonation start and end is recorded in the audit log, and any action taken during impersonation is attributed to the Orbit Admin, not the impersonated user.

---

## Plans

Plans define the tiers a workspace can be on — their name, price, and the limits and capabilities they unlock (such as the number of boards and members, and whether API access, webhooks, changelog, and roadmap are available). In the Plans area an Orbit Admin can create new plans, edit existing ones, duplicate a plan as a starting point, and archive plans that should no longer be offered. One plan is marked as the default that new workspaces start on, and the default cannot be archived. Custom plans are hidden from public selection and are assigned to specific workspaces.

---

## Platform Settings

Platform Settings is the platform's global configuration:

- **Signups** — turn new account creation on or off. When off, existing users can still sign in; no new accounts can be created.
- **Workspace limit** — set how many workspaces a single user may create.
- **Maintenance mode** — put the whole platform into maintenance with a custom message shown to visitors. Orbit Admins can still reach Orbit while maintenance mode is on.

---

## Feature Flags

Feature flags let an Orbit Admin turn platform-wide capabilities on or off without a deployment — for example Google sign-in, public roadmaps, public changelogs, and the changelog RSS feed. Each flag has a clear description and a simple on/off toggle. Turning a flag off disables that capability across the platform; for example, turning off Google sign-in removes that option from the sign-in page for every workspace.

---

## Job Queue

The Job Queue area gives operators a live view of background-job health. It shows active jobs with their counts and state, and recently failed jobs (last 24 hours) with their error messages, plus a refresh control. If the queue is not yet running, the page shows a clear "queue not initialised" state rather than failing.

---

## Platform Audit Log

Platform-level Orbit Admin actions are recorded for accountability — workspace suspensions and unsuspensions, workspace deletions, Orbit Admin grants and revocations, impersonation start/end, and feature-flag changes. Workspace-scoped actions also appear in the affected workspace's own audit log (see [Workspace Settings & Moderation](12-workspace-settings-moderation.md)).

---

## Acceptance Criteria

**Access**

- [ ] Orbit Admin is reachable only by Orbit Admins; everyone else gets a standard not-found page (its existence is never revealed).
- [ ] Visiting an Orbit URL while signed out leads to the sign-in page, then back to Orbit after authenticating.

**Dashboard**

- [ ] Platform stats (workspaces, users, posts, votes, comments, suspended) are accurate.
- [ ] Recent workspaces and recent users are listed.

**Workspaces**

- [ ] Workspace list is paginated and searchable by name, slug, or owning Brand Admin email.
- [ ] Workspaces can be filtered by Active / Suspended.
- [ ] Workspace detail shows the owning Brand Admin, boards, categories, and recent posts.
- [ ] Suspending a workspace makes it unavailable to all members and visitors.
- [ ] Unsuspending a workspace makes it available again.
- [ ] Deleting a workspace removes it and all its data and notifies the owning Brand Admin by email.
- [ ] Deletion requires typing the workspace slug to confirm.

**Users**

- [ ] User list is paginated and searchable by name and email.
- [ ] User detail shows sign-in methods, workspace memberships, recent posts, and recent comments.
- [ ] Granting Orbit Admin gives a user access to Orbit Admin.
- [ ] Revoking Orbit Admin removes a user's access.
- [ ] An Orbit Admin cannot revoke their own access.

**Impersonation**

- [ ] Impersonation is disabled by default and opt-in.
- [ ] While impersonating, a banner shows who is being impersonated and offers a way to end it.
- [ ] Ending impersonation returns the Orbit Admin to their own session.
- [ ] Impersonation is time-limited and ends automatically when it expires.
- [ ] Impersonation start and end are recorded in the audit log.

**Feature Flags**

- [ ] Default flags are available on a new platform.
- [ ] Toggling a flag updates the capability across the platform.
- [ ] Turning off a sign-in method (e.g. Google) removes it from the sign-in page across the platform.

**Job Queue**

- [ ] Active jobs are listed with their count and state.
- [ ] Failed jobs in the last 24 hours are listed with their error.
- [ ] The queue status can be refreshed.
