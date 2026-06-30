# IdeaRoads — Database Schema

> **Implementation reference — not product specification.**
> This is the canonical schema for the IdeaRoads MVP. Product behaviour is described in the product docs; this file documents the persistence layer only. Feature files do **not** duplicate schema — they link here.
>
> **MVP scope note.** In the MVP, voting and commenting **require a signed-in User** — there is no anonymous participation (see [`../PLATFORM.md`](../PLATFORM.md)). The email/name columns on `votes` and `comments` (`user_email`, `user_name`, `author_email`, `author_name`) and the related email-based unique index support a possible future anonymous-participation capability; they are **not exercised by the MVP**.

---

## Tables Summary

| Table | Description |
|---|---|
| `user` | Better Auth managed |
| `session` | Better Auth managed |
| `account` | Better Auth managed (OAuth providers) |
| `verification` | Better Auth managed (magic link tokens) |
| `workspaces` | Workspace records with moderation settings |
| `workspace_members` | User ↔ workspace with role |
| `workspace_invites` | Email invites and shareable invite links |
| `boards` | Feedback boards (workspace-scoped) |
| `categories` | Post categories (workspace-scoped, with color) |
| `posts` | Feedback posts with denormalised counters |
| `post_status_changes` | Append-only status change audit trail |
| `votes` | User and guest votes on posts |
| `comments` | Threaded comments with soft delete |
| `changelog_entries` | Changelog entries (Markdown, draft/published) |
| `changelog_posts` | Junction table — changelog entry ↔ posts |
| `notifications` | In-app notifications for signed-in users |
| `blocked_users` | Users blocked from a workspace |
| `audit_logs` | Admin action history (workspace + platform level) |
| `email_outbox` | Durable email queue — written first, ensures zero email loss on crash |
| `outbound_webhook_endpoints` | Customer-registered HTTPS endpoints for workspace events |
| `outbound_webhook_deliveries` | Per-attempt delivery log with status + response (30-day retention) |
| `api_keys` | Workspace-scoped REST API keys (SHA-256 hashed, never stored raw) |
| `superadmins` | Platform Orbit Admin access list |
| `feature_flags` | Platform-wide boolean feature toggles |
| `platform_settings` | Singleton operator config (signup, limits, maintenance mode) |
| `plans` | Plan tiers — operator-editable from Orbit, controls workspace limits |
| `workspace_plan_assignments` | Per-workspace custom plan override set by Orbit Admin |

---

## Full Schema

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

## Schema ↔ Product Role Mapping

The `workspace_members.role` column stores `owner | admin | member`. These are **internal values only**. In product terms:

| DB `role` value | Product role |
|---|---|
| `owner` | Brand Admin (the workspace owner) |
| `admin` | Brand Admin |
| `member` | Team Member |

The `superadmins` table backs the **Orbit Admin** product role. Public end users (**User**) have a `user` row but never a `workspace_members` row.
