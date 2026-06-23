# Feature 05 — Feedback Posts

## Overview

Feedback Posts are the core unit of IdeaRoads. A post is a piece of user feedback — a feature request, bug report, or idea — submitted to a board. Posts have a title, description, status, vote count, and comment count. Admins can pin, merge, move, and change the status of posts. Authors can edit and delete their own posts. Posts are public by default (inheriting the board's visibility).

---

## Core Behaviour

- Any signed-in user can submit a post to any public board
- Guest users (not signed in) can submit with name + email
- Post URL format: `/{ws-slug}/b/{board-slug}/p/{postId}-{slug}`
- `postId` is a cuid2 — slug is derived from the title for readability
- Post list default sort: **Trending** (vote velocity) — also supports Newest and Top Voted
- **Pinned posts** always appear at the top regardless of sort
- Post statuses: `open | under_review | planned | in_progress | completed | closed`
- Status changes are logged in `post_status_changes`
- Admin actions: pin, unpin, change status, move to another board, merge into another post, delete
- Author actions: edit title/description, delete own post (if no votes yet — configurable)
- Merging a post transfers all its votes to the target post and marks it as merged (locked)
- Moving a post changes its `board_id` — URL updates to reflect new board slug
- Description is plain text (no rich text editor in MVP)
- Attachments are schema-stubbed but not functional in MVP (no file upload)
- Moderation mode (from workspace settings): `off` | `auto` | `manual`
  - `off`: post is immediately public
  - `auto`: spam keywords filter applied — clean posts go public, flagged go to manual review
  - `manual`: all posts require admin approval before going public

---

## Dependencies

```
@paralleldrive/cuid2    — post IDs
slugify                 — generate post slug from title
pg-boss                 — enqueue SEND_NEW_POST_ALERT job
nodemailer              — deliver alert email
```

---

## Environment Variables

No new variables beyond Feature 01.

---

## Database Schema

### `posts`

```ts
id              text          PK  (cuid2)
slug            text          NOT NULL
title           text          NOT NULL
description     text
status          text          NOT NULL  DEFAULT 'open'
                              -- 'open' | 'under_review' | 'planned'
                              -- 'in_progress' | 'completed' | 'closed'
vote_count      integer       NOT NULL  DEFAULT 0
comment_count   integer       NOT NULL  DEFAULT 0
board_id        text          NOT NULL  → boards.id (CASCADE DELETE)
workspace_id    text          NOT NULL  → workspaces.id (CASCADE DELETE)
author_id       text                    → user.id (SET NULL on delete)
author_email    text                    -- stored for guest authors
author_name     text                    -- stored for guest authors
category_id     text                    → categories.id (SET NULL) -- Feature 08
is_pinned       boolean       NOT NULL  DEFAULT false
is_locked       boolean       NOT NULL  DEFAULT false
merged_into_id  text                    → posts.id (SET NULL)
is_approved     boolean       NOT NULL  DEFAULT false
                              -- true when moderation_mode = 'off' or manually approved
created_at      timestamp     NOT NULL  DEFAULT now()
updated_at      timestamp     NOT NULL  DEFAULT now()
```

**Indexes:**
- Index on `(board_id, status)` — board post list filtered by status
- Index on `(board_id, vote_count DESC)` — top voted sort
- Index on `(board_id, created_at DESC)` — newest sort
- Index on `(board_id, is_pinned)` — pinned posts first
- Index on `workspace_id`
- Index on `author_id`
- Index on `merged_into_id`

---

### `post_status_changes`

```ts
id              text          PK  (cuid2)
post_id         text          NOT NULL  → posts.id (CASCADE DELETE)
from_status     text          NOT NULL
to_status       text          NOT NULL
changed_by      text          NOT NULL  → user.id
note            text                    -- optional admin note on status change
created_at      timestamp     NOT NULL  DEFAULT now()
```

**Indexes:**
- Index on `post_id`

---

### `post_attachments` (stub — not functional in MVP)

```ts
id              text          PK  (cuid2)
post_id         text          NOT NULL  → posts.id (CASCADE DELETE)
filename        text          NOT NULL
url             text          NOT NULL
size_bytes      integer       NOT NULL
mime_type       text          NOT NULL
uploaded_by     text          → user.id
created_at      timestamp     NOT NULL  DEFAULT now()
```

> Attachments schema exists for future S3/R2 upload support. Upload endpoints are not built in MVP.

---

## File Structure

```
app/
├── (workspace)/
│   └── [ws-slug]/
│       └── b/
│           └── [board-slug]/
│               └── page.tsx                Admin board post list
├── (public)/
│   └── [ws-slug]/
│       └── b/
│           └── [board-slug]/
│               ├── page.tsx                Public board post list
│               └── p/
│                   └── [postId]/
│                       └── page.tsx        Post detail page
└── api/
    ├── boards/
    │   └── [boardId]/
    │       └── posts/
    │           └── route.ts                GET list / POST create
    └── posts/
        └── [postId]/
            ├── route.ts                    GET / PATCH / DELETE
            ├── pin/
            │   └── route.ts                PATCH toggle pin
            ├── status/
            │   └── route.ts                PATCH change status
            ├── move/
            │   └── route.ts                PATCH move to board
            ├── merge/
            │   └── route.ts                POST merge into post
            └── approve/
                └── route.ts                PATCH approve (moderation)

components/
└── posts/
    ├── post-card.tsx                       Post summary card (list view)
    ├── post-detail.tsx                     Full post body + metadata
    ├── submit-post-modal.tsx               Modal for submitting new post
    ├── admin-post-toolbar.tsx              Admin actions bar (pin/status/move/merge/delete)
    ├── author-actions.tsx                  Edit/delete actions for post author
    ├── status-badge.tsx                    Coloured status pill
    ├── status-select.tsx                   Admin status change dropdown
    ├── board-controls.tsx                  Sort + filter controls above post list
    ├── merge-post-modal.tsx                Search + select target post to merge into
    └── move-post-modal.tsx                 Select target board to move post to

lib/
└── posts/
    ├── queries.ts                          Read operations
    ├── create.ts                           Create post
    ├── update.ts                           Update post fields
    ├── delete.ts                           Delete post
    ├── merge.ts                            Merge post into another
    └── index.ts                            Re-exports

lib/worker/handlers/
└── send-new-post-alert.ts                  Notify admins of new post

lib/email/templates/
└── new-post-alert.ts                       Email HTML template
```

---

## Implementation Details

### `lib/posts/queries.ts`

```ts
listPosts(boardId, {
  sort: 'trending' | 'newest' | 'top',
  status?: PostStatus,
  categoryId?: string,
  search?: string,
  page: number,
  limit: number,
  userId?: string,         // to include hasVoted flag
  includeUnapproved?: boolean,  // admins only
})
  → returns paginated posts[]
  → pinned posts always first (ORDER BY is_pinned DESC, then sort)
  → merged posts excluded (merged_into_id IS NULL)
  → unapproved posts excluded unless includeUnapproved = true
  → includes hasVoted boolean if userId provided

getPostById(postId)
  → returns full post with author info or null

getPostByIdAndSlug(postId)
  → used for URL resolution (postId extracted from [postId] param which is "{id}-{slug}")

getTrendingScore(post)
  → score = vote_count / (hours_since_created + 2)^1.5
  → computed in SQL or application layer
```

---

### `lib/posts/create.ts`

```ts
createPost(boardId, workspaceId, {
  title,
  description?,
  authorId?,        -- null for guests
  authorEmail?,     -- for guests
  authorName?,      -- for guests
  categoryId?,
})
  → validates: board exists, not archived
  → validates: title 5–150 chars
  → validates: description max 5000 chars
  → generates cuid2 id
  → generates slug from title (slugify)
  → checks workspace moderation_mode:
      'off'    → is_approved = true
      'auto'   → run spam keyword check → is_approved = true/false
      'manual' → is_approved = false (pending admin review)
  → checks spam keywords (if moderation_mode = 'auto'):
      if title/description contains any workspace spam_keywords → is_approved = false
  → inserts post row
  → if is_approved: enqueues SEND_NEW_POST_ALERT
  → returns post
```

---

### `lib/posts/update.ts`

```ts
updatePost(postId, workspaceId, {
  title?,
  description?,
  categoryId?,
}, requesterId, requesterRole)
  → verifies post belongs to workspace
  → if requesterRole is not admin/owner: verify requesterId = post.author_id
  → if post.is_locked or post.merged_into_id IS NOT NULL: reject (locked/merged posts cannot be edited)
  → updates fields + updated_at
  → returns updated post

togglePin(postId, workspaceId)
  → flips is_pinned
  → returns updated post

changeStatus(postId, workspaceId, newStatus, changedBy, note?)
  → fetches current post
  → if status unchanged: return (no-op)
  → inserts post_status_changes row
  → updates posts.status
  → enqueues SEND_STATUS_CHANGE_EMAIL (Feature 11)
  → returns updated post
```

---

### `lib/posts/merge.ts`

```ts
mergePosts(sourcePostId, targetPostId, workspaceId, mergedBy)
  → verifies both posts belong to workspace
  → verifies source !== target
  → verifies neither post is already merged
  → in db.transaction():
      → transfers all votes from source to target:
          UPDATE votes SET post_id = targetPostId WHERE post_id = sourcePostId
          (skip if voter already voted on target — de-duplicate)
      → updates target post vote_count = actual vote count
      → sets source post: merged_into_id = targetPostId, is_locked = true, status = 'closed'
      → inserts post_status_changes: open → closed (reason: merged)
  → returns { source: updatedSource, target: updatedTarget }
```

---

### `lib/posts/delete.ts`

```ts
deletePost(postId, workspaceId, requesterId, requesterRole)
  → verifies post belongs to workspace
  → if requesterRole is not admin/owner:
      verify requesterId = post.author_id
      verify post.vote_count = 0 (authors can only delete their own posts with no votes)
  → hard deletes post row (CASCADE removes votes, comments, status_changes, attachments)
  → returns void
```

---

### `app/api/boards/[boardId]/posts/route.ts`

**GET** — List posts for a board
```
Auth: Public (for public boards) or requireWorkspaceMember (for private boards)
Query params:
  sort=trending|newest|top    (default: trending)
  status=open|planned|...     (optional filter)
  categoryId=xxx              (optional filter)
  search=xxx                  (optional full-text search on title)
  page=1                      (pagination)
  limit=20                    (default 20, max 50)
Returns: { posts: Post[], total: number, hasMore: boolean }
  - Unapproved posts excluded for non-admin requests
  - Merged posts excluded
  - hasVoted field included if user is authenticated
```

**POST** — Submit a post
```
Auth: Session optional (guests allowed with email+name)
Body: { title, description?, categoryId?, authorEmail?, authorName? }
Validates:
  - If not signed in: authorEmail and authorName required
  - title: 5–150 chars
  - description: max 5000 chars
  - Board not archived
  - Valid email format if authorEmail provided
Calls: createPost(...)
Returns: 201 + post
Note: if moderation_mode = 'manual', returns 201 with is_approved = false
      and shows "Your post is pending review" message to user
```

---

### `app/api/posts/[postId]/route.ts`

**GET** — Get post detail
```
Auth: Public (if board is public) or requireWorkspaceMember
Returns: full post + author info + status_changes history
```

**PATCH** — Update post
```
Auth: Session required
  - Author can edit own post (title, description) if not locked/merged
  - Admin+ can edit any field including categoryId
Body: { title?, description?, categoryId? }
Returns: updated post
```

**DELETE** — Delete post
```
Auth: Session required
  - Author can delete own post only if vote_count = 0
  - Admin+ can delete any post
Returns: 204
```

---

### `app/api/posts/[postId]/pin/route.ts`

**PATCH** — Toggle pin
```
Auth: requireRole(['owner', 'admin'])
Returns: updated post { is_pinned }
```

---

### `app/api/posts/[postId]/status/route.ts`

**PATCH** — Change status
```
Auth: requireRole(['owner', 'admin'])
Body: { status: PostStatus, note?: string }
Validates: status is a valid PostStatus value
Calls: changeStatus(...)
Returns: updated post + new status_change record
```

---

### `app/api/posts/[postId]/move/route.ts`

**PATCH** — Move post to another board
```
Auth: requireRole(['owner', 'admin'])
Body: { boardId: string }
Validates: target board belongs to same workspace
Updates: post.board_id = boardId
Returns: updated post (new URL will be /{ws-slug}/b/{new-board-slug}/p/{postId}-{slug})
```

---

### `app/api/posts/[postId]/merge/route.ts`

**POST** — Merge post into another
```
Auth: requireRole(['owner', 'admin'])
Body: { targetPostId: string }
Validates:
  - Target post belongs to same workspace
  - Source !== target
  - Neither is already merged
Calls: mergePosts(...)
Returns: { source, target }
```

---

### `app/api/posts/[postId]/approve/route.ts`

**PATCH** — Approve a pending post (moderation)
```
Auth: requireRole(['owner', 'admin'])
Updates: post.is_approved = true
Enqueues: SEND_NEW_POST_ALERT
Returns: updated post
```

---

### `app/(public)/[ws-slug]/b/[board-slug]/page.tsx` — Public Board

Server component:
- Fetches board by workspace slug + board slug
- If board is private + user is not member → 404
- If board is archived → show archived banner (no submit button)
- Fetches paginated posts (default: sort=trending, is_approved=true, merged excluded)
- Renders `<BoardControls />` (sort + filter)
- Renders post list: pinned posts first, then sorted
- Renders `<SubmitPostModal />` trigger (disabled if archived)
- SEO: `generateMetadata()` with board name + workspace name

---

### `app/(public)/[ws-slug]/b/[board-slug]/p/[postId]/page.tsx` — Post Detail

Server component:
- Param `[postId]` is in format `{cuid2}-{slug}` — extract ID with `postId.split('-')[0]`... 
  - Actually: the postId segment is `{id}-{readable-slug}` — extract the cuid2 from the start
  - Better approach: the ID is everything before the first occurrence of the slug separator
  - Simplest: store the full `{id}-{slug}` as a single param, fetch post by `postId` (first segment split by first non-cuid char)
  - Implementation: `const id = params.postId.split('-').slice(0, 1).join('')` — since cuid2 has no hyphens, split on `-` and take first element
- Fetches post by ID — if not found → 404
- Verifies post belongs to the board and workspace in the URL (canonical check)
- If post URL doesn't match (post was moved): redirect to correct URL
- Renders `<PostDetail />` — full title, description, author, date, status badge
- Renders `<VoteButton />` (Feature 06)
- Renders `<AdminPostToolbar />` for admin users
- Renders `<AuthorActions />` for post author
- Renders comment thread (Feature 07)
- SEO: `generateMetadata()` with post title + board name

---

### `components/posts/post-card.tsx`

Used in board post list. Displays:
- `<VoteButton />` (left side, vertical)
- Title (links to post detail)
- Author name + relative date ("3 days ago")
- `<StatusBadge />` (if not 'open')
- Category chip (if assigned — Feature 08)
- Comment count with icon
- Pin icon (if pinned)
- Merged badge (if merged — "Merged into: {target title}")

---

### `components/posts/submit-post-modal.tsx`

Client component — Dialog:
- Trigger: "Submit Feedback" / "New Post" button on board page
- Fields:
  - Title (required, 5–150 chars, live char count)
  - Description (optional, textarea, max 5000 chars, live char count)
  - Category select (optional — Feature 08 adds this)
  - If not signed in: Name (required) + Email (required)
- Submit → POST `/api/boards/[boardId]/posts`
- On success (is_approved = true): close modal, toast "Post submitted!", post appears in list
- On success (is_approved = false): close modal, toast "Your post is pending review"
- On duplicate detection (similar title exists): show warning "A similar post exists: {title}" with link — user can proceed anyway
- Duplicate detection: client-side check via GET posts with search param before submit

---

### `components/posts/admin-post-toolbar.tsx`

Client component — shown on post detail page for Owner/Admin:

Actions row:
- **Pin / Unpin** — PATCH `/pin`
- **Status** — `<StatusSelect />` dropdown
- **Move** — opens `<MovePostModal />`
- **Merge** — opens `<MergePostModal />`
- **Approve** — shown only if `is_approved = false` (pending moderation)
- **Delete** — AlertDialog confirm → DELETE

---

### `components/posts/author-actions.tsx`

Client component — shown on post detail page for the post's own author:
- **Edit** — inline edit mode for title + description
- **Delete** — AlertDialog confirm; only shown if `vote_count = 0`

---

### `components/posts/status-badge.tsx`

Pill badge — colour-coded per status:

| Status | Colour |
|---|---|
| open | Grey |
| under_review | Yellow |
| planned | Blue |
| in_progress | Purple |
| completed | Green |
| closed | Red |

---

### `components/posts/board-controls.tsx`

Client component — rendered above the post list:
- Sort tabs: Trending / Newest / Top Voted
- Status filter dropdown: All / Open / Under Review / Planned / In Progress / Completed / Closed
- Category filter (Feature 08)
- "My Votes" toggle chip (logged-in users only — Feature 06)
- Post count display: "{n} posts"
- On change: updates URL query params (no page reload — uses `router.replace`)

---

### `components/posts/merge-post-modal.tsx`

Client component — Dialog:
- Search input: search posts by title within the same workspace
- Results list with vote counts
- Select target post to merge into
- Confirm: "Merge '{source title}' into '{target title}'? All votes will be transferred."
- Submit → POST `/api/posts/[postId]/merge`
- On success: source post disappears from board, target vote count updates

---

### `components/posts/move-post-modal.tsx`

Client component — Dialog:
- List of all boards in the workspace (excluding current board)
- Select target board
- Confirm: "Move this post to '{board name}'?"
- Submit → PATCH `/api/posts/[postId]/move`
- On success: redirect to new post URL in target board

---

## Post URL Resolution

Post URL format: `/{ws-slug}/b/{board-slug}/p/{postId}-{readable-slug}`

Example: `/acme/b/feature-requests/p/clx1234abcd-dark-mode-support`

**URL resolution in page:**
```ts
// params.postId = "clx1234abcd-dark-mode-support"
const id = params.postId.split('-')[0]   // "clx1234abcd" (cuid2 has no hyphens)
const post = await getPostById(id)
if (!post) notFound()

// Canonical check: ensure board slug matches current post's board
if (post.board.slug !== params['board-slug']) {
  redirect(`/${params['ws-slug']}/b/${post.board.slug}/p/${params.postId}`)
}
```

---

## Trending Sort Algorithm

```
score = vote_count / (hours_since_posted + 2) ^ 1.5
```

- Posts with recent votes score higher than old posts with same vote count
- Computed in SQL using `EXTRACT(EPOCH FROM (now() - created_at)) / 3600` for hours
- Pinned posts bypass this sort and are always shown first

---

## Moderation Flow

```
workspace.moderation_mode = 'off'
  → post.is_approved = true immediately
  → post is public instantly

workspace.moderation_mode = 'auto'
  → check post title/description against workspace.spam_keywords[]
  → if clean: is_approved = true, public instantly
  → if flagged: is_approved = false, pending review queue

workspace.moderation_mode = 'manual'
  → post.is_approved = false always
  → admin sees "Pending Approval" section in board admin view
  → admin clicks Approve → PATCH /approve
  → is_approved = true, SEND_NEW_POST_ALERT enqueued
```

---

## Background Jobs

### `SEND_NEW_POST_ALERT`

**Trigger:** `createPost()` (when is_approved = true) or `approvePost()` (manual moderation)

**Payload:**
```ts
{
  postId: string
  postTitle: string
  postUrl: string
  authorName: string
  boardName: string
  workspaceName: string
  adminEmails: string[]   // all Owner + Admin emails in the workspace
}
```

**Handler:** `lib/worker/handlers/send-new-post-alert.ts`
- Sends one email to all admin/owner emails
- Subject: `"New post on {boardName}: {postTitle}"`
- Body: post title, author, board name, link to post

---

## User Flows

### Submit a Post (Signed-in User)

```
1. User visits public board /{ws-slug}/b/{board-slug}
2. Clicks "Submit Feedback"
3. SubmitPostModal opens
4. Types title → client checks for similar existing posts (debounced search)
5. If similar found: warning shown — user can proceed anyway
6. Fills description (optional), category (optional)
7. Submit → POST /api/boards/[boardId]/posts
8. If moderation_mode = 'off' or 'auto' (clean): post appears in list, toast "Submitted!"
9. If moderation_mode = 'manual' or 'auto' (flagged): toast "Pending review"
```

### Submit a Post (Guest)

```
1–4. Same as above
5. Guest fields shown: Name (required) + Email (required)
6. Submit → POST /api/boards/[boardId]/posts
7. post.author_id = null, post.author_email + author_name set
8. Same moderation flow as above
```

### Admin Changes Post Status

```
1. Admin views post detail page
2. AdminPostToolbar visible
3. Opens StatusSelect dropdown — selects new status (e.g. "Planned")
4. PATCH /api/posts/[postId]/status { status: 'planned', note: optional }
5. post_status_changes row inserted
6. Post status badge updates
7. SEND_STATUS_CHANGE_EMAIL enqueued (Feature 11) — all voters notified
```

### Admin Merges Duplicate Posts

```
1. Admin views source post
2. Clicks "Merge" in AdminPostToolbar
3. MergePostModal opens — searches for target post by title
4. Selects target post
5. Confirm: "All votes will be transferred"
6. POST /api/posts/[postId]/merge { targetPostId }
7. Source post: merged_into_id set, is_locked = true, status = 'closed'
8. Target post: vote_count updated (source votes transferred)
9. Source post shows "Merged into: {target title}" badge
10. Source post removed from active board list
```

### Admin Moves Post to Another Board

```
1. Admin views post detail
2. Clicks "Move" in AdminPostToolbar
3. MovePostModal opens — shows workspace boards list
4. Selects target board
5. PATCH /api/posts/[postId]/move { boardId }
6. post.board_id updated
7. Redirect to new post URL: /{ws-slug}/b/{new-board-slug}/p/{postId}-{slug}
```

### Author Edits Own Post

```
1. Author views their post detail page
2. AuthorActions component shows "Edit" button
3. Click Edit → title + description become inline editable fields
4. Save → PATCH /api/posts/[postId] { title, description }
5. Post updates in place
6. Toast: "Post updated"
```

### Author Deletes Own Post

```
1. Author views their post (vote_count = 0)
2. AuthorActions shows "Delete" button
3. AlertDialog: "Delete this post? This cannot be undone."
4. Confirm → DELETE /api/posts/[postId]
5. Redirect to board page
6. Toast: "Post deleted"
7. If vote_count > 0: Delete button is hidden (authors cannot delete voted posts)
```

---

## API Reference

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/boards/[boardId]/posts` | Public / Member | List posts with sort + filters |
| POST | `/api/boards/[boardId]/posts` | Optional session | Submit a post |
| GET | `/api/posts/[postId]` | Public / Member | Get post detail |
| PATCH | `/api/posts/[postId]` | Author / Admin+ | Update title, description, category |
| DELETE | `/api/posts/[postId]` | Author (0 votes) / Admin+ | Delete post |
| PATCH | `/api/posts/[postId]/pin` | Admin+ | Toggle pin |
| PATCH | `/api/posts/[postId]/status` | Admin+ | Change status |
| PATCH | `/api/posts/[postId]/move` | Admin+ | Move to another board |
| POST | `/api/posts/[postId]/merge` | Admin+ | Merge into another post |
| PATCH | `/api/posts/[postId]/approve` | Admin+ | Approve pending post |

---

## Validation Rules

| Field | Rules |
|---|---|
| `title` | Required, 5–150 chars |
| `description` | Optional, max 5000 chars |
| `authorEmail` | Required for guests, valid email format |
| `authorName` | Required for guests, 1–100 chars |
| `status` | Must be valid PostStatus enum value |
| `targetPostId` (merge) | Must belong to same workspace, must not be source, must not be already merged |
| `boardId` (move) | Must belong to same workspace, must not be same board |

---

## Edge Cases

| Case | Handling |
|---|---|
| Post submitted to archived board | API returns 422 — "This board is no longer accepting submissions" |
| Guest submits with an email that matches an existing user | Post is saved with `author_email` — not linked to user account (intentional, no magic link on submit) |
| Admin tries to merge a post that is already merged | API returns 409 — "This post has already been merged" |
| Post moved to another board — old URL visited | Post detail page detects board slug mismatch → redirect to new URL |
| Author tries to delete post with votes | Delete button hidden in UI; API returns 403 if attempted directly |
| Post approved via moderation after duplicate was already approved | Both posts remain — admin should merge if duplicates |
| Spam keyword added after posts already approved | Existing posts are not retroactively flagged — keyword filter only applies on creation |
| Two admins change same post status simultaneously | Last write wins — no locking needed for status change (it's idempotent in effect) |
| Post status changed to same status | Service layer detects no change → no-op, no status_change row inserted, no email sent |
| Board deleted while post detail page is open | Next API call returns 404 — page shows "Post not found" |
| `vote_count` gets out of sync | `vote_count` is denormalised for performance. A `GREATEST(vote_count - 1, 0)` guard is used on remove. Periodic reconciliation can be added post-MVP |

---

## Acceptance Criteria

- [ ] Signed-in user can submit a post with title and optional description
- [ ] Guest user can submit a post with name and email
- [ ] Post appears in board list immediately (moderation_mode = off)
- [ ] Post shows "Pending review" state when moderation_mode = manual
- [ ] Duplicate title warning shown before submission (client-side check)
- [ ] Board post list defaults to Trending sort
- [ ] Post list supports Newest and Top Voted sort options
- [ ] Pinned posts always appear first regardless of sort
- [ ] Post detail page loads at correct URL `/{ws-slug}/b/{board-slug}/p/{postId}-{slug}`
- [ ] Post moved to another board redirects to new URL
- [ ] Post detail shows author name, date, status badge, vote count, comment count
- [ ] Admin can pin/unpin a post
- [ ] Admin can change post status — status badge updates
- [ ] Status change creates a `post_status_changes` row
- [ ] Admin can move post to another board
- [ ] Admin can merge post — source votes transfer to target, source is locked
- [ ] Merged post shows "Merged into: {title}" badge
- [ ] Author can edit their own post (title, description)
- [ ] Author can delete their own post only if vote_count = 0
- [ ] Admin can delete any post regardless of vote count
- [ ] Admins receive a new post alert email when post is approved
- [ ] Spam keyword filter blocks/flags posts when moderation_mode = auto

---

## Implementation Notes

- `postId` param in the URL is `{cuid2}-{readable-slug}` — extract ID by splitting on `-` and taking first segment (cuid2 never contains hyphens)
- `vote_count` and `comment_count` are **denormalised counters** on the `posts` table — updated incrementally on each vote/comment action for fast reads. Use `GREATEST(count - 1, 0)` guard to prevent negative values
- Description is stored as plain `text` — no JSON, no HTML. Rich text (Tiptap/ProseMirror) is a post-MVP enhancement
- `author_id` uses `SET NULL` on user deletion — posts from deleted users are preserved with `author_name` and `author_email` as fallback display
- The trending sort is computed in the SQL `ORDER BY` clause using PostgreSQL `EXTRACT` — no materialised view needed at MVP scale
- `post_status_changes` is append-only — never updated or deleted (audit trail)
- Attachments table is created in the migration but no upload endpoint is built — the `PostDetail` component has an `attachments` prop typed as `Attachment[]` with an empty array default
