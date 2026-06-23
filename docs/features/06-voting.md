# Feature 06 — Voting

## Overview

Voting is the mechanism by which users signal what matters most. Each post has a vote count that drives the default **Trending** sort and surfaces high-priority feedback to admins. Signed-in users vote by account. Guests vote by email (prompted inline). One vote per person per post — cast and remove are separate actions (not a toggle on a single endpoint). Vote counts are denormalised on the `posts` table for fast reads and updated atomically on each action.

---

## Core Behaviour

- One vote per user (by `user_id`) or per guest (by `email`) per post
- Signed-in users: vote tracked by `user_id`
- Guest users: prompted to enter email before voting — vote tracked by `email`
- Voting on an already-voted post is a no-op (idempotent) — no error
- Removing a vote that doesn't exist is a no-op (idempotent) — no error
- Vote is **blocked** (returns error) when:
  - Post is merged (`merged_into_id IS NOT NULL`)
  - Post is archived board (`board.is_archived = true`)
  - Post is locked (`is_locked = true`)
  - Post is not approved (`is_approved = false`)
- `posts.vote_count` is a denormalised counter — incremented on cast, decremented on remove
  - Uses `GREATEST(vote_count - 1, 0)` guard on remove to prevent negatives
- **Optimistic UI** — vote count updates instantly on the client; reverts on server error
- Admin-only: view the full voter list for any post (who voted, when)
- "My Votes" filter on board page — shows only posts the current user has voted on

---

## Dependencies

```
sonner          — toast notifications for vote errors
```

---

## Environment Variables

No new variables. Uses `DATABASE_URL` and `NEXT_PUBLIC_APP_URL`.

---

## Database Schema

### `votes`

```ts
id            text          PK  (cuid2)
post_id       text          NOT NULL  → posts.id (CASCADE DELETE)
workspace_id  text          NOT NULL  → workspaces.id (CASCADE DELETE)
user_id       text                    → user.id (SET NULL on delete)
user_email    text                    -- set for guest voters; null for signed-in users
user_name     text                    -- display name for guest voters
created_at    timestamp     NOT NULL  DEFAULT now()
```

**Constraints:**
- `UNIQUE (post_id, user_id)` WHERE `user_id IS NOT NULL` — one vote per user per post
- `UNIQUE (post_id, user_email)` WHERE `user_email IS NOT NULL` — one vote per email per post

**Indexes:**
- Index on `post_id`
- Index on `user_id`
- Index on `workspace_id`
- Index on `(post_id, user_id)`
- Index on `(post_id, user_email)`

> **Note:** A signed-in user who also submitted a guest vote with the same email will have two separate records (one by user_id, one by email) if they voted before and after signing in. De-duplication of this edge case is handled at cast time — see `castVote` logic.

---

## File Structure

```
app/
└── api/
    └── posts/
        └── [postId]/
            └── vote/
                ├── route.ts            POST (cast vote) / DELETE (remove vote)
                └── voters/
                    └── route.ts        GET voter list (admin only)

components/
└── voting/
    ├── vote-button.tsx                 Upvote button with count + optimistic UI
    ├── guest-vote-dialog.tsx           Email prompt dialog for guest voters
    └── voter-list-modal.tsx            Admin modal: who voted on this post

lib/
└── voting/
    ├── cast.ts                         Cast vote service
    ├── remove.ts                       Remove vote service
    ├── list.ts                         List voters service
    └── index.ts                        Re-exports
```

---

## Implementation Details

### `lib/voting/cast.ts`

```ts
castVote(postId, workspaceId, { userId?, userEmail?, userName? })
  → one of userId or userEmail must be provided

  Pre-flight checks (in order):
    1. Fetch post — if not found: throw NotFoundError
    2. If post.merged_into_id IS NOT NULL: throw "This post has been merged. Vote on the original instead."
    3. If post.is_locked: throw "This post is locked and no longer accepting votes."
    4. If post.is_approved = false: throw "This post is not yet published."
    5. Fetch board — if board.is_archived: throw "This board is archived."

  If userId provided:
    → Check existing vote: SELECT from votes WHERE post_id = postId AND user_id = userId
    → If exists: return existing vote (idempotent, no error)
    → Also check: SELECT from votes WHERE post_id = postId AND user_email = (user's email)
      → If guest vote found for same email: delete the guest vote first (de-duplicate)

  If userEmail provided (guest):
    → Check existing vote: SELECT from votes WHERE post_id = postId AND user_email = userEmail
    → If exists: return existing vote (idempotent, no error)

  In db.transaction():
    → INSERT INTO votes (id, post_id, workspace_id, user_id, user_email, user_name, created_at)
    → UPDATE posts SET vote_count = vote_count + 1 WHERE id = postId

  → returns new vote
```

---

### `lib/voting/remove.ts`

```ts
removeVote(postId, { userId?, userEmail? })
  → one of userId or userEmail must be provided

  Find vote:
    → If userId: WHERE post_id = postId AND user_id = userId
    → If userEmail: WHERE post_id = postId AND user_email = userEmail
    → If not found: return void (idempotent, no error)

  In db.transaction():
    → DELETE FROM votes WHERE id = vote.id
    → UPDATE posts SET vote_count = GREATEST(vote_count - 1, 0) WHERE id = postId

  → returns void
```

---

### `lib/voting/list.ts`

```ts
listVoters(postId, { page = 1, limit = 50 })
  → SELECT votes joined with user (name, email, avatar)
  → For guest votes: use votes.user_name and votes.user_email directly
  → ORDER BY votes.created_at DESC
  → returns { voters: Voter[], total: number }

getVotedPostIds(workspaceId, { userId?, userEmail? })
  → Returns array of post IDs that this user/email has voted on
  → Used for "My Votes" filter on board page
  → Used for hasVoted flag in post list response
```

---

### `app/api/posts/[postId]/vote/route.ts`

**POST** — Cast a vote
```
Auth: Optional session (guests allowed with email)
Body (if guest): { email: string, name?: string, captchaToken: string }
Body (if signed-in): {} (empty — user identity from session)

Rate limit: 10 guest votes per hour per IP (sliding window, stored in PostgreSQL)

Logic:
  - If session: calls castVote(postId, workspaceId, { userId: session.user.id })
  - If no session:
      → Verify captchaToken with hCaptcha/Turnstile server-side verification
      → On failure: 422 { error: "CAPTCHA verification failed" }
      → On success: calls castVote(postId, workspaceId, { userEmail, userName })

Validates:
  - Guest: email is required, valid format
  - Guest: name optional, max 100 chars
  - Guest: captchaToken required and verified server-side

Returns:
  201 { voteId, voteCount }   — new vote cast
  200 { voteId, voteCount }   — already voted (idempotent)
  422 { error }               — blocked (merged, locked, archived, unapproved) or CAPTCHA fail
  429 { error }               — rate limit exceeded
```

**DELETE** — Remove a vote
```
Auth: Optional session (guests can remove by email)
Query param (if guest): ?email=guest@example.com
  (body on DELETE is stripped by many CDNs/proxies — use query param instead)

Logic:
  - If session: calls removeVote(postId, { userId: session.user.id })
  - If no session:
      → requires query param email
      → verifies a vote row exists for (postId, email) BEFORE deleting
        → if no matching row found: 404 { error: "Vote not found" }
        → prevents any caller from removing another user's vote by guessing their email

Returns:
  204                         — vote removed (or already absent — idempotent)
  404 { error }               — no vote found for this email on this post
```

---

### `app/api/posts/[postId]/vote/voters/route.ts`

**GET** — List voters
```
Auth: requireRole(['owner', 'admin'])
Query: page=1, limit=50
Returns: { voters: Voter[], total: number }
  Voter: { id, name, email, avatar, votedAt, isGuest }
```

---

### `components/voting/vote-button.tsx`

Client component. The core interactive element — appears on every `<PostCard />` and the post detail page.

**Props:**
```ts
{
  postId: string
  initialCount: number
  initialHasVoted: boolean
  isLocked?: boolean        // merged or locked posts
  isArchived?: boolean      // archived board
}
```

**State:**
```ts
count: number         // starts at initialCount
hasVoted: boolean     // starts at initialHasVoted
isPending: boolean    // during API call
```

**Render:**
```
┌───────────────┐
│   ▲  upvote   │   ← triangle/chevron icon, filled if hasVoted
│   {count}     │   ← vote count
└───────────────┘
```
- Background: primary colour if `hasVoted`, grey if not
- Disabled + greyed out if `isLocked` or `isArchived`
- Shows tooltip "Voting is closed" if locked/archived

**Click behaviour (signed-in user):**
```
1. isPending = true
2. Optimistic update: toggle hasVoted, adjust count ± 1
3. API call: POST (if voting) or DELETE (if removing)
4. On success: confirm optimistic state, isPending = false
5. On error: revert hasVoted + count, isPending = false, show toast
```

**Click behaviour (guest — not signed in):**
```
1. Opens <GuestVoteDialog />
2. User enters email (+ optional name)
3. Submit → POST /api/posts/[postId]/vote { email, name }
4. On success: optimistic update applied, dialog closes
5. On error: toast + dialog stays open
```

---

### `components/voting/guest-vote-dialog.tsx`

Client component — Dialog:
- Title: "Vote on this idea"
- Body: "Enter your email to cast your vote. You can remove it at any time."
- Fields:
  - Email (required, validated)
  - Name (optional)
- Submit button: "Cast Vote"
- Already voted state: "You've already voted from this email. Remove your vote?"
  - Shows "Remove Vote" button
- On success: dialog closes, VoteButton optimistic update applied
- "Sign in instead" link → `/signin` (for users who have accounts)

---

### `components/voting/voter-list-modal.tsx`

Client component — Dialog (admin-only):

**Trigger:** "See who voted ({count})" link on post detail page — only visible to Owner/Admin

**Behaviour:**
- Fetches voters on open (lazy — not pre-fetched)
- Shows list: Avatar / Name / Email / "Guest" badge if guest / relative date voted
- Pagination: loads more on scroll or "Load more" button
- Shows total voter count in header
- No actions — read-only (admins cannot remove individual votes via UI)

---

## "My Votes" Filter

Shown on the board page in `<BoardControls />` — only rendered for signed-in users.

**Behaviour:**
```
1. User clicks "My Votes" chip
2. BoardControls adds myVotes=true to URL query params
3. Board page fetches posts with: WHERE post_id IN (SELECT post_id FROM votes WHERE user_id = currentUser)
4. Result shows only posts the current user has voted on
5. Chip shows active state (filled)
6. Clicking again removes filter
```

**Implementation in `listPosts()`:**
```ts
if (filters.myVotes && filters.userId) {
  query.where(
    inArray(posts.id,
      db.select({ id: votes.postId })
        .from(votes)
        .where(eq(votes.userId, filters.userId))
    )
  )
}
```

---

## `hasVoted` Flag in Post List

When listing posts for an authenticated user, the response includes a `hasVoted` boolean per post. This powers the initial state of each `<VoteButton />` without a separate API call per post.

**Implementation in `listPosts()`:**
```ts
// If userId provided, LEFT JOIN votes to get hasVoted
SELECT posts.*, 
  CASE WHEN v.id IS NOT NULL THEN true ELSE false END as has_voted
FROM posts
LEFT JOIN votes v 
  ON v.post_id = posts.id AND v.user_id = :userId
WHERE ...
```

For guests (no session): `hasVoted = false` for all posts. Guest vote state is not persisted client-side in MVP.

---

## Vote Count Consistency

`posts.vote_count` is a denormalised counter. It is maintained atomically inside `db.transaction()` on every cast/remove. To prevent drift:

- `castVote`: `UPDATE posts SET vote_count = vote_count + 1`
- `removeVote`: `UPDATE posts SET vote_count = GREATEST(vote_count - 1, 0)`
- On `mergePosts` (Feature 05): votes are transferred — target post count is **recalculated from actual vote rows** (not incremented) to ensure accuracy after merge:
  ```ts
  UPDATE posts SET vote_count = (
    SELECT COUNT(*) FROM votes WHERE post_id = targetPostId
  ) WHERE id = targetPostId
  ```

---

## Optimistic UI Detail

The `<VoteButton />` uses a local state pattern:

```
User clicks vote:
  1. Immediately: hasVoted = true, count = count + 1, isPending = true
  2. API call fires in background
  3a. API success: isPending = false — state confirmed
  3b. API error:
       - hasVoted = false (reverted), count = count - 1 (reverted)
       - isPending = false
       - sonner toast: error message from API response
       - Examples:
           "This post has been merged."
           "This board is archived."
           "Please enter your email to vote."
```

---

## Guest Vote Persistence

Guest votes are persisted in the database by email. However, on subsequent page visits the guest's vote state **is not restored** in the UI (no cookie or localStorage for vote state in MVP). The vote still counts in the `vote_count` and in the voter list.

Post-MVP: set a cookie `guest_email` after guest vote — use it to restore `hasVoted` state on page load.

---

## User Flows

### Signed-in User Votes

```
1. User views board or post detail
2. Sees VoteButton with count
3. Clicks upvote
4. Optimistic: count +1, button fills with primary colour
5. POST /api/posts/[postId]/vote (empty body — identity from session)
6. Server: castVote with userId
7. Success: state confirmed
8. Failure (e.g. post locked): count reverts, toast shows reason
```

### Signed-in User Removes Vote

```
1. User sees VoteButton in voted state (filled)
2. Clicks upvote again
3. Optimistic: count -1, button returns to grey
4. DELETE /api/posts/[postId]/vote
5. Server: removeVote with userId
6. Success: state confirmed
7. Failure: count reverts, toast shows reason
```

### Guest Votes

```
1. Guest (not signed in) views public board
2. Clicks VoteButton
3. GuestVoteDialog opens: "Enter your email to vote"
4. Guest enters email (+ optional name)
5. Clicks "Cast Vote"
6. POST /api/posts/[postId]/vote { email, name }
7. Server: castVote with userEmail
8. Success: dialog closes, VoteButton optimistic update applied
9. Guest sees voted state for the rest of this browser session
   (state held in React state — not persisted to localStorage in MVP)
```

### Guest Removes Vote

```
1. GuestVoteDialog has "Remove Vote" option if already voted from that email
2. Guest enters same email
3. Server: detects existing vote → DELETE
4. VoteButton reverts
```

### Admin Views Voter List

```
1. Admin views post detail page
2. "See who voted (42)" link shown below vote count
3. Clicks link → VoterListModal opens
4. GET /api/posts/[postId]/vote/voters
5. Modal shows: avatar, name, email, "Guest" badge, relative time
6. Admin scrolls / loads more if >50 voters
```

---

## API Reference

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/posts/[postId]/vote` | Optional session | Cast a vote |
| DELETE | `/api/posts/[postId]/vote` | Optional session | Remove a vote |
| GET | `/api/posts/[postId]/vote/voters` | Admin+ | List all voters |

---

## Validation Rules

| Field | Rules |
|---|---|
| `email` (guest vote) | Required if no session, valid email format, max 255 chars |
| `name` (guest vote) | Optional, max 100 chars |
| `captchaToken` (guest vote) | Required for guest POST — verified server-side via hCaptcha or Cloudflare Turnstile |
| `email` (guest remove) | Passed as query param `?email=` on DELETE — must match an existing vote row |
| Vote state | Blocked if post is merged, locked, unapproved, or board is archived |
| Rate limit | Guest cast: 10 per hour per IP (sliding window) |

---

## Edge Cases

| Case | Handling |
|---|---|
| Signed-in user votes on post they already voted on | `castVote` detects existing vote → returns 200 (idempotent), no duplicate row |
| Guest votes with email matching a signed-in user's email | Vote recorded against email — not linked to user account. If user signs in and votes again, guest vote is deleted and user vote created (de-duplication in `castVote`) |
| Vote removed for a vote that doesn't exist | `removeVote` returns void — no error (idempotent) |
| `vote_count` goes below 0 | `GREATEST(vote_count - 1, 0)` prevents negative counts |
| User votes on a merged post | Pre-flight check blocks with message "This post has been merged" |
| User votes on post in an archived board | Pre-flight check blocks with message "This board is archived" |
| User votes on an unapproved post | Pre-flight check blocks — unapproved posts should not be visible in public UI anyway |
| Two simultaneous votes from same user | `UNIQUE (post_id, user_id)` DB constraint catches race — second INSERT fails, returns 200 (already voted) |
| Admin deletes a voter's account | `votes.user_id` SET NULL — vote record preserved, voter shown as "Deleted User" in voter list |
| Post merged — what happens to votes on source? | `mergePosts` (Feature 05) transfers votes: `UPDATE votes SET post_id = targetId`. Target `vote_count` recalculated from actual rows |
| Board archived after votes cast | Votes are preserved. Vote button becomes disabled but historical vote count remains |

---

## Acceptance Criteria

- [ ] Signed-in user can cast a vote on a post — vote count increments immediately (optimistic)
- [ ] Signed-in user can remove their vote — vote count decrements immediately (optimistic)
- [ ] Vote is idempotent — clicking vote twice does not create two votes
- [ ] Remove is idempotent — removing a non-existent vote returns no error
- [ ] Guest user clicking vote opens `<GuestVoteDialog />`
- [ ] Guest can cast a vote by entering email
- [ ] Guest cannot vote twice from the same email on the same post
- [ ] Vote button shows filled/primary state when user has voted
- [ ] Vote button is disabled and shows tooltip on merged posts
- [ ] Vote button is disabled on archived board posts
- [ ] API error (e.g. post locked) reverts optimistic update and shows toast
- [ ] "My Votes" filter chip appears on board page for signed-in users only
- [ ] "My Votes" filter shows only posts the current user has voted on
- [ ] `hasVoted` flag is included in post list response for authenticated users
- [ ] Admin can open voter list modal on post detail page
- [ ] Voter list shows name, email, guest badge, and relative vote time
- [ ] Voter list is paginated (50 per page)
- [ ] `vote_count` on post stays consistent after cast and remove
- [ ] Vote count is accurate after post merge (recalculated from rows)
- [ ] `vote_count` never goes below 0

---

## Implementation Notes

- Cast and remove are **separate endpoints** (`POST` and `DELETE`) — not a single toggle. This makes the client intent explicit and avoids race conditions where two rapid clicks could toggle unexpectedly
- Guest vote removal passes the email as a **query parameter** (`?email=`) not a request body — HTTP DELETE bodies are stripped by many CDNs and proxies
- Guest vote removal verifies the vote row exists before deleting — prevents IDOR where any caller knowing a victim's email could remove their vote
- Guest vote casting requires **CAPTCHA verification** (hCaptcha or Cloudflare Turnstile — both free tiers available). The CAPTCHA site key is a public env var (`NEXT_PUBLIC_CAPTCHA_SITE_KEY`); the secret key for server-side verification is `CAPTCHA_SECRET_KEY`
- Guest vote casting is **rate-limited** by IP: 10 votes per hour per IP, tracked with a sliding window counter in PostgreSQL (no Redis required)
- `vote_count` on `posts` is the source of truth for display — never recalculate from `COUNT(votes)` on every page load
- The `UNIQUE` partial indexes (`WHERE user_id IS NOT NULL` and `WHERE user_email IS NOT NULL`) are created manually in the SQL migration — Drizzle ORM does not support partial unique indexes declaratively at current versions; use raw SQL in the migration file
- `sonner` toast is used for vote error feedback — `<Toaster />` must be mounted in the root layout
- The `VoteButton` receives `initialHasVoted` from the server-rendered post list — no client-side fetch needed on page load for authenticated users
- For guest voters, `user_name` is stored in the `votes` table for display in the voter list — it is not verified or linked to any account
- `workspace_id` is stored on each vote row (denormalised from post) — enables efficient workspace-level queries without joining through posts
