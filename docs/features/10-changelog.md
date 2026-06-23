# Feature 10 — Changelog

## Overview

The Changelog lets admins announce shipped work in a structured, public-facing feed. Each entry has a title, a markdown body, a label (e.g. "New Feature"), and an optional list of linked posts. When an entry is published, every voter of every linked post is notified by email. Unpublished drafts are only visible to admins. The changelog is publicly accessible at `/{ws-slug}/changelog` and also available as an RSS feed for subscribers. Workspace owners can toggle the changelog to private.

---

## Core Behaviour

- Only Owner/Admin can create, edit, publish, unpublish, and delete changelog entries
- Entries can be saved as **drafts** before publishing
- Publishing an entry:
  - Sets `is_published = true` and `published_at = now()`
  - Enqueues `SEND_CHANGELOG_EMAIL` for every voter of every linked post
- Unpublishing reverts to draft — no emails are re-sent
- Re-publishing after an edit does **not** re-send emails (voters are only notified once per entry)
- Each entry can be linked to zero or more posts (`changelog_posts` join table)
- Linked posts must belong to the same workspace
- An entry can be linked to posts from any board (public or private)
- Labels: `new_feature | improvement | bug_fix | security | deprecation`
- Body is stored as **Markdown** — rendered as HTML on the public page
- Entries on public changelog ordered by `published_at DESC`
- Drafts shown only to admins in the admin changelog list
- Changelog visibility:
  - `workspace.changelog_public = true` → anyone can view
  - `workspace.changelog_public = false` → 404 for non-members
- RSS feed at `/{ws-slug}/changelog/feed.xml` — includes published entries only

---

## Dependencies

```
marked          — Markdown → HTML rendering (server-side, safe)
dompurify       — sanitise rendered HTML (XSS prevention)
pg-boss         — enqueue SEND_CHANGELOG_EMAIL jobs
nodemailer      — deliver changelog emails
```

> **Note:** `marked` + `dompurify` run server-side in the API/page layer. The client only receives sanitised HTML — never raw markdown directly rendered.

---

## Environment Variables

No new variables beyond Feature 01.

---

## Database Schema

### `changelog_entries`

```ts
id              text          PK  (cuid2)
workspace_id    text          NOT NULL  → workspaces.id (CASCADE DELETE)
title           text          NOT NULL
body            text          NOT NULL  DEFAULT ''   -- raw Markdown
label           text          NOT NULL  DEFAULT 'new_feature'
                              -- 'new_feature' | 'improvement' | 'bug_fix'
                              -- 'security' | 'deprecation'
is_published    boolean       NOT NULL  DEFAULT false
published_at    timestamp               -- set when first published
notified_at     timestamp               -- set after emails sent (prevents re-notify on re-publish)
created_by      text          NOT NULL  → user.id
created_at      timestamp     NOT NULL  DEFAULT now()
updated_at      timestamp     NOT NULL  DEFAULT now()
```

**Indexes:**
- Index on `workspace_id`
- Index on `(workspace_id, is_published, published_at DESC)` — public changelog list
- Index on `created_by`

---

### `changelog_posts`

```ts
changelog_entry_id    text    NOT NULL  → changelog_entries.id (CASCADE DELETE)
post_id               text    NOT NULL  → posts.id (CASCADE DELETE)
```

**Constraints:**
- `PRIMARY KEY (changelog_entry_id, post_id)` — composite PK prevents duplicate links

**Indexes:**
- Index on `post_id` — find all changelog entries that reference a post

---

## Label Reference

| Label | Slug | Badge Colour | Display Name |
|---|---|---|---|
| New Feature | `new_feature` | Indigo | New Feature |
| Improvement | `improvement` | Blue | Improvement |
| Bug Fix | `bug_fix` | Orange | Bug Fix |
| Security | `security` | Red | Security |
| Deprecation | `deprecation` | Yellow | Deprecation |

---

## File Structure

```
app/
├── (workspace)/
│   └── [ws-slug]/
│       └── changelog/
│           ├── page.tsx                    Admin changelog list (drafts + published)
│           ├── new/
│           │   └── page.tsx                Create new entry
│           └── [entryId]/
│               └── edit/
│                   └── page.tsx            Edit existing entry
├── (public)/
│   └── [ws-slug]/
│       └── changelog/
│           ├── page.tsx                    Public changelog feed
│           ├── [entryId]/
│           │   └── page.tsx                Single changelog entry detail
│           └── feed.xml/
│               └── route.ts               RSS feed
└── api/
    └── workspaces/
        └── [slug]/
            └── changelog/
                ├── route.ts                GET list / POST create
                └── [entryId]/
                    ├── route.ts            GET / PATCH / DELETE
                    └── publish/
                        └── route.ts        POST publish / DELETE unpublish

components/
└── changelog/
    ├── changelog-entry-card.tsx            Entry card for public feed list
    ├── changelog-entry-detail.tsx          Full entry (title, label, body, linked posts)
    ├── changelog-editor.tsx                Admin create/edit form
    ├── changelog-label-badge.tsx           Coloured label pill
    ├── linked-posts-selector.tsx           Search + select posts to link to entry
    ├── changelog-admin-card.tsx            Admin list card (draft/published state + actions)
    └── changelog-rss-link.tsx              RSS subscribe button/link in navbar

lib/
└── changelog/
    ├── queries.ts
    ├── create.ts
    ├── update.ts
    ├── delete.ts
    ├── publish.ts
    └── index.ts

lib/worker/handlers/
└── send-changelog-email.ts

lib/email/templates/
└── changelog.ts
```

---

## Implementation Details

### `lib/changelog/queries.ts`

```ts
listEntries(workspaceId, { includeDrafts = false, page = 1, limit = 20 })
  → if includeDrafts = true: return all entries
  → if includeDrafts = false: WHERE is_published = true
  → ordered by published_at DESC (published), updated_at DESC (drafts at top for admin)
  → includes linked post count per entry
  → returns { entries: ChangelogEntry[], total, hasMore }

getEntryById(entryId, workspaceId)
  → returns entry with linked posts array
  → linked posts: { id, title, slug, boardSlug, voteCount, status }

getEntriesForPost(postId)
  → returns all published changelog entries linked to a post
  → used on post detail page to show "Shipped in: v2.1 release"
```

---

### `lib/changelog/create.ts`

```ts
createEntry(workspaceId, createdBy, { title, body, label, postIds? })
  → validates: title 1–200 chars
  → validates: label is valid enum value
  → validates: postIds (if provided) all belong to same workspace
  → inserts changelog_entries row (is_published = false)
  → if postIds: inserts changelog_posts rows
  → returns entry
```

---

### `lib/changelog/update.ts`

```ts
updateEntry(entryId, workspaceId, { title?, body?, label?, postIds? })
  → verifies entry belongs to workspace
  → updates entry fields + updated_at
  → if postIds provided:
      → DELETE FROM changelog_posts WHERE changelog_entry_id = entryId
      → INSERT new changelog_posts rows
      → (full replacement of linked posts list)
  → returns updated entry
```

---

### `lib/changelog/publish.ts`

```ts
publishEntry(entryId, workspaceId)
  → fetch entry
  → if already published: return entry (idempotent)
  → UPDATE changelog_entries SET
      is_published = true,
      published_at = COALESCE(published_at, now())  -- preserve original publish date on re-publish
    WHERE id = entryId

  → if notified_at IS NULL:  -- only notify once, ever
      → fetch linked post IDs from changelog_posts
      → for each post:
          → fetch all voters (user_id + user_email)
          → for each voter with valid email:
              enqueue SEND_CHANGELOG_EMAIL job
      → UPDATE changelog_entries SET notified_at = now()
        ⚠ Note: notified_at is set after enqueue, not after delivery. If SMTP fails
        for all retries, voters are marked as notified but received no email. Re-publishing
        the entry will NOT trigger another round (notified_at already set). This is a
        known limitation — the correct fix is a post-MVP "re-notify failed voters" action.

  → returns updated entry

unpublishEntry(entryId, workspaceId)
  → if not published: return entry (idempotent)
  → UPDATE changelog_entries SET is_published = false
  → does NOT clear published_at or notified_at
  → no emails sent
  → returns updated entry
```

---

### `lib/changelog/delete.ts`

```ts
deleteEntry(entryId, workspaceId)
  → verifies entry belongs to workspace
  → CASCADE: changelog_posts rows deleted automatically
  → DELETE FROM changelog_entries WHERE id = entryId
  → returns void
```

---

### `app/api/workspaces/[slug]/changelog/route.ts`

**GET** — List changelog entries
```
Auth: requireWorkspaceMember
Query: includeDrafts=true (always true for admin view), page, limit
Returns: { entries: ChangelogEntry[], total, hasMore }
  Each entry: id, title, label, isPublished, publishedAt, linkedPostCount, createdAt
```

**POST** — Create entry
```
Auth: requireRole(['owner', 'admin'])
Body: {
  title: string
  body: string
  label: ChangelogLabel
  postIds?: string[]
}
Validates:
  - title: required, 1–200 chars
  - body: required, min 1 char (can be empty string for draft with no body yet — allow)
  - label: must be valid enum value
  - postIds: all must belong to same workspace
Returns: 201 + entry
```

---

### `app/api/workspaces/[slug]/changelog/[entryId]/route.ts`

**GET** — Get single entry
```
Auth: requireWorkspaceMember (admin) or public (if published + changelog_public)
Returns: entry + linked posts + rendered HTML body
```

**PATCH** — Update entry
```
Auth: requireRole(['owner', 'admin'])
Body: { title?, body?, label?, postIds? }
Returns: updated entry
```

**DELETE** — Delete entry
```
Auth: requireRole(['owner', 'admin'])
Returns: 204
```

---

### `app/api/workspaces/[slug]/changelog/[entryId]/publish/route.ts`

**POST** — Publish entry
```
Auth: requireRole(['owner', 'admin'])
Calls: publishEntry(entryId, workspaceId)
Returns: updated entry { is_published: true, published_at, notified_at }
```

**DELETE** — Unpublish entry (revert to draft)
```
Auth: requireRole(['owner', 'admin'])
Calls: unpublishEntry(entryId, workspaceId)
Returns: updated entry { is_published: false }
```

---

### `app/(workspace)/[ws-slug]/changelog/page.tsx`

Admin changelog list:
- Server component
- Fetches all entries (drafts + published) via `listEntries(..., { includeDrafts: true })`
- Renders `<ChangelogAdminCard />` per entry
- Drafts shown at top with "Draft" badge
- "New Entry" button → navigates to `/[ws-slug]/changelog/new`
- Published entries show publish date + linked post count + voter notification status

---

### `app/(workspace)/[ws-slug]/changelog/new/page.tsx`

Create entry page:
- Renders `<ChangelogEditor />` in create mode
- On success: redirect to `/{ws-slug}/changelog`

---

### `app/(workspace)/[ws-slug]/changelog/[entryId]/edit/page.tsx`

Edit entry page:
- Fetches entry by ID
- If not found → 404
- Renders `<ChangelogEditor />` in edit mode pre-filled with entry data
- On success: redirect to `/{ws-slug}/changelog`

---

### `app/(public)/[ws-slug]/changelog/page.tsx`

Public changelog feed:
- Server component
- Checks `workspace.changelog_public` — if false → 404 for non-members
- Fetches published entries only (`includeDrafts = false`)
- Renders `<ChangelogEntryCard />` per entry
- Renders `<ChangelogRssLink />` in page header
- SEO: `generateMetadata()` with workspace name + "Changelog"
- `robots: index` if public, `noindex` if private

---

### `app/(public)/[ws-slug]/changelog/[entryId]/page.tsx`

Single changelog entry detail:
- Server component
- Fetches entry by ID — if not found or not published → 404
- Renders full `<ChangelogEntryDetail />`:
  - Title, label badge, published date
  - Rendered Markdown body (server-side `marked` + `dompurify`)
  - Linked posts list with status badges + vote counts
- SEO: `generateMetadata()` with entry title
- Back link → `/{ws-slug}/changelog`

---

### `app/(public)/[ws-slug]/changelog/feed.xml/route.ts`

RSS feed endpoint:
```
Auth: Public (if changelog_public = true)

Returns: RSS 2.0 XML
Content-Type: application/rss+xml; charset=utf-8

Feed structure:
  <channel>
    <title>{workspaceName} Changelog</title>
    <link>{APP_URL}/{wsSlug}/changelog</link>
    <description>Product updates and release notes for {workspaceName}</description>
    <lastBuildDate>{most recent published_at}</lastBuildDate>

    <item> per published entry:
      <title>{entry.title}</title>
      <link>{APP_URL}/{wsSlug}/changelog/{entryId}</link>
      <description>{plaintext body truncated to 500 chars}</description>
      <pubDate>{published_at in RFC 2822 format}</pubDate>
      <guid>{APP_URL}/{wsSlug}/changelog/{entryId}</guid>
      <category>{label display name}</category>
    </item>
  </channel>

Cache-Control: public, max-age=3600 (1 hour cache)
```

---

### `components/changelog/changelog-editor.tsx`

Client component — full create/edit form:

```
┌─────────────────────────────────────────┐
│ Title                                   │
│ [________________________________]      │
│                                         │
│ Label                                   │
│ [New Feature ▾]                         │
│                                         │
│ Body (Markdown)                         │
│ ┌─────────────────────────────────────┐ │
│ │                                     │ │
│ │  Markdown editor (textarea)         │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│ [Preview] tab switches to rendered view │
│                                         │
│ Linked Posts (optional)                 │
│ [Search posts...]  + <LinkedPost chips> │
│                                         │
│ [Save Draft]         [Publish ▸]        │
└─────────────────────────────────────────┘
```

**Fields:**
- Title (required, 1–200 chars, live char count)
- Label select (required, 5 options with colour preview)
- Body textarea (Markdown — monospace font, line numbers optional)
- Preview tab: renders body as HTML (client-side `marked` preview)
- Linked posts: `<LinkedPostsSelector />`
- Actions:
  - "Save Draft" → POST/PATCH without publishing
  - "Publish" → POST/PATCH then POST to `/publish`
  - If already published: "Update" → PATCH, "Unpublish" → DELETE `/publish`

**Auto-save:** Debounced auto-save to draft every 30 seconds (PATCH if entry exists, POST if new). Shows "Saved" / "Saving…" indicator.

---

### `components/changelog/linked-posts-selector.tsx`

Client component:

**Behaviour:**
- Search input: debounced GET `/api/workspaces/[slug]/boards/*/posts?search=xxx`
- Shows matching posts as selectable items: title + status badge + vote count
- Selected posts shown as chips below search input
- Chip has × to remove
- Max 20 linked posts per entry (soft limit)

---

### `components/changelog/changelog-entry-card.tsx`

Public feed card (used on public changelog list):

```
┌──────────────────────────────────────────────┐
│  [New Feature]   May 15, 2026                │
│                                              │
│  Dark Mode Support                           │  ← links to entry detail
│                                              │
│  We've shipped full dark mode across the     │
│  entire app. Toggle it from your account...  │  ← body truncated to ~200 chars
│                                              │
│  Linked: Dark mode support (+2 more)         │  ← linked post titles
└──────────────────────────────────────────────┘
```

---

### `components/changelog/changelog-admin-card.tsx`

Admin list card (used on admin changelog page):

- Same as public card but adds:
  - "Draft" badge (if not published)
  - "Voters notified" badge (if `notified_at IS NOT NULL`)
  - Edit button → `/{ws-slug}/changelog/[entryId]/edit`
  - Publish/Unpublish toggle button
  - Delete button (AlertDialog confirm)

---

### `components/changelog/changelog-entry-detail.tsx`

Full entry view (public):

- Title
- `<ChangelogLabelBadge />` + published date
- Rendered HTML body (from server-side markdown → HTML)
- "Linked feedback" section:
  - List of linked posts: `[StatusBadge] {title}` → links to post detail
  - Vote counts shown
- Back to changelog link

---

## Markdown Rendering

Body is stored as raw Markdown in the DB. Rendered to HTML server-side:

```ts
import { marked } from "marked"
import DOMPurify from "isomorphic-dompurify"

export function renderMarkdown(markdown: string): string {
  const html = marked(markdown, {
    breaks: true,     // newlines → <br>
    gfm: true,        // GitHub-flavoured Markdown
  })
  return DOMPurify.sanitize(html as string)
}
```

**Allowed Markdown in MVP:**
- Headings (##, ###)
- Bold, italic
- Bullet/numbered lists
- Code blocks (inline + fenced)
- Links
- Blockquotes
- Horizontal rules

**Not supported in MVP:** Images (no file upload), tables (complex rendering), HTML embeds.

---

## Background Jobs

### `SEND_CHANGELOG_EMAIL`

**Trigger:** `publishEntry()` when `notified_at IS NULL` — enqueued once per voter per entry

**Payload:**
```ts
{
  voterEmail: string
  voterName: string
  entryTitle: string
  entryLabel: string            // display name e.g. "New Feature"
  entryUrl: string              // /{ws-slug}/changelog/{entryId}
  entryBodyPreview: string      // first 300 chars of body (plain text, not HTML)
  linkedPostTitle: string       // title of the post they voted on
  workspaceName: string
}
```

**Handler:** `lib/worker/handlers/send-changelog-email.ts`
- Subject: `"[{workspaceName}] {entryLabel}: {entryTitle}"`
- Body:
  - Greeting: "A feature you voted for has shipped!"
  - Linked post title (the one they voted on)
  - Entry title + label badge
  - Body preview
  - "Read the full update →" link to entry
  - "You're receiving this because you voted on '{postTitle}'."

**Volume note:** A post with 200 voters linked to an entry → 200 jobs enqueued. pg-boss processes these with configurable concurrency to respect SMTP rate limits.

---

## Notification Guard: `notified_at`

The `notified_at` column on `changelog_entries` prevents re-sending emails on re-publish:

```
First publish:
  → notified_at IS NULL → emails sent → notified_at = now()

Edit entry + re-publish:
  → notified_at IS NOT NULL → emails NOT re-sent

Unpublish + re-publish:
  → notified_at IS NOT NULL → emails NOT re-sent

New posts linked after first publish:
  → Voters of newly linked posts NOT notified (MVP limitation)
  → Post-MVP: track per-post notification status separately
```

---

## Navbar Integration

Public navbar for changelog pages includes:
```
{WorkspaceName}   Boards ▾   Roadmap   Changelog   [Sign In]
```

- "Changelog" link: `/{ws-slug}/changelog`
- Link hidden if `workspace.changelog_public = false`
- Active state on changelog pages
- RSS icon (`<ChangelogRssLink />`) shown in changelog page header

---

## User Flows

### Admin Creates and Publishes a Changelog Entry

```
1. Admin navigates to /{ws-slug}/changelog
2. Clicks "New Entry"
3. ChangelogEditor opens (blank)
4. Admin fills: title "Dark Mode Support", label "New Feature"
5. Writes markdown body
6. Searches linked posts: types "dark mode" → selects matching post
7. Clicks "Save Draft" → POST /api/workspaces/[slug]/changelog
8. Entry saved as draft (is_published = false)
9. Auto-save triggers every 30s during editing
10. Admin clicks "Publish"
11. PATCH (update) then POST /api/workspaces/[slug]/changelog/[id]/publish
12. Entry is_published = true, published_at = now()
13. 42 voters of linked post → 42 SEND_CHANGELOG_EMAIL jobs enqueued
14. notified_at = now() (guard set)
15. Entry appears on public changelog
```

### Admin Edits a Published Entry

```
1. Admin clicks "Edit" on a published entry
2. ChangelogEditor pre-filled with current data
3. Admin updates body (fixes typo)
4. Clicks "Update"
5. PATCH /api/workspaces/[slug]/changelog/[id]
6. Entry updated — no emails re-sent (notified_at already set)
7. Public changelog reflects new body immediately
```

### Admin Unpublishes an Entry

```
1. Admin clicks "Unpublish" on a published entry
2. DELETE /api/workspaces/[slug]/changelog/[id]/publish
3. is_published = false (published_at and notified_at preserved)
4. Entry disappears from public changelog
5. Entry visible in admin list with "Draft" badge
6. Can be re-published without re-sending emails
```

### Public User Reads Changelog

```
1. Visitor navigates to /{ws-slug}/changelog
2. Published entries shown (newest first)
3. Each card shows: label badge, date, title, body preview, linked posts
4. Visitor clicks entry title → navigates to /{ws-slug}/changelog/[entryId]
5. Full entry shown with rendered Markdown
6. Linked post list shows: status badge, title, link to post
7. Visitor clicks RSS link → subscribes via RSS reader
```

### Voter Receives Changelog Email

```
1. Voter previously voted on "Dark mode support" post
2. Admin publishes changelog entry with that post linked
3. publishEntry() fetches voters → enqueues SEND_CHANGELOG_EMAIL per voter
4. Voter receives email:
   Subject: "[Acme] New Feature: Dark Mode Support"
   Body: "A feature you voted for has shipped!
          You voted on: Dark mode support
          Read the update: [link]"
5. Voter clicks link → lands on /{ws-slug}/changelog/[entryId]
```

### Admin Links Posts to Existing Published Entry

```
1. Admin edits a published entry
2. Adds a new linked post via LinkedPostsSelector
3. Clicks "Update"
4. PATCH saves updated postIds list
5. New voters NOT notified (notified_at already set)
6. Post-MVP: "Notify new voters" button added
```

---

## API Reference

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/workspaces/[slug]/changelog` | Member | List entries (admin: all; public: published) |
| POST | `/api/workspaces/[slug]/changelog` | Admin+ | Create entry (draft) |
| GET | `/api/workspaces/[slug]/changelog/[id]` | Member / Public | Get entry + linked posts |
| PATCH | `/api/workspaces/[slug]/changelog/[id]` | Admin+ | Update entry |
| DELETE | `/api/workspaces/[slug]/changelog/[id]` | Admin+ | Delete entry |
| POST | `/api/workspaces/[slug]/changelog/[id]/publish` | Admin+ | Publish entry + notify voters |
| DELETE | `/api/workspaces/[slug]/changelog/[id]/publish` | Admin+ | Unpublish (revert to draft) |

---

## Validation Rules

| Field | Rules |
|---|---|
| `title` | Required, 1–200 chars |
| `body` | Required (can be empty string for draft), max 50,000 chars |
| `label` | Must be one of: `new_feature`, `improvement`, `bug_fix`, `security`, `deprecation` |
| `postIds` | Optional array; all IDs must belong to same workspace; max 20 items |

---

## Edge Cases

| Case | Handling |
|---|---|
| Entry published with no linked posts | Published successfully — no emails sent |
| Entry published — linked post has 0 voters | No jobs enqueued for that post |
| Same post linked to two different entries | Both entries reference the post; voter receives separate emails for each entry |
| Entry re-published after edit | `notified_at IS NOT NULL` → no emails re-sent |
| Admin links new posts after initial publish | Voters of new posts NOT notified (MVP). `notified_at` already set |
| Changelog private + non-member visits | 404 returned — no indication changelog exists |
| RSS feed visited for private changelog | 404 returned |
| Markdown body contains XSS attempt (`<script>`) | `dompurify.sanitize()` strips dangerous HTML before serving |
| Body is very long (10,000 words) | Stored as `text` — no DB limit. Rendered page may be long — post-MVP: paginate or truncate |
| Post linked to entry is deleted | `CASCADE DELETE` on `changelog_posts.post_id` — link removed automatically; entry unaffected |
| Entry deleted while voter email is in-flight | pg-boss job runs; entry not found → handler logs warning, skips gracefully (no crash) |
| Two admins publish same entry simultaneously | `publishEntry` is idempotent — second call sees `is_published = true` → returns early, no duplicate emails |

---

## Acceptance Criteria

- [ ] Admin can create a changelog entry with title, label, and markdown body
- [ ] Entry is saved as a draft by default
- [ ] Auto-save triggers every 30 seconds during editing
- [ ] Admin can switch between "Write" and "Preview" tabs in the editor
- [ ] Markdown is rendered correctly in preview and on public page
- [ ] XSS attempts in Markdown body are sanitised before display
- [ ] Admin can link posts from the same workspace to an entry
- [ ] Linked posts searchable by title in the selector
- [ ] Admin can publish a draft entry
- [ ] Publishing sends `SEND_CHANGELOG_EMAIL` to all voters of linked posts
- [ ] Voters only notified once — re-publishing does not re-send emails
- [ ] "Voters notified" badge shown on admin card after notification
- [ ] Admin can unpublish a published entry — it returns to draft
- [ ] Admin can edit any entry (draft or published)
- [ ] Admin can delete any entry
- [ ] Published entries appear on public changelog at `/{ws-slug}/changelog`
- [ ] Draft entries NOT visible on public changelog
- [ ] Public changelog ordered by `published_at DESC`
- [ ] Single entry detail page at `/{ws-slug}/changelog/[entryId]`
- [ ] Linked posts shown on entry detail with status badges
- [ ] RSS feed accessible at `/{ws-slug}/changelog/feed.xml`
- [ ] RSS feed includes correct `<item>` per published entry
- [ ] RSS feed returns 404 when changelog is private
- [ ] Changelog link shown/hidden in public navbar based on `changelog_public` setting
- [ ] `/{ws-slug}/changelog` returns 404 when private and visited by non-member
- [ ] Label badge displayed with correct colour on cards and detail pages

---

## Implementation Notes

- `marked` + `isomorphic-dompurify` run on the **server only** — the public page and entry detail page render HTML server-side and send it to the client. This prevents client-side XSS and removes the need for a client-side Markdown library
- `notified_at` is set after jobs are enqueued, not after delivery. If SMTP is down and all pg-boss retries exhaust, `notified_at` is already set — voters cannot be retried by re-publishing. Post-MVP: add a "re-notify failed voters" action that resets `notified_at` after verifying delivery failure
- The auto-save behaviour in `<ChangelogEditor />` uses `useEffect` + `debounce` — fires a PATCH (if entry exists) or POST (if new, creates the draft) every 30 seconds. Entry ID returned from POST is stored in component state for subsequent PATCHes
- `changelog_posts` is fully replaced on every update (`DELETE` + `INSERT`) — simpler than diffing. Since entries rarely have more than 10 linked posts, this is efficient
- The RSS feed is a **Route Handler** (`route.ts`) not a page — it returns raw XML with `Content-Type: application/rss+xml`. Next.js route handlers support custom response headers
- `published_at` is set with `COALESCE(published_at, now())` — this preserves the original publish date if an entry is unpublished and re-published, keeping the feed order stable
- The public changelog page (`/(public)/[ws-slug]/changelog`) is in the `(public)` route group — it uses the same minimal public navbar as boards and roadmap
- `changelog_public` toggle is already on `workspaces` table from Feature 02 — no migration needed
