# Feature 09 — Public Roadmap

## Overview

The Public Roadmap is a shareable, read-only view of a workspace's planned and shipped work. Posts with statuses `planned`, `in_progress`, and `completed` are automatically surfaced here — no manual curation required. The roadmap lives at `/{ws-slug}/roadmap` and is publicly accessible by default (no login required). Workspace owners can toggle it to private. Visitors can vote on roadmap items directly without navigating to the board.

---

## Core Behaviour

- Roadmap URL: `/{ws-slug}/roadmap` (public route group)
- Three columns, fixed: **Planned** | **In Progress** | **Completed**
- Posts are pulled automatically by status — no separate roadmap management:
  - Planned column ← posts with `status = 'planned'`
  - In Progress column ← posts with `status = 'in_progress'`
  - Completed column ← posts with `status = 'completed'`
- Posts with `open`, `under_review`, or `closed` status do **not** appear on the roadmap
- Only `is_approved = true` and `merged_into_id IS NULL` posts shown
- Only posts from **public boards** appear on the public roadmap (private board posts excluded)
- Posts within each column sorted by `vote_count DESC` (highest voted first)
- Pinned posts appear first within their column
- Roadmap visibility:
  - `workspace.roadmap_public = true` → accessible by anyone
  - `workspace.roadmap_public = false` → returns 404 for non-members (not 403)
- Vote button (`<VoteButton />`) is functional on roadmap post cards
- Each post card links to its full post detail page
- Admin sees all posts including those from private boards on the admin roadmap view
- No login required to view (when roadmap is public)
- SEO: fully server-side rendered with `generateMetadata()`

---

## Dependencies

```
No new dependencies — uses existing post queries, vote button, and status logic from Features 05, 06, 08.
```

---

## Environment Variables

No new variables beyond Feature 01.

---

## Database

No new tables. Uses existing `posts`, `boards`, `votes`, `workspaces` tables.

**Query shape:** `listPostsForRoadmap(workspaceId, { isAdmin, userId? })`

---

## File Structure

```
app/
├── (public)/
│   └── [ws-slug]/
│       └── roadmap/
│           └── page.tsx                    Public roadmap page
├── (workspace)/
│   └── [ws-slug]/
│       └── roadmap/
│           └── page.tsx                    Admin roadmap view (same data, private boards included)
└── api/
    └── workspaces/
        └── [slug]/
            └── roadmap/
                └── route.ts                GET roadmap posts (grouped by status)

components/
└── roadmap/
    ├── roadmap-board.tsx                   Three-column kanban layout
    ├── roadmap-column.tsx                  Single status column (header + post list)
    ├── roadmap-post-card.tsx               Post card variant for roadmap (compact)
    └── roadmap-empty-state.tsx             Empty column placeholder

lib/
└── roadmap/
    ├── queries.ts                          listPostsForRoadmap()
    └── index.ts
```

---

## Implementation Details

### `lib/roadmap/queries.ts`

```ts
listPostsForRoadmap(workspaceId, {
  isAdmin = false,
  userId?,
})
  → fetches posts WHERE:
      workspace_id = workspaceId
      AND status IN ('planned', 'in_progress', 'completed')
      AND is_approved = true
      AND merged_into_id IS NULL
      AND (isAdmin ? true : boards.is_public = true)   -- exclude private board posts for public view
  → joined with boards (for board name + slug)
  → LEFT JOIN votes (for hasVoted flag if userId provided)
  → ordered per column: is_pinned DESC, vote_count DESC
  → returns grouped structure:
    {
      planned:    RoadmapPost[]
      in_progress: RoadmapPost[]
      completed:  RoadmapPost[]
    }

RoadmapPost:
  id, slug, title, voteCount, commentCount,
  boardName, boardSlug,
  isPinned, hasVoted,
  createdAt, updatedAt
```

---

### `app/api/workspaces/[slug]/roadmap/route.ts`

**GET** — Fetch roadmap posts
```
Auth: Public (if roadmap_public = true) or requireWorkspaceMember

Query params:
  (none in MVP — all three columns returned in one response)

Logic:
  → fetch workspace by slug
  → if !workspace: 404
  → check roadmap visibility:
      if workspace.roadmap_public = false:
        → check session → if not member → 404
  → determine isAdmin from session + workspace_members
  → call listPostsForRoadmap(workspace.id, { isAdmin, userId: session?.user.id })

Returns:
  {
    planned:     RoadmapPost[]
    in_progress: RoadmapPost[]
    completed:   RoadmapPost[]
    workspaceName: string
    workspaceSlug: string
  }
```

---

### `app/(public)/[ws-slug]/roadmap/page.tsx`

Server component:
```
1. Fetch workspace by slug
2. If not found → 404
3. If workspace.roadmap_public = false:
     → check session
     → if not workspace member → 404 (not 403 — do not leak existence)
4. Call listPostsForRoadmap(workspace.id, { isAdmin: false, userId: session?.user.id })
5. Render <RoadmapBoard /> with grouped posts
6. generateMetadata(): title = "{workspaceName} Roadmap"
```

---

### `app/(workspace)/[ws-slug]/roadmap/page.tsx`

Admin roadmap view (inside workspace layout):
```
Same as public view but:
  → isAdmin = true (shows posts from private boards too)
  → Shows "Admin View" indicator banner
  → Shows post count per column including private board posts
  → Links to admin board view (/{ws-slug}/b/{boardSlug}) not public board
```

---

### `components/roadmap/roadmap-board.tsx`

Client component — top-level roadmap layout:

```
┌──────────────────────────────────────────────────────────┐
│  {WorkspaceName} Roadmap                                  │
│  "See what we're building"                                │
├──────────────────┬──────────────────┬────────────────────┤
│    PLANNED       │   IN PROGRESS    │     COMPLETED      │
│    {n} items     │    {n} items     │     {n} items      │
│                  │                  │                    │
│  ┌────────────┐  │  ┌────────────┐  │  ┌──────────────┐  │
│  │ Post card  │  │  │ Post card  │  │  │  Post card   │  │
│  └────────────┘  │  └────────────┘  │  └──────────────┘  │
│  ┌────────────┐  │                  │  ┌──────────────┐  │
│  │ Post card  │  │                  │  │  Post card   │  │
│  └────────────┘  │                  │  └──────────────┘  │
└──────────────────┴──────────────────┴────────────────────┘
```

**Props:**
```ts
{
  planned: RoadmapPost[]
  inProgress: RoadmapPost[]
  completed: RoadmapPost[]
  workspaceSlug: string
  boardSlugs: Record<string, string>   // boardId → boardSlug for link generation
}
```

**Responsive behaviour:**
- Desktop (≥1024px): three columns side by side
- Tablet (768–1023px): two columns (Planned + In Progress), Completed below
- Mobile (<768px): single column, stacked vertically with section headers

---

### `components/roadmap/roadmap-column.tsx`

```ts
Props:
{
  title: 'Planned' | 'In Progress' | 'Completed'
  posts: RoadmapPost[]
  workspaceSlug: string
  colourScheme: { header: string, badge: string }
}
```

**Renders:**
- Column header: status title + item count badge (colour matches status)
- List of `<RoadmapPostCard />` components
- If posts.length = 0: renders `<RoadmapEmptyState />`
- "Show more" button if posts.length > 10 (loads next 10 inline — no page navigation)

**Column colour schemes:**
```
Planned:     header bg = blue-50,    badge = blue-600
In Progress: header bg = purple-50,  badge = purple-600
Completed:   header bg = green-50,   badge = green-600
```

---

### `components/roadmap/roadmap-post-card.tsx`

Compact post card variant for roadmap columns:

```
┌──────────────────────────────────────┐
│  ▲                                   │
│  42   Dark mode support              │  ← title links to post detail
│       ● UI/UX    💬 12               │  ← category chip + comment count
│       Feature Requests               │  ← board name (links to board)
└──────────────────────────────────────┘
```

**Props:**
```ts
{
  post: RoadmapPost
  workspaceSlug: string
  boardSlug: string
}
```

**Elements:**
- `<VoteButton />` (left, compact variant — shows count, handles optimistic update)
- Post title — links to `/{ws-slug}/b/{boardSlug}/p/{postId}-{slug}`
- Category chip (`<CategoryChip />`) — if category assigned
- Comment count with icon
- Board name — links to `/{ws-slug}/b/{boardSlug}` (public board URL)
- Pin indicator (⭐ or pin icon) if `isPinned = true`

**Interactions:**
- Title click → navigate to post detail
- Vote button → same behaviour as on board page (Features 06)
- Board name click → navigate to public board

---

### `components/roadmap/roadmap-empty-state.tsx`

Rendered inside an empty column:

```
Planned:     "Nothing planned yet. Submit ideas on the feedback board."
In Progress: "Nothing in progress right now."
Completed:   "Nothing shipped yet. Check back soon."
```

Each message includes a subtle illustration or icon. No CTA button (roadmap is read-only).

---

## Roadmap Visibility Toggle

Controlled by `workspace.roadmap_public` (boolean, default `true`).

**Settings location:** `/{ws-slug}/settings/general` — already has this field from Feature 02.

**UI in settings:**
```
Public Roadmap
[Toggle switch]  Show your roadmap at /{ws-slug}/roadmap
"Anyone with the link can view your planned and completed work."
```

**Behaviour when private:**
- `/{ws-slug}/roadmap` returns 404 for non-members (no indication roadmap exists)
- Workspace members can still view at `/{ws-slug}/roadmap` (member check in layout)
- Admin roadmap at `/{ws-slug}/roadmap` (workspace route group) always accessible

---

## SEO

**Public roadmap page:**
```ts
generateMetadata({ params }) {
  return {
    title: `${workspaceName} Roadmap`,
    description: `See what ${workspaceName} is building — planned features, work in progress, and recently shipped updates.`,
    openGraph: {
      title: `${workspaceName} Roadmap`,
      description: '...',
      url: `${APP_URL}/${wsSlug}/roadmap`,
    },
    robots: workspace.roadmap_public ? 'index, follow' : 'noindex, nofollow',
  }
}
```

---

## Navbar Integration

The workspace public navbar (shown on public board, roadmap, and changelog pages) should include a **Roadmap** link when `workspace.roadmap_public = true`:

```
{WorkspaceName}   Boards ▾   Roadmap   Changelog   [Sign In]
```

- "Roadmap" link: `/{ws-slug}/roadmap`
- Link hidden from nav if `workspace.roadmap_public = false`
- Active state applied when on the roadmap page

---

## User Flows

### Public Visitor Views Roadmap

```
1. Visitor navigates to /{ws-slug}/roadmap
2. Server fetches workspace — validates roadmap_public = true
3. listPostsForRoadmap called — isAdmin = false, userId = null (no session)
4. Three columns rendered server-side
5. Page loads instantly (SSR — no loading spinner)
6. Visitor sees: 4 planned items, 2 in-progress, 12 completed
7. All vote buttons show counts — clicking opens GuestVoteDialog (Feature 06)
8. Clicking a post title navigates to post detail page
```

### Signed-in User Votes on Roadmap Item

```
1. User visits /{ws-slug}/roadmap
2. VoteButton rendered with hasVoted = true/false (from server-rendered userId JOIN)
3. User clicks VoteButton on a planned post
4. Optimistic: count +1, button fills
5. POST /api/posts/[postId]/vote
6. Success: state confirmed
7. User's vote now counted — affects post sort order on next full page load
```

### Admin Views Admin Roadmap

```
1. Admin navigates to /{ws-slug}/roadmap (workspace route group)
2. Page fetched with isAdmin = true
3. Private board posts included in columns
4. "Admin View" banner shown at top
5. Post cards link to admin board view (not public board)
6. Vote counts accurate including private board posts
```

### Owner Disables Public Roadmap

```
1. Owner goes to /{ws-slug}/settings/general
2. Toggles "Public Roadmap" switch OFF
3. PATCH /api/workspaces/[slug] { roadmapPublic: false }
4. workspace.roadmap_public = false
5. /{ws-slug}/roadmap now returns 404 for non-members
6. Roadmap link disappears from public navbar
7. workspace.roadmap_public field was in Feature 02 — no new API changes needed
```

### Admin Promotes a Post to Roadmap

```
1. A post on a board currently has status = 'open'
2. Admin changes status to 'planned' (via AdminPostToolbar, Feature 08)
3. status = 'planned' → post automatically appears in Roadmap Planned column
4. No additional action needed — roadmap is driven by status
5. All post voters receive SEND_STATUS_CHANGE_EMAIL
```

### Post Moves Across Roadmap Columns

```
1. Admin changes a post from 'planned' → 'in_progress'
2. Post disappears from Planned column
3. Post appears in In Progress column
4. All voters notified (SEND_STATUS_CHANGE_EMAIL)
5. On next full roadmap page load: columns reflect new positions
```

---

## API Reference

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/workspaces/[slug]/roadmap` | Public / Member | Get posts grouped by roadmap status |

---

## Validation Rules

No user input on the roadmap page — it is read-only. The only write action is voting (handled by Feature 06 endpoints).

---

## Edge Cases

| Case | Handling |
|---|---|
| Workspace has no posts with roadmap statuses | All three columns show `<RoadmapEmptyState />` |
| Roadmap private + non-member visits | Returns 404 — no indication the roadmap exists |
| Roadmap private + member visits | Page renders normally (member check via session) |
| Post moved from public board to private board | `listPostsForRoadmap` with `isAdmin = false` excludes it — it disappears from public roadmap |
| Post pinned on a board — does it pin on roadmap? | Yes — `is_pinned = true` posts shown first within their column |
| A column has 50+ posts | "Show more" button loads next 10 inline — avoids infinitely tall columns on first load |
| Post status changed to `completed` — does it move to Completed column? | Yes — immediately on next roadmap fetch |
| Completed column grows very large over time | MVP: no archiving or truncation. Show most recent 10, "Show more" for the rest. Post-MVP: filter by date range. |
| User votes on roadmap item — does sort order update immediately? | Optimistic vote count updates but sort order re-evaluates only on next full page load — acceptable for MVP |
| Two workspaces have same ws-slug (impossible but...) | Workspace slugs are platform-unique (enforced in Feature 02) — no collision possible |
| Roadmap page visited by bot/crawler | SSR + correct robots meta tag — indexable when public, blocked when private |

---

## Acceptance Criteria

- [ ] Public roadmap loads at `/{ws-slug}/roadmap` without login (when public)
- [ ] Three columns rendered: Planned, In Progress, Completed
- [ ] Each column shows correct posts based on status
- [ ] Posts from private boards are excluded from the public roadmap
- [ ] Posts within each column sorted by vote_count DESC
- [ ] Pinned posts appear first within their column
- [ ] Post title links to full post detail page
- [ ] Vote button is functional on roadmap cards (optimistic UI)
- [ ] Guest clicking vote opens GuestVoteDialog
- [ ] Signed-in user's hasVoted state correctly pre-set on page load
- [ ] Board name on card links to the source board
- [ ] Category chip shown on cards when category is assigned
- [ ] Empty column shows appropriate placeholder message
- [ ] Roadmap is responsive: three columns on desktop, stacked on mobile
- [ ] `/{ws-slug}/roadmap` returns 404 when roadmap_public = false and visitor is not a member
- [ ] Workspace member can still view roadmap when it is set to private
- [ ] Owner can toggle roadmap public/private from workspace settings
- [ ] Roadmap link appears/disappears in public navbar based on roadmap_public setting
- [ ] Admin roadmap view includes posts from private boards
- [ ] Page has correct SEO metadata (title, description, og tags)
- [ ] Page is `noindex` when roadmap is private
- [ ] "Show more" loads additional posts when column exceeds 10 items
- [ ] Changing a post status to planned/in_progress/completed adds it to roadmap automatically
- [ ] Changing a post status away from roadmap statuses removes it from roadmap

---

## Implementation Notes

- The roadmap is **purely derived from post statuses** — there is no separate roadmap table, no manual drag-and-drop ordering, no separate publish step. This is intentional for MVP simplicity
- `listPostsForRoadmap` fetches all three columns in a single query (one `WHERE status IN (...)`) and groups in application code — avoids three separate DB round trips
- The public roadmap page is in the `(public)` route group — it does **not** use the workspace layout (sidebar, admin nav). It has its own minimal public navbar (`<PublicNav />`) shared with the public board pages
- Vote counts on roadmap cards update optimistically via client state but do **not** re-sort the columns in real time — re-sort happens on full page reload. This is acceptable UX for MVP
- `roadmap_public` is already a column on the `workspaces` table (added in Feature 02) — no migration needed
- The admin roadmap view (`/(workspace)/[ws-slug]/roadmap`) reuses the same `<RoadmapBoard />` component with an `isAdmin` prop that changes the post links (admin board URL vs public URL) and includes private board posts
- "Show more" within a column is a client-side expand (all posts already fetched in the initial server response) — not a new API call. This works because roadmap posts are typically fewer than 50 per column at MVP scale
