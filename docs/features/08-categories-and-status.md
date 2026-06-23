# Feature 08 — Categories & Status

## Overview

This feature covers two complementary organisational tools for posts:

**Categories** are workspace-level labels that admins create and assign to posts. They let users filter boards by topic (e.g. "UI/UX", "Performance", "Integrations"). Each category has a name, slug, and a hex colour.

**Status** is the lifecycle state of a post — from `open` all the way through to `completed` or `closed`. Status drives the Public Roadmap (Feature 09) and triggers voter notifications (Feature 11) on every change. Status change history is append-only and stored in `post_status_changes`.

Both categories and status already have DB columns stubbed in Feature 05 (`posts.category_id`, `posts.status`, `post_status_changes` table). This feature activates them fully — management UI, filtering, status change flow, and email notifications.

---

## Core Behaviour

### Categories
- Categories are scoped to a workspace — not shared across workspaces
- Admin (Owner/Admin role) creates, edits, and deletes categories
- Each category has: name (display), slug (URL-safe), colour (hex string)
- A post can have **zero or one** category
- Category assigned on submit (optional) or updated via admin toolbar
- Category chip shown on `<PostCard />` and post detail
- Board post list filterable by category
- Deleting a category: sets `category_id = NULL` on all posts that had it (no cascade delete)
- No limit on number of categories per workspace in MVP

### Status
- Six statuses: `open | under_review | planned | in_progress | completed | closed`
- Every post starts at `open` on creation
- Only Owner/Admin can change status
- Status changes are logged in `post_status_changes` (append-only)
- On every status change: all voters of the post are notified by email via `SEND_STATUS_CHANGE_EMAIL`
- Status badge shown on `<PostCard />` and post detail page
- Board post list filterable by status
- Status drives the public roadmap columns (Feature 09):
  - Roadmap **Planned** column ← `planned`
  - Roadmap **In Progress** column ← `in_progress`
  - Roadmap **Completed** column ← `completed`
- `open`, `under_review`, and `closed` posts do NOT appear on the public roadmap

---

## Dependencies

```
pg-boss         — enqueue SEND_STATUS_CHANGE_EMAIL
nodemailer      — deliver status change emails
```

---

## Environment Variables

No new variables beyond Feature 01.

---

## Database Schema

### `categories`

```ts
id            text        PK  (cuid2)
workspace_id  text        NOT NULL  → workspaces.id (CASCADE DELETE)
name          text        NOT NULL
slug          text        NOT NULL
color         text        NOT NULL  DEFAULT '#6366f1'   -- hex colour string
created_at    timestamp   NOT NULL  DEFAULT now()
updated_at    timestamp   NOT NULL  DEFAULT now()
```

**Constraints:**
- `UNIQUE (workspace_id, slug)` — slug unique within workspace
- `UNIQUE (workspace_id, name)` — name unique within workspace

**Indexes:**
- Index on `workspace_id`

---

### `post_status_changes` (activated from Feature 05 stub)

```ts
id            text        PK  (cuid2)
post_id       text        NOT NULL  → posts.id (CASCADE DELETE)
from_status   text        NOT NULL
to_status     text        NOT NULL
changed_by    text        NOT NULL  → user.id
note          text                  -- optional admin note
created_at    timestamp   NOT NULL  DEFAULT now()
```

**Indexes:**
- Index on `post_id`
- Index on `(post_id, created_at DESC)` — for status history list

---

### `posts` columns activated (already exist from Feature 05)

```ts
status        text    NOT NULL  DEFAULT 'open'
              -- Values: 'open' | 'under_review' | 'planned' | 'in_progress' | 'completed' | 'closed'
category_id   text              → categories.id (SET NULL on delete)
```

---

## Post Status Reference

| Status | Slug | Badge Colour | Roadmap Column | Meaning |
|---|---|---|---|---|
| Open | `open` | Grey | — | Newly submitted, no action yet |
| Under Review | `under_review` | Yellow/Amber | — | Being evaluated by the team |
| Planned | `planned` | Blue | ✓ Planned | Committed to building |
| In Progress | `in_progress` | Purple/Indigo | ✓ In Progress | Actively being built |
| Completed | `completed` | Green | ✓ Completed | Shipped |
| Closed | `closed` | Red | — | Won't fix / not planned |

---

## File Structure

```
app/
├── (workspace)/
│   └── [ws-slug]/
│       └── settings/
│           └── categories/
│               └── page.tsx                Manage categories page
└── api/
    ├── workspaces/
    │   └── [slug]/
    │       └── categories/
    │           ├── route.ts                GET list / POST create
    │           └── [categoryId]/
    │               └── route.ts            PATCH update / DELETE
    └── posts/
        └── [postId]/
            └── status/
                └── route.ts                PATCH change status (activated from Feature 05)

components/
├── categories/
│   ├── category-chip.tsx                   Coloured label chip shown on post cards
│   ├── category-select.tsx                 Dropdown to assign category to a post
│   ├── category-form.tsx                   Create / edit category form (name, colour)
│   └── category-list.tsx                   Manage categories table (settings page)
├── posts/
│   ├── status-badge.tsx                    Activated fully (colours wired up)
│   ├── status-select.tsx                   Admin dropdown to change post status
│   └── status-history.tsx                  Accordion of past status changes on post detail
└── boards/
    └── board-controls.tsx                  Updated: adds category filter + status filter

lib/
├── categories/
│   ├── queries.ts
│   ├── create.ts
│   ├── update.ts
│   ├── delete.ts
│   └── index.ts
└── worker/handlers/
    └── send-status-change-email.ts

lib/email/templates/
└── status-change.ts
```

---

## Implementation Details

### `lib/categories/queries.ts`

```ts
getCategoriesForWorkspace(workspaceId)
  → returns categories[] ordered by name ASC
  → includes post_count per category (subquery)

getCategoryById(categoryId, workspaceId)
  → returns single category or null (with workspace ownership check)

getCategoryBySlug(slug, workspaceId)
  → returns category or null
```

---

### `lib/categories/create.ts`

```ts
createCategory(workspaceId, { name, color? })
  → validates: name 1–50 chars
  → validates: name unique within workspace
  → generates slug from name (slugify)
  → validates: slug unique within workspace
  → validates: color is valid hex string (default '#6366f1' if omitted)
  → inserts category row
  → returns category
```

---

### `lib/categories/update.ts`

```ts
updateCategory(categoryId, workspaceId, { name?, color? })
  → if name changes: validate uniqueness within workspace, regenerate slug
  → if color changes: validate hex format
  → updates row + updated_at
  → returns updated category
```

---

### `lib/categories/delete.ts`

```ts
deleteCategory(categoryId, workspaceId)
  → verifies category belongs to workspace
  → in db.transaction():
      → UPDATE posts SET category_id = NULL WHERE category_id = categoryId
      → DELETE FROM categories WHERE id = categoryId
  → returns void
```

---

### Status Change Service (in `lib/posts/update.ts` — extended from Feature 05)

```ts
changeStatus(postId, workspaceId, newStatus, changedBy, note?)
  → fetch current post
  → if post not found: throw NotFoundError
  → if newStatus === post.status: return post (no-op — no log, no email)
  → validate newStatus is a valid PostStatus value

  In db.transaction():
    → INSERT INTO post_status_changes {
        id, post_id,
        from_status: post.status,
        to_status: newStatus,
        changed_by: changedBy,
        note: note ?? null,
        created_at: now()
      }
    → UPDATE posts SET status = newStatus, updated_at = now() WHERE id = postId

  Post-transaction:
    → fetch all voters for this post (votes table — user_id + user_email)
    → for each voter with a valid email:
        enqueue SEND_STATUS_CHANGE_EMAIL job
    → returns updated post
```

---

### `app/api/workspaces/[slug]/categories/route.ts`

**GET** — List categories
```
Auth: requireWorkspaceMember
Returns: category[] (id, name, slug, color, postCount)
         ordered by name ASC
```

**POST** — Create category
```
Auth: requireRole(['owner', 'admin'])
Body: { name: string, color?: string }
Validates:
  - name: required, 1–50 chars
  - color: optional, must match /^#[0-9A-Fa-f]{6}$/ if provided
  - name unique within workspace
Returns: 201 + category
```

---

### `app/api/workspaces/[slug]/categories/[categoryId]/route.ts`

**PATCH** — Update category
```
Auth: requireRole(['owner', 'admin'])
Body: { name?, color? }
Validates: same rules as create
Returns: updated category
```

**DELETE** — Delete category
```
Auth: requireRole(['owner', 'admin'])
Logic: nullifies category_id on all posts, then deletes category
Returns: 204
```

---

### `app/api/posts/[postId]/status/route.ts` (fully activated)

**PATCH** — Change post status
```
Auth: requireRole(['owner', 'admin'])
Body: { status: PostStatus, note?: string }
Validates:
  - status must be one of: open | under_review | planned | in_progress | completed | closed
  - note: optional, max 500 chars
Calls: changeStatus(postId, workspaceId, status, session.user.id, note)
Returns: { post, statusChange }
```

---

### `app/(workspace)/[ws-slug]/settings/categories/page.tsx`

- Server component
- Fetches all categories for workspace
- Renders `<CategoryList />` — table with name, colour swatch, post count, edit/delete actions
- "New Category" button → opens `<CategoryForm />` in a modal

---

### `components/categories/category-chip.tsx`

Inline pill shown on `<PostCard />` and post detail:

```
Render:
  ● {category.name}
  │
  └── dot colour = category.color
      background = category.color at 15% opacity
      text = category.color (darkened for contrast)
```

- Clicking a category chip on the board page applies that category as a filter
- No click action on post detail page (display only)

---

### `components/categories/category-select.tsx`

Client component — dropdown to assign/change a post's category:

**Usage contexts:**
1. In `<SubmitPostModal />` (Feature 05) — optional field on submission
2. In `<AdminPostToolbar />` (Feature 05) — change category of existing post

**Behaviour:**
- Shows all workspace categories as options with colour dots
- "No category" option (clears assignment)
- On select: PATCH `/api/posts/[postId]` `{ categoryId }` (via Feature 05 update endpoint)
- Optimistic update: chip updates immediately, reverts on error

---

### `components/categories/category-form.tsx`

Client component — used in a Dialog for create/edit:

**Fields:**
- Name (text input, required, 1–50 chars, live uniqueness hint)
- Colour (colour picker — simple palette of 12 preset hex colours + custom hex input)

**Preset colours:**
```
#6366f1  Indigo    #8b5cf6  Violet    #ec4899  Pink
#f43f5e  Rose      #f97316  Orange    #eab308  Yellow
#84cc16  Lime      #22c55e  Green     #14b8a6  Teal
#06b6d4  Cyan      #3b82f6  Blue      #64748b  Slate
```

**Behaviour:**
- Create mode: POST `/api/workspaces/[slug]/categories`
- Edit mode: PATCH `/api/workspaces/[slug]/categories/[categoryId]`
- On success: close modal, refresh category list
- Name uniqueness error shown inline below field

---

### `components/categories/category-list.tsx`

Client component — table in settings page:

**Columns:** Colour swatch | Name | Slug | Posts using | Actions (Edit / Delete)

**Delete flow:**
- If `post_count > 0`: AlertDialog — "This category is used by {n} posts. Deleting it will remove the label from those posts."
- If `post_count = 0`: AlertDialog — "Delete '{name}'?"
- Confirm → DELETE endpoint → category removed, post chips cleared

---

### `components/posts/status-select.tsx`

Client component — in `<AdminPostToolbar />`:

**Render:** Dropdown select with all 6 status options, colour-coded to match status badges

**Behaviour:**
- Current status pre-selected
- On change → PATCH `/api/posts/[postId]/status` `{ status, note? }`
- Optional note field appears below dropdown before confirming:
  - "Add a note (optional)" — shown as a small textarea
  - Note is stored in `post_status_changes.note`
- Optimistic: status badge on page updates immediately
- On error: status reverts, toast shown

---

### `components/posts/status-history.tsx`

Client component — collapsible section on post detail page:

**Title:** "Status History" with count

**Renders:** Timeline list (newest first):
```
● Planned → In Progress        "2 days ago"   by Admin Name
  "Started sprint 42"          ← admin note if present

● Open → Planned               "5 days ago"   by Admin Name
```

**Access:** Visible to workspace members (Owner/Admin/Member) on post detail
**Public users:** Status history is hidden from public post detail page

---

### `components/boards/board-controls.tsx` (updated)

Category filter dropdown added (alongside existing sort + status filter):

```
Sort: [Trending ▾]   Status: [All ▾]   Category: [All ▾]   [My Votes]
```

- Category dropdown: "All Categories" + list of workspace categories with colour dots
- Selecting a category adds `categoryId=xxx` to URL query params
- Combined filter: status + category filters are additive (AND logic)

---

## Background Jobs

### `SEND_STATUS_CHANGE_EMAIL`

**Trigger:** `changeStatus()` — one job enqueued per voter email after status change

**Payload:**
```ts
{
  voterEmail: string
  voterName: string
  postTitle: string
  postUrl: string
  fromStatus: string
  toStatus: string
  note: string | null
  workspaceName: string
  adminNote?: string
}
```

**Handler:** `lib/worker/handlers/send-status-change-email.ts`
- Sends one email per voter
- Subject: `"Update on '{postTitle}': now {toStatus}"`
- Body:
  - Post title + link
  - Status change: "{fromStatus} → {toStatus}"
  - Admin note (if present)
  - "You're receiving this because you voted on this post."
  - One-click unsubscribe link — HMAC-signed token in URL, no login required (see Feature 11 — Unsubscribe)

**Volume note:** If a popular post has 500 voters, 500 jobs are enqueued. pg-boss handles this as a batch. Jobs are processed with concurrency limit to avoid SMTP rate limits.

---

## User Flows

### Admin Creates a Category

```
1. Admin navigates to /{ws-slug}/settings/categories
2. Clicks "New Category"
3. CategoryForm modal opens
4. Enters name (e.g. "Performance"), picks colour (e.g. Orange)
5. Submit → POST /api/workspaces/[slug]/categories
6. Category appears in list with post count = 0
7. Category now available in board category filter + post submit form
```

### Admin Assigns Category to Post

```
1. Admin views post detail
2. AdminPostToolbar shows CategorySelect dropdown
3. Selects "Performance"
4. PATCH /api/posts/[postId] { categoryId }
5. Post card updates: shows orange "Performance" chip
6. Post now appears when board filtered by "Performance"
```

### User Submits Post with Category

```
1. User opens SubmitPostModal
2. Category dropdown shown (optional)
3. Selects "UI/UX"
4. Submits post
5. Post created with category_id set
6. Category chip shown on new post card immediately
```

### Admin Deletes a Category

```
1. Admin navigates to categories settings
2. "Performance" category has 12 posts
3. Clicks Delete → AlertDialog:
   "This category is used by 12 posts. Deleting it will remove the label from those posts."
4. Confirm → DELETE /api/workspaces/[slug]/categories/[categoryId]
5. category_id set to NULL on all 12 posts
6. Category chips removed from those post cards
7. Category removed from filter dropdown
```

### Admin Changes Post Status

```
1. Admin views post detail
2. StatusSelect shows current status "Open"
3. Admin selects "Planned"
4. Optional note textarea appears: Admin types "Scheduled for Q3"
5. Confirm → PATCH /api/posts/[postId]/status { status: 'planned', note: 'Scheduled for Q3' }
6. Status badge on post updates to "Planned" (blue)
7. Post now appears in Public Roadmap → Planned column (Feature 09)
8. post_status_changes row inserted: open → planned, note saved
9. All voters receive SEND_STATUS_CHANGE_EMAIL
10. Status history timeline on post detail shows new entry
```

### User Filters Board by Category + Status

```
1. User visits public board
2. Board controls show: Sort | Status filter | Category filter
3. User selects Status: "Planned" + Category: "UI/UX"
4. URL updates: ?status=planned&categoryId=xxx
5. Post list shows only planned posts tagged "UI/UX"
6. Post count updates: "4 posts"
```

---

## API Reference

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/workspaces/[slug]/categories` | Member | List workspace categories |
| POST | `/api/workspaces/[slug]/categories` | Admin+ | Create category |
| PATCH | `/api/workspaces/[slug]/categories/[id]` | Admin+ | Update category |
| DELETE | `/api/workspaces/[slug]/categories/[id]` | Admin+ | Delete category + nullify posts |
| PATCH | `/api/posts/[postId]/status` | Admin+ | Change post status |

---

## Validation Rules

| Field | Rules |
|---|---|
| Category `name` | Required, 1–50 chars, unique within workspace |
| Category `color` | Optional, must match `/^#[0-9A-Fa-f]{6}$/`, defaults to `#6366f1` |
| Post `status` | Must be one of the 6 valid PostStatus values |
| Status `note` | Optional, max 500 chars |

---

## Edge Cases

| Case | Handling |
|---|---|
| Admin sets status to the same value it already has | `changeStatus` detects no change → no-op, no log entry, no emails sent |
| Category deleted — posts lose chip | `category_id` SET NULL on posts; `<CategoryChip />` renders nothing when `category_id = null` |
| Category renamed — post chips update | Category is fetched by ID not slug — rename reflects immediately on all post chips |
| Admin changes post status while voter email bounces | pg-boss job fails; retried up to 3 times; after max retries, logged as failed — does not block the status change itself |
| Post has 0 voters when status changes | `changeStatus` fetches voters → empty array → no jobs enqueued, no emails sent |
| Two admins change same post status simultaneously | Last write wins — both write to `post_status_changes` (two rows), both update `posts.status`. The final state is the last applied status. No locking needed — status changes are not financially critical |
| Post status changed to `completed` — does it auto-populate changelog? | No — changelog entries are manually created by admin (Feature 10). Status = completed only shows post in roadmap Completed column |
| Category filter + status filter combined | Both filters applied as AND conditions in `listPosts()` query |
| Workspace has no categories | Category filter dropdown hidden from board controls — only shown if workspace has ≥1 category |
| Category slug collision on create | `createCategory` generates slug from name; if collision: append `-1`, `-2` etc. Same pattern as workspace/board slugs |

---

## Acceptance Criteria

**Categories:**
- [ ] Admin can create a category with name and colour
- [ ] Category name must be unique within the workspace
- [ ] Category slug is auto-generated from name
- [ ] Colour picker shows 12 preset colours + custom hex input
- [ ] Invalid hex colour returns validation error
- [ ] Admin can edit category name and colour
- [ ] Admin can delete a category — posts lose the label (category_id set to null)
- [ ] Delete confirmation shows how many posts use the category
- [ ] Category chip shown on post cards with correct colour
- [ ] Category assigned on post submission (optional)
- [ ] Admin can assign/change category via admin post toolbar
- [ ] Board post list is filterable by category
- [ ] Category filter and status filter work together (AND logic)
- [ ] Category dropdown hidden from board controls when workspace has no categories

**Status:**
- [ ] Every post starts at `open` on creation
- [ ] Admin can change post status via StatusSelect dropdown
- [ ] Optional note can be added to a status change
- [ ] Status badge on post card and detail page updates immediately
- [ ] Status change is logged in `post_status_changes`
- [ ] No log entry created when status set to the same value
- [ ] All voters receive email notification on status change
- [ ] No emails sent when post has zero voters
- [ ] Status history timeline shown on post detail (members only)
- [ ] Post list is filterable by status
- [ ] Posts with status `planned`, `in_progress`, `completed` appear on public roadmap (Feature 09)

---

## Implementation Notes

- `post_status_changes` is **append-only** — never updated, never deleted. It is a permanent audit trail
- `SEND_STATUS_CHANGE_EMAIL` is enqueued **one job per voter** (not one job for all voters) — this allows pg-boss to process them with controlled concurrency and retry individual failures without re-sending to everyone
- Category colours are stored as hex strings (e.g. `#6366f1`) — the UI derives the background tint and text contrast at render time using CSS `opacity` or a colour manipulation utility
- The `changeStatus` function lives in `lib/posts/update.ts` (Feature 05) — this feature only adds the email job enqueue step and the `post_status_changes` insert. The function was stubbed in Feature 05 and is now fully implemented
- Categories endpoint (`GET /api/workspaces/[slug]/categories`) is also consumed by `<SubmitPostModal />` (Feature 05), `<BoardControls />`, and `<AdminPostToolbar />` — fetch and cache at the workspace layout level if possible to avoid redundant calls
- Slug is auto-generated from the category name and stored — if the name changes, the slug is **also regenerated** to stay in sync. This is different from workspace/board slugs which the user controls manually
