# Feature 07 — Comments

## Overview

Comments allow users to discuss feedback posts. Any signed-in user or guest (with email) can comment on a post. Comments support **one level of nested replies** — a reply to a reply is not allowed. Comment authors and admins can delete their own comments. Deletions are **soft deletes** — the comment body is replaced with *"[deleted]"* and the thread structure is preserved. The post author and parent commenter are notified by email on new comments and replies respectively.

---

## Core Behaviour

- Comments are attached to a post (not a board or workspace directly)
- Replies are one level deep only — you can reply to a top-level comment, not to a reply
- Signed-in users can comment using their account
- Guest users can comment by providing name + email
- Comments on private boards are only visible to workspace members
- Comment moderation (from workspace settings):
  - `off` — comments appear immediately
  - `on` — all comments require admin approval before appearing publicly
- Soft delete: body replaced with `"[deleted]"`, `is_deleted = true`, author info cleared
  - Thread structure preserved so replies remain readable in context
- `posts.comment_count` is a denormalised counter — incremented on new approved comment, decremented on delete
- Admin can delete any comment; author can delete their own comment only
- Admin can approve pending comments (when comment moderation is on)
- No editing of comments in MVP — delete and re-submit

---

## Dependencies

```
pg-boss         — enqueue comment notification emails
nodemailer      — deliver comment + reply emails
```

---

## Environment Variables

No new variables beyond Feature 01.

---

## Database Schema

### `comments`

```ts
id              text          PK  (cuid2)
post_id         text          NOT NULL  → posts.id (CASCADE DELETE)
parent_id       text                    → comments.id (SET NULL on delete)
                                        -- null = top-level comment
                                        -- set = reply to a comment
body            text          NOT NULL
is_deleted      boolean       NOT NULL  DEFAULT false
is_approved     boolean       NOT NULL  DEFAULT true
                                        -- false when workspace.comment_moderation = true
author_id       text                    → user.id (SET NULL on delete)
author_email    text                    -- guest commenter email
author_name     text                    -- guest or user display name (snapshot)
author_avatar   text                    -- user avatar URL (snapshot at comment time)
created_at      timestamp     NOT NULL  DEFAULT now()
updated_at      timestamp     NOT NULL  DEFAULT now()
```

**Indexes:**
- Index on `post_id`
- Index on `parent_id`
- Index on `author_id`
- Index on `(post_id, is_approved, is_deleted)` — for listing visible comments

**Rules:**
- `parent_id` must reference a comment with `parent_id IS NULL` (top-level only)
- `parent_id` must reference a comment on the same `post_id`
- Body min 1 char, max 5000 chars

---

## File Structure

```
app/
└── api/
    ├── posts/
    │   └── [postId]/
    │       └── comments/
    │           └── route.ts                GET list / POST create
    └── comments/
        └── [commentId]/
            ├── route.ts                    DELETE (soft delete)
            └── approve/
                └── route.ts                PATCH approve (moderation)

components/
└── comments/
    ├── comment-section.tsx                 Full comment section wrapper
    ├── comment-thread.tsx                  Renders top-level comments + their replies
    ├── comment-item.tsx                    Single comment (body, author, actions)
    ├── comment-form.tsx                    New comment / reply input form
    ├── comment-reply-form.tsx              Inline reply form (opens below a comment)
    └── comment-moderation-queue.tsx        Admin: pending comments list

lib/
└── comments/
    ├── queries.ts                          Read operations
    ├── create.ts                           Create comment / reply
    ├── delete.ts                           Soft delete comment
    └── index.ts                            Re-exports

lib/worker/handlers/
├── send-new-comment-email.ts               Email post author on new comment
└── send-comment-reply-email.ts             Email parent commenter on reply

lib/email/templates/
├── new-comment.ts                          Email HTML template
└── comment-reply.ts                        Email HTML template
```

---

## Implementation Details

### `lib/comments/queries.ts`

```ts
listComments(postId, { includeUnapproved = false, userId? })
  → fetches all non-deleted top-level comments for postId
  → for each top-level comment: fetches its replies (parent_id = comment.id)
  → excludes unapproved unless includeUnapproved = true (admin flag)
  → structure returned:
    CommentWithReplies[] = {
      ...comment,
      replies: Comment[]
    }
  → sorted: top-level by created_at ASC (oldest first)
  → replies sorted by created_at ASC within each parent

getCommentById(commentId)
  → returns single comment or null

getPendingComments(workspaceId)
  → returns unapproved comments across all posts in this workspace
  → joined with post (title, boardSlug) for context
  → sorted by created_at ASC (oldest first in queue)

getCommentCount(postId)
  → COUNT of approved, non-deleted comments (top-level + replies)
```

---

### `lib/comments/create.ts`

```ts
createComment(postId, {
  body,
  parentId?,
  authorId?,
  authorEmail?,
  authorName?,
  authorAvatar?,
}, workspaceId)

  Pre-flight checks:
    1. Fetch post — if not found: throw NotFoundError
    2. If post.is_locked: throw "Comments are closed on this post."
    3. If post.is_approved = false: throw "This post is not yet published."
    4. If parentId provided:
       → Fetch parent comment
       → If parent not found: throw "Parent comment not found."
       → If parent.parent_id IS NOT NULL: throw "Replies to replies are not allowed."
       → If parent.post_id !== postId: throw "Parent comment does not belong to this post."

  Determine approval:
    → Fetch workspace.comment_moderation
    → is_approved = !workspace.comment_moderation

  Snapshot author info:
    → If authorId: fetch user name + avatar → store in author_name, author_avatar
    → If guest: use provided authorName, set author_avatar = null

  In db.transaction():
    → INSERT INTO comments (...)
    → If is_approved:
        UPDATE posts SET comment_count = comment_count + 1 WHERE id = postId

  Post-insert (if is_approved):
    → If parentId IS NULL (top-level comment):
        → Enqueue SEND_NEW_COMMENT_EMAIL to post author
          (skip if post.author_id = comment.author_id — don't email yourself)
    → If parentId IS NOT NULL (reply):
        → Fetch parent comment author
        → Enqueue SEND_COMMENT_REPLY_EMAIL to parent comment author
          (skip if parent.author_id = comment.author_id — don't email yourself)

  → returns comment
```

---

### `lib/comments/delete.ts`

```ts
deleteComment(commentId, requesterId, requesterRole)
  → fetch comment
  → if not found: throw NotFoundError

  Permission check:
    → if requesterRole is admin/owner: allowed
    → else: verify requesterId = comment.author_id

  In db.transaction():
    → UPDATE comments SET
        body = '[deleted]',
        is_deleted = true,
        author_id = null,
        author_email = null,
        author_name = null,
        author_avatar = null,
        updated_at = now()
      WHERE id = commentId
    → If comment was approved (is_approved = true):
        UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0)
          WHERE id = comment.post_id

  → returns void

  Note: replies to this comment are NOT deleted — they remain visible.
        The deleted comment shows as "[deleted]" in the thread.
```

---

### `app/api/posts/[postId]/comments/route.ts`

**GET** — List comments for a post
```
Auth: Public (if board is public) or requireWorkspaceMember (private board)
Query: includeUnapproved=true (admin only)

Returns:
  CommentWithReplies[] — top-level comments with nested replies
  Structure:
  [
    {
      id, body, authorName, authorAvatar, isGuest, createdAt, isDeleted,
      replies: [
        { id, body, authorName, authorAvatar, isGuest, createdAt, isDeleted }
      ]
    }
  ]

Note:
  - Deleted comments: body = "[deleted]", author fields = null
  - Unapproved comments excluded for non-admin requests
  - author_email NEVER returned in API response (privacy)
```

**POST** — Create a comment
```
Auth: Optional session (guests allowed)
Body:
  {
    body: string,
    parentId?: string,
    authorEmail?: string,   -- required for guests
    authorName?: string,    -- required for guests
  }

Validates:
  - body: required, 1–5000 chars, not blank after trim
  - parentId: if provided, must be a top-level comment on this post
  - Guest: authorEmail required, valid format
  - Guest: authorName required, 1–100 chars

Returns:
  201 + comment (with is_approved flag)
  If is_approved = false: client shows "Your comment is pending review"
```

---

### `app/api/comments/[commentId]/route.ts`

**DELETE** — Soft delete a comment
```
Auth: Session required
  - Author can delete their own comment
  - Admin+ can delete any comment

Returns: 204

Note: This is a soft delete — body becomes "[deleted]"
      The comment row is never hard-deleted in MVP
```

---

### `app/api/comments/[commentId]/approve/route.ts`

**PATCH** — Approve a pending comment
```
Auth: requireRole(['owner', 'admin'])

Logic:
  → UPDATE comments SET is_approved = true
  → UPDATE posts SET comment_count = comment_count + 1
  → Enqueue notification emails (same as in createComment)

Returns: updated comment
```

---

### `components/comments/comment-section.tsx`

Server component wrapper rendered on the post detail page:
- Fetches comments via `listComments(postId, { includeUnapproved: isAdmin })`
- Passes data to client components
- Shows comment count header: "{n} Comments"
- Renders `<CommentThread />` + `<CommentForm />` (for new top-level comments)
- If workspace.comment_moderation = on AND user is admin: shows moderation queue link
- If post is locked: shows "Comments are closed" message, hides form

---

### `components/comments/comment-thread.tsx`

Client component:
- Renders the flat list of top-level comments
- For each comment: renders `<CommentItem />` + its replies
- Replies are indented visually (left border / padding)
- "Load more" if there are more than 20 top-level comments (pagination)

---

### `components/comments/comment-item.tsx`

Client component for a single comment:

**Displays:**
- Author avatar (or initials fallback)
- Author name + "Guest" badge if guest
- Relative timestamp ("2 hours ago"), absolute on hover tooltip
- Comment body (or "[deleted]" styled in muted colour if is_deleted)
- "Reply" button (hidden on replies — no nested nesting)
- "Delete" button (shown to comment author or admin)
- Pending badge (shown to admin if is_approved = false)

**Interactions:**
- "Reply" → opens inline `<CommentReplyForm />` below this comment
- "Delete" → AlertDialog confirm → DELETE `/api/comments/[commentId]`
  - Optimistic: body replaced with "[deleted]", author info cleared
  - On error: revert + toast

---

### `components/comments/comment-form.tsx`

Client component — used for new top-level comments at the bottom of the thread:

**Props:**
```ts
{
  postId: string
  onSuccess: (comment: Comment) => void
}
```

**Fields:**
- Textarea: body (required, 1–5000 chars, live char count)
- If not signed in:
  - Name input (required)
  - Email input (required)
- Submit button: "Post Comment"

**Behaviour:**
- Submit → POST `/api/posts/[postId]/comments`
- On success (approved): new comment appended to thread, form cleared
- On success (pending): toast "Your comment is pending review", form cleared
- On error: toast with error message

---

### `components/comments/comment-reply-form.tsx`

Client component — inline form that appears below a specific comment:

**Props:**
```ts
{
  postId: string
  parentId: string
  onSuccess: (reply: Comment) => void
  onCancel: () => void
}
```

**Fields:**
- Textarea: body (same validation as comment-form)
- Guest fields if not signed in (same as comment-form)
- "Reply" button + "Cancel" link

**Behaviour:**
- Submit → POST `/api/posts/[postId]/comments` with `parentId`
- On success: reply appended under parent, form collapses
- "Cancel" collapses form without submitting

---

### `components/comments/comment-moderation-queue.tsx`

Client component — shown in admin board or post view when moderation is on:

**Displays:**
- Count of pending comments: "3 comments pending review"
- List of pending comments with: post title, comment body preview, author, time
- "Approve" button per comment → PATCH `/api/comments/[commentId]/approve`
- "Delete" button per comment → DELETE `/api/comments/[commentId]`
- Clicking post title navigates to post detail

---

## Comment Moderation Flow

```
workspace.comment_moderation = false (default):
  → comment.is_approved = true
  → comment appears immediately
  → comment_count incremented
  → notification emails sent

workspace.comment_moderation = true:
  → comment.is_approved = false
  → comment NOT visible to public
  → comment_count NOT incremented
  → NO notification emails (email sent only after approval)
  → Admin sees pending comment in moderation queue
  → Admin clicks Approve → is_approved = true, count incremented, emails sent
  → Admin clicks Delete → soft delete, no count change
```

---

## Email Notifications

### `SEND_NEW_COMMENT_EMAIL`

**Trigger:** New top-level comment created + approved

**Condition:** Only sent if commenter is not the post author (no self-notification)

**Payload:**
```ts
{
  postAuthorEmail: string
  postAuthorName: string
  postTitle: string
  postUrl: string
  commenterName: string
  commentBody: string       // truncated to 300 chars
  workspaceName: string
}
```

**Handler:** `lib/worker/handlers/send-new-comment-email.ts`
- Subject: `"{commenterName} commented on your post — {postTitle}"`
- Body: commenter name, comment preview, link to post

---

### `SEND_COMMENT_REPLY_EMAIL`

**Trigger:** Reply created + approved on a comment

**Condition:** Only sent if replier is not the parent comment author

**Payload:**
```ts
{
  parentAuthorEmail: string
  parentAuthorName: string
  postTitle: string
  postUrl: string
  replierName: string
  replyBody: string         // truncated to 300 chars
  workspaceName: string
}
```

**Handler:** `lib/worker/handlers/send-comment-reply-email.ts`
- Subject: `"{replierName} replied to your comment on {postTitle}"`
- Body: replier name, reply preview, link to post

---

## User Flows

### Signed-in User Posts a Comment

```
1. User views post detail page
2. Sees comment thread + CommentForm at the bottom
3. Writes comment in textarea
4. Clicks "Post Comment"
5. POST /api/posts/[postId]/comments { body }
6. If moderation off: comment appears in thread immediately
7. If moderation on: toast "Your comment is pending review", form clears
8. Post author receives email (if different from commenter)
```

### Guest Posts a Comment

```
1. Guest views post detail
2. CommentForm shows Name + Email fields (guest fields)
3. Fills name, email, and comment body
4. Clicks "Post Comment"
5. POST /api/posts/[postId]/comments { body, authorName, authorEmail }
6. Same moderation flow as above
7. Guest shown as "{name} (Guest)" in thread
```

### Signed-in User Replies to a Comment

```
1. User sees a top-level comment
2. Clicks "Reply" on the comment
3. Inline CommentReplyForm opens below
4. Writes reply
5. Clicks "Reply"
6. POST /api/posts/[postId]/comments { body, parentId }
7. Reply appears indented below the parent comment
8. Parent commenter receives reply email (if different user)
9. "Reply" button disappears from reply items (no nested replies)
```

### Author Deletes Own Comment

```
1. Author sees "Delete" on their comment
2. Clicks Delete → AlertDialog: "Delete this comment?"
3. Confirm → DELETE /api/comments/[commentId]
4. Optimistic: comment body replaced with "[deleted]", author cleared
5. comment_count decremented
6. Reply thread under deleted comment remains visible
```

### Admin Deletes Any Comment

```
1. Admin views post detail — Delete button visible on all comments
2. Same flow as above
3. Admin can delete guest comments and other users' comments
```

### Admin Approves Pending Comment (Moderation On)

```
1. Admin views post detail or moderation queue
2. Pending comment shown with "Pending" badge
3. Admin clicks "Approve"
4. PATCH /api/comments/[commentId]/approve
5. Comment becomes visible publicly
6. comment_count incremented
7. Notification emails sent to post author / parent commenter
```

---

## API Reference

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/posts/[postId]/comments` | Public / Member | List comments + replies |
| POST | `/api/posts/[postId]/comments` | Optional session | Create comment or reply |
| DELETE | `/api/comments/[commentId]` | Author / Admin+ | Soft delete comment |
| PATCH | `/api/comments/[commentId]/approve` | Admin+ | Approve pending comment |

---

## Validation Rules

| Field | Rules |
|---|---|
| `body` | Required, 1–5000 chars, must not be blank after trim |
| `parentId` | Must be a top-level comment (`parent_id IS NULL`) on same post |
| `authorEmail` (guest) | Required if no session, valid email format |
| `authorName` (guest) | Required if no session, 1–100 chars |

---

## Thread Structure

```
Comment A (top-level, parent_id = null)
  └── Reply A1 (parent_id = Comment A)
  └── Reply A2 (parent_id = Comment A)

Comment B (top-level)
  └── Reply B1

Comment C (top-level, no replies)
```

- Replies cannot have their own replies (`parent_id` must point to a top-level comment)
- This is enforced both in the service layer and at the UI level (no Reply button on replies)

---

## Soft Delete Behaviour

| Scenario | Result |
|---|---|
| Top-level comment deleted, has replies | Comment shows "[deleted]", replies remain visible |
| Top-level comment deleted, no replies | Comment shows "[deleted]" |
| Reply deleted | Reply shows "[deleted]" |
| Guest comment deleted | `author_email` cleared from DB (GDPR-friendly) |
| `comment_count` on post | Decremented by 1 on delete (approved comments only) |

---

## Edge Cases

| Case | Handling |
|---|---|
| Guest comments on private board | Blocked — private boards require workspace membership; guests are not members |
| Reply to a reply attempted (API directly) | `createComment` checks `parent.parent_id IS NOT NULL` → throws error |
| Reply to a deleted comment | Allowed — deleted comments retain their ID and structure; reply is valid |
| Comment on locked post | Pre-flight check: `post.is_locked = true` → throws "Comments are closed on this post" |
| Comment on unapproved post | Pre-flight check blocks — unapproved posts not visible publicly anyway |
| Author account deleted | `author_id` SET NULL — comment body preserved, author shown as "Deleted User" |
| Admin deletes post — what happens to comments? | `CASCADE DELETE` on `comments.post_id` → all comments hard-deleted |
| `comment_count` drifts | Counter only changes inside `db.transaction()`. Drift can happen if a transaction partially fails — a reconciliation query can be run post-MVP |
| Guest submits same comment twice (double submit) | No de-duplication in MVP — two comments created. Handled by disabling submit button during in-flight request |
| Comment moderation on — guest comments | Guest comments also go through moderation queue — `is_approved = false` until admin approves |
| Very long comment thread (500+ comments) | Pagination: listComments returns 20 top-level comments per page with "Load more" |

---

## Acceptance Criteria

- [ ] Signed-in user can post a top-level comment on a post
- [ ] Guest can post a comment by providing name and email
- [ ] Guest commenter shown with "(Guest)" badge in thread
- [ ] Comments appear immediately when moderation is off
- [ ] Comments show "Pending review" state when moderation is on
- [ ] Admin can approve pending comments from moderation queue
- [ ] Signed-in user can reply to a top-level comment
- [ ] Reply appears indented below the parent comment
- [ ] "Reply" button is not shown on replies (no nested nesting)
- [ ] Comment author can delete their own comment
- [ ] Admin can delete any comment
- [ ] Deleted comment shows "[deleted]" — thread structure preserved
- [ ] Replies to deleted comment remain visible
- [ ] `author_email` is never exposed in API responses
- [ ] Post author receives email on new approved top-level comment
- [ ] Post author does NOT receive email when they comment on their own post
- [ ] Parent commenter receives email on new approved reply
- [ ] Parent commenter does NOT receive email when they reply to themselves
- [ ] `comment_count` on post increments on approved comment creation
- [ ] `comment_count` decrements on comment deletion
- [ ] Comment count shown on `<PostCard />` in board list
- [ ] Comments are hidden on private boards for non-members

---

## Implementation Notes

- Author name and avatar are **snapshotted** at comment creation time (`author_name`, `author_avatar` columns) — they do not update if the user changes their name/avatar later. This is intentional for comment history integrity
- `author_email` is stored in the DB for guest voters but **never returned in any API response** — it is used only for sending reply notification emails server-side
- Hard delete is intentionally avoided — soft delete preserves thread context and prevents orphaned replies from losing their parent
- The `[deleted]` body string is a literal string constant — define it in `config/platform.ts` as `DELETED_COMMENT_BODY = "[deleted]"` so it can be checked consistently in the UI
- Reply depth is enforced at the service layer (`parent.parent_id IS NOT NULL` check) — not just the UI — to prevent API abuse
- `comment_count` is only incremented for **approved** comments — pending comments do not count until approved
- When a comment moderation approval triggers emails, the same email logic from `createComment` is reused — extract it into a shared `sendCommentNotifications(comment)` helper to avoid duplication
