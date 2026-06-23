# Landing Page

## Goal

Communicate IdeaRoads's value proposition to developers, indie makers, and product teams — and convert them into self-hosters or GitHub stars. The page lives at `/` and is the public face of the IdeaRoads product itself (not a workspace). It must load fast, be fully SSR, and work without JavaScript for SEO.

---

## Existing Scope

- Public marketing homepage at `/`
- No authentication required
- Fully server-side rendered (Next.js App Router, `app/(marketing)/page.tsx`)
- Static or near-static content — no real-time data
- Links out to GitHub, docs, and the sign-in / get-started flow
- No pricing page in MVP (self-hosted, free)
- No blog, no changelog for IdeaRoads itself (separate from the app's changelog feature)

---

## User Flow

### New Visitor (Developer / Indie Maker)

1. Lands on `/` from GitHub, a tweet, or a search result
2. Reads headline + subheadline — understands what IdeaRoads is in 5 seconds
3. Sees the closed loop diagram — understands the product is end-to-end, not just a board
4. Scrolls through feature highlights — confirms it covers their use case
5. Reads the "Open source & self-hosted" section — understands the pricing model and data ownership promise
6. Clicks **"Get Started"** → `/signin` or GitHub repo depending on entry point
7. Optionally scrolls to quick-start instructions and copies the Docker Compose command

### Returning Visitor

1. Lands on `/`
2. Clicks **"Sign In"** in nav → `/signin`

---

## Technical Design

- Route group: `app/(marketing)/page.tsx` — isolated from the workspace and auth route groups
- Layout: `app/(marketing)/layout.tsx` — contains `<Nav>` and `<Footer>` only; no sidebar, no workspace context
- Rendering: fully SSR (`export const dynamic = 'force-static'`) — no `useClient` on the page itself
- SEO: `generateMetadata()` returns title, description, og:image, twitter:card
- No authentication check — this page is always public
- Nav links: Logo, Docs, GitHub, Sign In (right-aligned)
- All CTAs link to `/signin` or the GitHub repo URL from `config/platform.ts`

---

## Folder Mapping

```
app/
└── (marketing)/
    ├── layout.tsx                  # Nav + Footer only, no auth context
    └── page.tsx                    # Landing page — force-static SSR

components/
└── marketing/
    ├── nav.tsx                     # Top navigation bar
    ├── hero.tsx                    # Hero section
    ├── loop-diagram.tsx            # Collect → Vote → Plan → Ship → Announce → Notify
    ├── features-grid.tsx           # Six feature highlight cards
    ├── who-its-for.tsx             # Three ICP cards
    ├── open-source-section.tsx     # OSS / self-hosting pitch
    ├── comparison-table.tsx        # IdeaRoads vs Canny vs Upvoty
    ├── quick-start.tsx             # Docker Compose command + steps
    ├── footer.tsx                  # Footer with links
    └── cta-button.tsx              # Shared CTA button component

config/
└── platform.ts                    # GITHUB_REPO_URL, DOCS_URL, PRODUCT_NAME = "IdeaRoads"
```

---

## Page Sections

### 1. Navigation Bar

| Element     | Detail                                                             |
| ----------- | ------------------------------------------------------------------ |
| Logo        | IdeaRoads wordmark — links to `/`                                  |
| Docs        | Links to GitHub docs or `/docs`                                    |
| GitHub      | Links to GitHub repo — shows star count (static, updated at build) |
| Sign In     | Links to `/signin` — right-aligned, outlined button               |
| Get Started | Links to `/signin` — right-aligned, filled primary button         |

Sticky on scroll. No hamburger menu at MVP — collapses to icon-only on mobile.

---

### 2. Hero Section

**Headline:**

> Open-source customer feedback, built to close the loop.

**Subheadline:**

> Collect feedback, vote on what matters, plan a roadmap, ship it, and notify your users — all in one self-hosted platform.

**CTA Buttons:**

- Primary: **"Get Started Free"** → `/signin`
- Secondary: **"View on GitHub"** → GitHub repo URL

**Visual:**

- A browser mockup or screenshot showing the public board view with a post list, vote counts, and status badges — the core product in one frame
- Alternatively: a clean illustration of the closed loop diagram

**Trust signals (below CTA):**

- MIT License badge
- "Self-hosted — you own your data"
- "Voters always free"

---

### 3. The Closed Loop

**Section title:** The product in one loop

**Visual:** Horizontal flow diagram with icons for each step:

```
Collect → Vote → Plan → Ship → Announce → Notify
   ↑                                          |
   └──────────────────────────────────────────┘
```

**Copy beneath each step:**

| Step     | Copy                                                                         |
| -------- | ---------------------------------------------------------------------------- |
| Collect  | Users submit feature requests and bug reports to your public boards          |
| Vote     | Votes surface what matters most — one per user, no gaming                    |
| Plan     | Voted posts auto-populate your public roadmap by status                      |
| Ship     | Admin changes post status to Completed when it's done                        |
| Announce | Write a changelog entry linked to the shipped feedback                       |
| Notify   | Every voter automatically gets an email when you ship                        |

**Closing line:**

> Any single piece is a commodity. The integration is what makes it sticky.

---

### 4. Features Grid

Six cards — one per core feature group. Each card: icon + feature name + one-line description.

| Feature             | Icon           | Description                                                                            |
| ------------------- | -------------- | -------------------------------------------------------------------------------------- |
| Feedback Boards     | Board icon     | Multiple boards per workspace. Public by default. Up to 10 active boards.              |
| Voting              | Upvote icon    | One vote per signed-in user. Guests can vote with email. Vote counts drive sort order. |
| Public Roadmap      | Kanban icon    | Auto-generated from post statuses. No manual curation. Four columns.                   |
| Changelog           | Megaphone icon | Write release notes, link shipped posts, notify all voters on publish.                 |
| Team Roles          | People icon    | Owner, Admin, Member, Guest. Full permission matrix. Invite by email or link.          |
| Email Notifications | Bell icon      | Four trigger events. Per-workspace preferences. One-click unsubscribe.                 |

---

### 5. Who It's For

Three cards with persona, description, and pain-point it solves.

| Persona                 | Description                                        | Pain it solves                                                             |
| ----------------------- | -------------------------------------------------- | -------------------------------------------------------------------------- |
| **Startups**            | Building your first structured feedback channel    | Feedback scattered across email, Notion, and DMs                           |
| **Indie Makers**        | Solo or small OSS projects with active communities | No affordable way to manage community requests without a SaaS subscription |
| **Small Product Teams** | 2–25 people replacing ad-hoc boards                | Feature request tracking in Trello is manual; Canny charges per voter      |

---

### 6. Open Source & Self-Hosted

**Section title:** You own your data. Always.

Three pillars:

| Pillar      | Headline                    | Body                                                                            |
| ----------- | --------------------------- | ------------------------------------------------------------------------------- |
| Open Source | MIT Licensed                | Read the code, fork it, contribute to it. No black boxes.                       |
| Self-Hosted | One `docker compose up`     | Runs on your own server. Your data never leaves your infrastructure.            |
| Free Voters | Voters don't cost you money | Pricing (post-MVP cloud tier) is per team seat only. End users are always free. |

---

### 7. Comparison Table

Simple feature comparison — IdeaRoads vs Canny vs Upvoty. Focused on the three differentiators.

|                                    | IdeaRoads | Canny                 | Upvoty        |
| ---------------------------------- | --------- | --------------------- | ------------- |
| Open source                        | ✓         | —                     | —             |
| Self-hosted                        | ✓         | —                     | —             |
| Voters always free                 | ✓         | —                     | —             |
| Public roadmap                     | ✓         | ✓                     | ✓             |
| Changelog with voter notifications | ✓         | ✓                     | ✓             |
| Email notifications                | ✓         | ✓                     | ✓             |
| One-click self-host                | ✓         | —                     | —             |
| Pricing                            | Free      | Paid per seat + voter | Paid per seat |

**Footnote:** Canny and Upvoty comparison is based on their publicly documented plans. IdeaRoads is not affiliated with either.

---

### 8. Quick Start

**Section title:** Up and running in under 5 minutes

Three numbered steps:

```
1.  Clone the repo
    git clone https://github.com/[org]/idearoads.git

2.  Configure your environment
    cp .env.example .env
    # Fill in DATABASE_URL, BETTER_AUTH_SECRET, SMTP_HOST

3.  Start the stack
    docker compose up -d
    # App runs at http://localhost:3000
```

**CTA below:** "Full self-hosting guide →" links to docs.

---

### 9. Footer

| Column     | Links                                                             |
| ---------- | ----------------------------------------------------------------- |
| Product    | Features, Roadmap (IdeaRoads's own), Changelog (IdeaRoads's own) |
| Developers | Documentation, GitHub, Contributing                               |
| Legal      | MIT License, Privacy Policy (post-MVP)                            |
| Social     | GitHub stars count, Twitter/X (post-MVP)                          |

**Bottom bar:**

> Built with IdeaRoads. © 2026 IdeaRoads contributors. MIT License.

---

## API

None. The landing page is fully static — no API calls. GitHub star count is fetched at build time via `generateStaticParams` or a build-time `fetch` with `next: { revalidate: 3600 }`.

---

## Database

None. The landing page reads no database. All content is hardcoded in components or sourced from `config/platform.ts`.

---

## Events

None. The landing page emits no domain events and subscribes to none.

---

## Background Jobs

None.

---

## Dependencies

| Dependency                   | Reason                                                      |
| ---------------------------- | ----------------------------------------------------------- |
| `config/platform.ts`         | `PRODUCT_NAME`, `GITHUB_REPO_URL`, `DOCS_URL` constants     |
| `app/(marketing)/layout.tsx` | Isolated layout — no workspace context, no auth context     |
| `/signin` route              | Primary CTA destination                                     |
| GitHub API (build-time only) | Optional: fetch star count at build time with `revalidate`  |

---

## Edge Cases

| Case                                     | Handling                                                                                                             |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| User is already signed in and visits `/` | Nav shows "Dashboard" instead of "Sign In"; clicking it goes to `/onboarding` or their last workspace               |
| GitHub star count fetch fails at build   | Show no badge rather than crash — `try/catch` the build-time fetch                                                   |
| Visitor has JavaScript disabled          | Page is fully SSR — all content renders without JS; only interactive elements (mobile nav toggle) degrade gracefully |
| Dark mode                                | Landing page respects system `prefers-color-scheme` via Tailwind's `dark:` variant                                   |
| Slow connection                          | Hero image / mockup is lazy-loaded or replaced with a pure CSS/HTML diagram at MVP                                   |

---

## Acceptance Criteria

- [ ] Landing page loads at `/` without authentication
- [ ] Page renders correctly with JavaScript disabled (SSR check)
- [ ] All six navigation links are functional (Logo, Docs, GitHub, Sign In, Get Started)
- [ ] "Get Started Free" CTA links to `/signin`
- [ ] "View on GitHub" links to the correct GitHub repo URL from `config/platform.ts`
- [ ] Closed loop diagram is visible without scrolling on 1280px viewport
- [ ] Comparison table renders on mobile without horizontal scroll
- [ ] Quick-start code block is copyable
- [ ] `<title>` and `<meta description>` are set via `generateMetadata()`
- [ ] `og:image` is set for social sharing previews
- [ ] Page scores 90+ on Lighthouse Performance (desktop)
- [ ] No broken links in footer

---

## Implementation Notes

- Route group `(marketing)` isolates the landing page from `(workspace)` and `(auth)` — no accidental auth middleware leaking in
- Use `export const dynamic = 'force-static'` on `app/(marketing)/page.tsx` to ensure static generation at build time
- GitHub repo URL and all product-level constants live in `config/platform.ts` — never hardcoded in components
- The comparison table data (Canny, Upvoty) is hardcoded in the component — it does not come from a CMS or DB
- Do NOT use `<LocalDate />` (a client component) anywhere on this page — no dynamic timestamps on the landing page
- Hero mockup or screenshot: use a static image (`public/screenshots/board-view.png`) — do not embed a live iframe of the app
- Tailwind `dark:` variants handle dark mode — no JS theme toggle needed at MVP
- `components/marketing/` is a separate directory from `components/ui/` and `components/boards/` — keeps landing page components isolated from app components
- All imports use `@/` path alias — never relative paths
- Quick start step 2 references `BETTER_AUTH_SECRET` (not `APP_SECRET`) — consistent with `.env.example`
