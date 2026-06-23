# Feature 04 — Feedback Boards

## Overview

Feedback Boards are the core containers for user feedback within a workspace. Each board is a public (or private) space where users can submit posts and vote. A workspace can have up to **10 active boards**. Boards can be reordered, archived, and deleted. Every board gets a public URL: `/{ws-slug}/b/{board-slug}`.

A default **"Feature Requests"** board is created automatically when a workspace is created (handled in Feature 02).

---

## Core Behaviour

- Boards belong to a workspace — no cross-workspace boards
- Each board has a unique slug within its workspace (not platform-wide)
- Board visibility: **Public** (anyone can view and submit) or **Private** (workspace members only)
- Max **10 active (non-archived)** boards per workspace — configurable in `config/platform.ts`
- Boards can be **reordered** via drag-and-drop in the sidebar — order saved to `display_order`
- Boards can be **archived** — archived boards are hidden from public, posts are preserved
- Boards can be **deleted** only if: the board is archived OR it is the only active board being removed leaves at least 0 active boards... actually:
  - A board can be deleted if it is **archived**
  - A board can be deleted if it is **active** and there is **more than 1 active board** remaining after deletion (workspace must always have at least 0 boards but logic prevents accidental wipeout)
  - Wait — re-checking MASTER.md: `canDelete: allowed if board is archived OR activeCount > 1`
  - So: delete is allowed when board is archived, OR when there are more than 1 active boards (so deleting one still leaves at least 1 active)
- Deleting a board hard-deletes all posts, votes, and comments inside it (CASCADE)
- Only **Owner** and **Admin** can create, edit, archive, reorder, or delete boards
- **Members** and public users can only view boards

---

## Dependencies

```
@paralleldrive/cuid2    — generate board IDs
slugify                 — auto-generate slug from board name
```

---

## Environment Variables

No new variables. Uses `DATABASE_URL` and `NEXT_PUBLIC_APP_URL`.

---

## Config

**`config/platform.ts`**

```ts
export const MAX_BOARDS_PER_WORKSPACE = 10

export const RESERVED_BOARD_SLUGS = [
  "settings", "new", "create", "edit", "delete",
  "archive", "reorder", "roadmap", "changelog",
  "notifications", "members", "api",
]
```

---

## Database Schema

### `boards`

```ts
id              text        PK  (cuid2)
slug            text        NOT NULL
name            text        NOT NULL
description     text
workspace_id    text        NOT NULL  → workspaces.id (CASCADE DELETE)
is_public       boolean     NOT NULL  DEFAULT true
is_archived     boolean     NOT NULL  DEFAULT false
display_order   integer     NOT NULL  DEFAULT 0
created_by      text        NOT NULL  → user.id
created_at      timestamp   NOT NULL  DEFAULT now()
updated_at      timestamp   NOT NULL  DEFAULT now()
```

**Indexes:**
- `UNIQUE` on `(workspace_id, slug)` — slug unique within a workspace, not platform-wide
- Index on `workspace_id`
- Index on `(workspace_id, display_order)` — for ordered list queries
- Index on `(workspace_id, is_archived)` — for active board count checks

---

## File Structure

```
app/
├── (workspace)/
│   └── [ws-slug]/
│       └── b/
│           └── [board-slug]/
│               ├── page.tsx                Admin board view (post list)
│               └── settings/
│                   └── page.tsx            Board settings
└── (public)/
│   └── [ws-slug]/
│       └── b/
│           └── [board-slug]/
│               └── page.tsx                Public board view
└── api/
    └── workspaces/
        └── [slug]/
            └── boards/
                ├── route.ts                GET list / POST create
                ├── reorder/
                │   └── route.ts            PATCH reorder
                └── [boardId]/
                    ├── route.ts            GET / PATCH / DELETE
                    └── archive/
                        └── route.ts        PATCH toggle archive

components/
└── boards/
    ├── create-board-modal.tsx              Modal: name, slug, description, visibility
    ├── board-card.tsx                      Dashboard board card (name, post count, status)
    ├── board-settings-form.tsx             Edit name, slug, description, visibility, archive, delete
    └── board-reorder-list.tsx              Drag-and-drop reorder list (admin sidebar)

lib/
└── boards/
    ├── queries.ts                          Read operations
    ├── create.ts                           Create board
    ├── update.ts                           Update board fields
    ├── delete.ts                           Delete board
    └── index.ts                            Re-exports all
```

---

## Implementation Details

### `lib/boards/queries.ts`

```ts
getBoardsForWorkspace(workspaceId, { includeArchived = false })
  → returns boards ordered by display_order ASC
  → if includeArchived = false: WHERE is_archived = false
  → includes post_count (subquery or joined count)

getBoardBySlug(workspaceId, boardSlug)
  → returns single board or null

getActiveBoardCount(workspaceId)
  → returns count of non-archived boards in this workspace
```

---

### `lib/boards/create.ts`

```ts
createBoard(workspaceId, createdBy, { name, slug?, description, isPublic })
  → validates: active board count < MAX_BOARDS_PER_WORKSPACE
  → generates slug if not provided: slugify(name) + uniqueness check within workspace
  → validates slug not reserved (RESERVED_BOARD_SLUGS)
  → validates slug unique within workspace
  → sets display_order = max(existing display_order) + 1
  → inserts board row
  → returns board
```

---

### `lib/boards/update.ts`

```ts
updateBoard(boardId, workspaceId, { name?, slug?, description?, isPublic? })
  → if slug changes: validate not reserved, validate unique within workspace
  → updates fields + updated_at
  → returns updated board

toggleArchive(boardId, workspaceId)
  → if archiving: check canDelete/canArchive — always allowed
  → if unarchiving: check active board count < MAX_BOARDS_PER_WORKSPACE
  → flips is_archived value
  → returns updated board
```

---

### `lib/boards/delete.ts`

```ts
deleteBoard(boardId, workspaceId)
  → fetches board (verify belongs to workspace)
  → checks canDelete:
      canDelete = board.isArchived OR getActiveBoardCount(workspaceId) > 1
  → if !canDelete: throw "Cannot delete the only active board. Archive it first or create another board."
  → hard deletes board row (CASCADE removes all posts, votes, comments)
  → returns void
```

---

### `app/api/workspaces/[slug]/boards/route.ts`

**GET** — List boards
```
Auth: requireWorkspaceMember (for private boards included) or public
Query params: includeArchived=true (admin only)
Returns: board[] ordered by display_order
  - Public request (no session): returns only is_public = true, is_archived = false boards
  - Member request: returns all boards including private + archived
```

**POST** — Create board
```
Auth: requireRole(['owner', 'admin'])
Body: { name, slug?, description?, isPublic? }
Validates:
  - name: required, 2–50 chars
  - slug: optional, 2–50 chars, [a-z0-9-], not reserved, unique in workspace
  - Active board count < MAX_BOARDS_PER_WORKSPACE (returns 422 if at limit)
Returns: 201 + board
```

---

### `app/api/workspaces/[slug]/boards/[boardId]/route.ts`

**GET** — Get board detail
```
Auth: Public (if is_public) or requireWorkspaceMember (if private)
Returns: board + post_count
```

**PATCH** — Update board
```
Auth: requireRole(['owner', 'admin'])
Body: { name?, slug?, description?, isPublic? }
Validates: slug rules if slug changes
Returns: updated board
```

**DELETE** — Delete board
```
Auth: requireRole(['owner', 'admin'])
Validates: canDelete logic (archived OR activeCount > 1)
Returns: 204
```

---

### `app/api/workspaces/[slug]/boards/[boardId]/archive/route.ts`

**PATCH** — Toggle archive status
```
Auth: requireRole(['owner', 'admin'])
Body: { archived: boolean }
Validates: if unarchiving, active count < MAX_BOARDS_PER_WORKSPACE
Returns: updated board
```

---

### `app/api/workspaces/[slug]/boards/reorder/route.ts`

**PATCH** — Reorder boards
```
Auth: requireRole(['owner', 'admin'])
Body: { boardIds: string[] }  — ordered array of board IDs
Validates: all boardIds belong to this workspace
Logic: updates display_order for each board based on array index position
Returns: 200
```

---

### `app/(workspace)/[ws-slug]/b/[board-slug]/page.tsx`

Admin board view:
- Server component
- Fetches board + posts (paginated, sorted by vote_count DESC by default)
- Shows board name, description, visibility badge, archived badge (if archived)
- Shows post list with `<PostCard />` components
- Shows "New Post" button (any logged-in user)
- Admin toolbar actions: Edit Board, Archive/Unarchive, Delete (from settings link)
- Shows "Archived" banner if board is archived
- Filter/sort controls: Trending / Newest / Top Voted / Status filter

---

### `app/(workspace)/[ws-slug]/b/[board-slug]/settings/page.tsx`

Board settings page:
- Server component
- Renders `<BoardSettingsForm />` pre-filled with current board data
- Separate "Danger Zone" section with Archive toggle + Delete button
- Delete triggers AlertDialog: "Type board name to confirm"
- Only accessible to Owner and Admin

---

### `app/(public)/[ws-slug]/b/[board-slug]/page.tsx`

Public board view:
- Server component (SEO-friendly)
- If board `is_public = false` and user is not a workspace member → 404 (not 403, to avoid leaking existence)
- If board `is_archived = true` → show "This board is no longer accepting submissions" banner, still shows existing posts
- Fetches posts sorted by vote_count DESC (default)
- Renders `<PostCard />` with `<VoteButton />` (Feature 06)
- Renders `<SubmitPostModal />` trigger button (Feature 05)
- SEO: `generateMetadata()` returns board name + workspace name in title

---

### `components/boards/create-board-modal.tsx`

- Client component — Dialog
- Fields:
  - Name (text input, required, 2–50 chars)
  - Slug (auto-generated from name, editable, with availability indicator)
  - Description (textarea, optional, max 200 chars)
  - Visibility toggle: Public / Private (default: Public)
- Submit → POST `/api/workspaces/[slug]/boards`
- On success: close modal, refresh board list, navigate to new board
- Shows warning if at MAX_BOARDS_PER_WORKSPACE limit (disables create button)

---

### `components/boards/board-settings-form.tsx`

- Client component
- Same fields as create modal (name, slug, description, visibility)
- Slug change: live availability check with debounce
- Submit → PATCH `/api/workspaces/[slug]/boards/[boardId]`
- If slug changes: redirect to new board settings URL after save
- Separate archive/unarchive button (below form): "Archive Board" / "Unarchive Board"
  - Calls PATCH `/archive` endpoint
  - Unarchive blocked if workspace is at board limit
- Separate delete section:
  - "Delete Board" button → AlertDialog
  - User must type board name to confirm
  - Delete blocked if canDelete = false (shows reason)
  - On success: redirect to `/{ws-slug}`

---

### `components/boards/board-reorder-list.tsx`

- Client component — used inside `<WorkspaceNav />`
- Drag-and-drop list of active boards
- Uses HTML5 drag API or a lightweight DnD library (no heavy deps)
- On drop: PATCH `/api/workspaces/[slug]/boards/reorder` with new ordered array of IDs
- Optimistic update: reorder locally before server confirms
- Only rendered for Owner and Admin roles

---

## Slug Rules

Slugs are **unique within a workspace** (not platform-wide — unlike workspace slugs).

```
- 2 to 50 characters
- Lowercase letters, numbers, hyphens only
- Cannot start or end with a hyphen
- Must be unique within the workspace
- Cannot be a reserved board slug (RESERVED_BOARD_SLUGS)
```

Auto-generation: same slugify + suffix logic as workspace slugs, but scoped to workspace.

---

## Public vs Private Boards

| Behaviour | Public Board | Private Board |
|---|---|---|
| View board + posts | Anyone | Workspace members only |
| Submit a post | Any logged-in user | Workspace members only |
| Vote on posts | Any logged-in user / guest with email | Workspace members only |
| Shown in public roadmap | ✓ | ✗ |
| Indexed by search engines | ✓ | ✗ (noindex header) |
| Shown in workspace nav | Members always see it | Members always see it |

---

## Archived Boards

| Behaviour | Active Board | Archived Board |
|---|---|---|
| Shown in public board list | ✓ | ✗ |
| Shown in workspace nav | ✓ | ✗ (hidden from sidebar by default) |
| Admin can view | ✓ | ✓ (via settings / archived boards list) |
| Accept new post submissions | ✓ | ✗ (submit button hidden) |
| Accept new votes | ✓ | ✗ (vote button disabled) |
| Shown in public roadmap | ✓ | ✗ |
| Existing posts preserved | ✓ | ✓ |
| Counts toward board limit | ✗ | ✗ (archived boards do not count toward MAX_BOARDS) |

---

## User Flows

### Create a Board

```
1. Admin/Owner clicks "New Board" button in workspace nav or dashboard
2. CreateBoardModal opens
3. User fills: name (required), description (optional), visibility (default: Public)
4. Slug auto-generates from name — user can override
5. Submit → POST /api/workspaces/[slug]/boards
6. Server: validates limit, creates board, sets display_order
7. Modal closes, board appears in sidebar nav
8. User is navigated to the new board's admin view
```

### Edit a Board

```
1. Admin/Owner navigates to /{ws-slug}/b/[board-slug]/settings
2. BoardSettingsForm pre-filled
3. User edits name / slug / description / visibility
4. Submit → PATCH /api/workspaces/[slug]/boards/[boardId]
5. If slug changed: redirect to /{ws-slug}/b/[new-slug]/settings
6. Toast: "Board updated"
```

### Archive a Board

```
1. Admin/Owner navigates to board settings
2. Clicks "Archive Board" in Danger Zone
3. Confirm dialog: "Archive this board? It will be hidden from public view."
4. PATCH /archive { archived: true }
5. Board disappears from public view and workspace sidebar
6. Posts are preserved — accessible via admin archived boards list
7. Toast: "Board archived"
```

### Unarchive a Board

```
1. Admin/Owner views archived boards list (in settings or workspace nav with "Show archived")
2. Clicks "Unarchive" on a board
3. If at MAX_BOARDS_PER_WORKSPACE: blocked — "Archive or delete another board first"
4. PATCH /archive { archived: false }
5. Board reappears in sidebar + public view
```

### Delete a Board

```
1. Admin/Owner navigates to board settings
2. Clicks "Delete Board" in Danger Zone
3. If canDelete = false: button is disabled with tooltip explaining why
4. AlertDialog: "Type '{board name}' to confirm deletion"
5. User types name → DELETE button enabled
6. DELETE /api/workspaces/[slug]/boards/[boardId]
7. Server: cascade deletes all posts, votes, comments in board
8. Redirect to /{ws-slug}
9. Toast: "Board deleted"
```

### Reorder Boards

```
1. Admin/Owner drags a board in the sidebar nav
2. Drops it in new position
3. Optimistic reorder applied locally
4. PATCH /reorder { boardIds: [...] }
5. Server updates display_order for all boards
6. Order persists on next page load
```

---

## API Reference

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/workspaces/[slug]/boards` | Public / Member | List boards |
| POST | `/api/workspaces/[slug]/boards` | Admin+ | Create board |
| GET | `/api/workspaces/[slug]/boards/[boardId]` | Public / Member | Get board |
| PATCH | `/api/workspaces/[slug]/boards/[boardId]` | Admin+ | Update board |
| DELETE | `/api/workspaces/[slug]/boards/[boardId]` | Admin+ | Delete board |
| PATCH | `/api/workspaces/[slug]/boards/[boardId]/archive` | Admin+ | Toggle archive |
| PATCH | `/api/workspaces/[slug]/boards/reorder` | Admin+ | Reorder boards |

---

## Validation Rules

| Field | Rules |
|---|---|
| `name` | Required, 2–50 chars |
| `slug` | Required, 2–50 chars, `[a-z0-9-]`, no leading/trailing hyphens, not in RESERVED_BOARD_SLUGS, unique within workspace |
| `description` | Optional, max 200 chars |
| `isPublic` | Boolean, default `true` |
| Board count | Active boards must be < MAX_BOARDS_PER_WORKSPACE (10) at time of creation |
| `boardIds` (reorder) | All IDs must belong to this workspace |

---

## Edge Cases

| Case | Handling |
|---|---|
| Admin tries to create board when at limit (10 active) | API returns 422 — "Board limit reached. Archive or delete a board first." |
| Admin tries to unarchive when at limit | API returns 422 — same message |
| Admin tries to delete the only active board | canDelete = false (activeCount = 1 and not archived) — delete button disabled with tooltip |
| Slug collision within workspace on create | `uniqueSlug()` appends `-1`, `-2` until unique within workspace |
| Board slug changed — old URL still visited | 404 — no redirect (board slug is user-facing, document the change) |
| Public user visits private board URL | Returns 404 (not 403) — do not leak board existence |
| Public user visits archived board URL | Shows board with archived banner — posts readable, submission disabled |
| Two admins create board with same name simultaneously | DB UNIQUE constraint on (workspace_id, slug) catches race — second request gets 409 |
| Reorder payload contains unknown board IDs | API validates all IDs belong to workspace — returns 400 if any are foreign |
| Board deleted while user is viewing it | Next API call returns 404 — page shows "Board not found" |

---

## SEO

For public boards:
- `generateMetadata()` sets `<title>{boardName} — {workspaceName}</title>`
- `<meta name="description">` set to board description or fallback
- `og:title`, `og:description`, `og:url` set for social sharing
- `robots: index, follow` for public boards
- `robots: noindex, nofollow` for private boards (set in layout or page metadata)

---

## Acceptance Criteria

- [ ] Admin can create a board with name, description, and visibility
- [ ] Slug auto-generates from board name and is editable
- [ ] Reserved slugs are blocked
- [ ] Board appears in workspace sidebar immediately after creation
- [ ] Creating an 11th active board returns a clear error
- [ ] Admin can edit board name, slug, description, and visibility
- [ ] Slug change redirects admin to new board settings URL
- [ ] Admin can archive a board — it disappears from public view
- [ ] Archived board still shows posts when admin views it
- [ ] Admin can unarchive a board (unless at limit)
- [ ] Admin can delete an archived board with name-confirmation dialog
- [ ] Admin cannot delete the only active board (button disabled with explanation)
- [ ] Deleting a board removes all its posts, votes, and comments
- [ ] Admin can reorder boards via drag-and-drop in the sidebar
- [ ] Reordered order persists after page reload
- [ ] Public board is accessible at `/{ws-slug}/b/{board-slug}` without login
- [ ] Private board returns 404 for unauthenticated users
- [ ] Archived board shows "no longer accepting submissions" banner to public
- [ ] Board page has correct SEO metadata (title, description, og tags)
- [ ] Board post count is shown on the dashboard board card

---

## Implementation Notes

- `display_order` is set to `MAX(display_order) + 1` on creation — gaps are fine, ordering by value is stable
- The reorder endpoint receives the full ordered array and bulk-updates all `display_order` values — simpler than swap logic
- Archived boards do **not** count toward `MAX_BOARDS_PER_WORKSPACE` — the limit applies to active (non-archived) boards only
- `canDelete` is computed in the service layer, not in the API — keeps business logic out of the route handler
- The public board view and admin board view are **separate route groups** — `(public)` and `(workspace)` — intentionally, to allow different layouts, auth middleware, and metadata
- `updated_at` must be manually set on every `UPDATE` — no DB trigger
- Board slugs are scoped to workspace — two workspaces can have a board with the same slug without conflict
