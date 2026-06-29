# IdeaRoads — Landing Page Specification

> This document is the implementation specification for the IdeaRoads landing page at `/`.
> It supersedes the section descriptions in `docs/features/00-landing-page.md`.
> No code. No JSX. Specification only.

---

## Revised Section Order

| # | Section | Background | CTA Present |
|---|---|---|---|
| 1 | Navigation | `bg-background` + `border-b border-border` | Sign In + Get Started |
| 2 | Hero | `bg-primary` (dark) | Get Started Free + View on GitHub |
| 3 | Trust Bar | `bg-muted` | None |
| 4 | Key Differentiators | `bg-background` | None |
| 5 | Features Grid | `bg-muted` | Get Started Free (inline, below grid) |
| 6 | The Closed Loop | `bg-background` | None |
| 7 | Quick Start | `bg-primary` (dark) | Get Started Free + Full guide link |
| 8 | Footer | `bg-background` + `border-t border-border` | None |

The dark sections (2 and 7) bookend the page intentionally. They use the same background as the app's sidebar — the visitor gets a visual preview of the product's aesthetic before signing up.

---

## Design Tokens Reference

All implementation must use these tokens exclusively. No hardcoded colors.

| Token | Usage |
|---|---|
| `bg-primary` | Dark section backgrounds (hero, quick start) |
| `text-primary-foreground` | Text on dark sections |
| `bg-background` | White section backgrounds |
| `bg-muted` | Light gray section backgrounds |
| `bg-card` | Card backgrounds within muted sections |
| `text-foreground` | Primary text on light sections |
| `text-muted-foreground` | Secondary/body text on light sections |
| `border-border` | All borders |
| `text-success` | Eyebrow labels and accent moments only |
| `bg-destructive` | Not used on landing page |

Border radius: `--radius: 0rem` — zero radius throughout. No rounded corners anywhere.
Shadows: None. Separation achieved through borders and background-color contrast.
Icons: Lucide React. Consistent `size-5` within cards and inline contexts.

---

## Typography Scale

| Role | Classes | Notes |
|---|---|---|
| Hero H1 | `font-black text-5xl` (mobile) `text-7xl` (desktop) | Against dark bg: `text-primary-foreground` |
| Section heading | `font-bold text-3xl` (mobile) `text-4xl` (desktop) | |
| Section eyebrow | `text-xs font-bold uppercase tracking-eyebrow text-success` | Emerald only |
| Section subtext | `text-lg leading-8 text-muted-foreground` (light) `text-primary-foreground/70` (dark) | |
| Card title | `font-semibold text-base text-foreground` | |
| Card body | `text-sm leading-6 text-muted-foreground` | |
| Code block | `font-mono text-sm` | |
| Footer heading | `font-medium text-sm text-foreground` | |
| Footer link | `text-sm text-muted-foreground` | Hover: `text-foreground` |
| Bottom bar | `text-xs text-muted-foreground` | |

---

## Section 1 — Navigation

### Goal
Provide persistent wayfinding and an immediate escape route for high-intent visitors who do not need to read the page before acting. The nav signals legitimacy through presence and consistency.

### User Intent
First contact with the product. The visitor is scanning for: is this a real project? Is there a GitHub link? Is there a sign-in? This takes under 2 seconds and happens before any copy is read.

### Content Hierarchy

**Left:**
- IdeaRoads wordmark. `font-black`. Links to `/`. No icon, no logomark at MVP. The wordmark IS the logo.

**Center-right (desktop only):**
- Docs — text link → `DOCS_URL` from `config/platform.ts`
- GitHub ★ [star count] — text link → `GITHUB_REPO_URL` from `config/platform.ts`. Star count fetched at build time via `fetch` with `next: { revalidate: 3600 }`. On fetch failure: render "GitHub" without the count. Do not crash.

**Right:**
- Sign In — `variant="secondary"` button → `/signin`
- Get Started — default primary button → `/signin`

### CTA
- Primary: **Get Started** → `/signin`
- Secondary: **Sign In** → `/signin`
Both link to the same route. Better Auth handles new vs. returning users.

### Desktop Behavior
- Full nav visible: wordmark left, Docs + GitHub center-right, Sign In + Get Started rightmost.
- Sticky on scroll. `bg-background border-b border-border`. Stays visible at all times.
- Height: `h-16` (`64px`). Container: `max-w-6xl mx-auto px-8`.
- On scroll past hero: nav gains a subtle `bg-background/95 backdrop-blur-sm` to maintain legibility over content. Do not use shadow — use the border only.

### Mobile Behavior
- Wordmark left. **Get Started** button right only. All other links hidden. No hamburger menu at MVP.
- The Sign In link is intentionally omitted on mobile nav — returning users can tap Get Started and will be routed correctly by Better Auth.
- Same sticky behavior. Same `h-16` height.

### Edge Cases
- Authenticated user visits `/`: redirected to `/post-auth` which routes them to their workspace (`/{slug}`), Orbit (if admin), or onboarding.
- GitHub star count takes >0ms to fetch: show nothing in that slot rather than a spinner. The nav must not jank.

---

## Section 2 — Hero

### Goal
Establish what IdeaRoads is within 5 seconds. Answer the three questions every first-time visitor asks silently: What is this? Is it for me? What does it cost? The hero must create enough desire to keep the visitor scrolling, or enough intent to click the CTA immediately.

### User Intent
The visitor has just arrived. They have no prior context unless they came from GitHub. They are scanning the headline, checking the CTA label for price signals, and glancing at the screenshot to understand what the product looks like. Comprehension, not conversion, is the first goal at this stage.

### Content Hierarchy

**1. Eyebrow — positioned above the H1**

Text: `OPEN SOURCE · SELF-HOSTED · MIT LICENSE`

Styling: `text-xs font-bold uppercase tracking-eyebrow text-success`. The three claims are separated by a centered dot (`·`), not a slash or pipe. The emerald color (`text-success`) creates the only warm accent point on the dark background. This is the first signal the visitor sees — before they read the headline.

**2. H1 — primary headline**

Text: `Open-source customer feedback, built to close the loop.`

Styling: `font-black text-5xl text-primary-foreground` (mobile), `text-7xl` (desktop). `max-w-3xl`. This is the approved headline from the feature doc. Do not change it.

**3. Subheadline — supporting context**

Text: `Collect feedback, vote on what matters, plan a roadmap, ship it, and notify your users — all in one self-hosted platform.`

Styling: `text-lg leading-8 text-primary-foreground/70`. `max-w-2xl`. `mt-6`. This sentence contains all six loop steps as a prose summary — it primes the visitor for the closed loop section further down the page without requiring them to understand the diagram yet.

**4. CTA Row**

Two buttons, horizontally arranged. `mt-8 flex flex-wrap gap-3`.

- **Get Started Free** — default primary button. On dark background, this renders as a light/white button (`bg-primary-foreground text-primary`). → `/signin`
- **View on GitHub ★ [count]** — `variant="outline"` rendered on dark background (appears as an outlined light button). Contains a star icon (Lucide `Star`, `size-4`) followed by the star count. → `GITHUB_REPO_URL`. Opens in new tab.

**5. Product Screenshot**

A static `next/image` showing the public board view. The image shows:
- A post list with 4–5 posts visible
- Upvote buttons with vote counts on each post
- Status badges (Open, Planned, In Progress) using the real badge components
- Category chips (e.g., "Bug", "Feature Request")
- A filter/sort bar at the top of the board

At MVP, if a real screenshot is not available: a structured HTML/CSS mockup using the actual design system components (`Card`, `Badge`, vote count indicators) is acceptable and preferred over a placeholder image. A grey rectangle is not acceptable.

Image placement: `mt-12`. Full width of the content column. Aspect ratio approximately 16:9 or 3:2. `rounded-none border border-primary-foreground/15` — a subtle light border on the dark background provides definition.

### CTA
- Primary: **Get Started Free** → `/signin`
- Secondary: **View on GitHub** → `GITHUB_REPO_URL` (new tab)

### Desktop Behavior
- Two-column layout. Left column: eyebrow + H1 + subheadline + CTAs. Right column: product screenshot.
- Grid: `grid-cols-2 gap-16 items-center` within `max-w-6xl mx-auto`.
- Left column: roughly 55% width. Right column: 45%.
- Section padding: `pt-24 pb-20 px-8`.
- The screenshot on the right is vertically centered to the text block.

### Mobile Behavior
- Single column. Eyebrow → H1 → subheadline → CTAs → screenshot, all stacked vertically.
- Screenshot is full width, positioned below the CTAs. `mt-10`.
- Section padding: `pt-20 pb-16 px-4`.
- H1 is `text-5xl` (not 7xl). Subheadline font size unchanged.
- Both CTA buttons stack: `flex-col` on `xs`, `flex-row flex-wrap` from `sm` up.

### Edge Cases
- Screenshot image fails to load: the `next/image` `alt` text is "IdeaRoads public feedback board — showing post list with vote counts and status badges". Do not show a broken image icon — use an `onError` handler at the component level to hide the image container entirely.
- Visitor has JS disabled: page is fully SSR; hero renders completely. CTAs are plain anchor tags wrapped in Next.js `Link`.

---

## Section 3 — Trust Bar

### Goal
Immediately reduce the skepticism that follows a compelling headline. Before the visitor reads any features or comparisons, they need a signal that this product is real, maintained, and safe to evaluate. This section does not sell — it validates.

### User Intent
"Is this a real project or an experiment? Is it maintained? Is it actually free? Will it be abandoned in 6 months?" The visitor is applying a quick legitimacy filter before investing more scroll time.

### Content Hierarchy

A single horizontal row of trust signals. No cards. No headings. No body copy. The signals speak for themselves.

**Signals (left to right on desktop):**

| Signal | Detail |
|---|---|
| MIT License | Icon: `Scale` (Lucide). Label: "MIT License". |
| Open Source | Icon: `Github` (Lucide). Label: "Open Source". |
| Self-Hosted | Icon: `Server` (Lucide). Label: "Self-Hosted". |
| GitHub Stars | Icon: `Star` (Lucide). Label: "★ [count] Stars". Count sourced from same build-time fetch as nav. |
| Zero Per-Voter Pricing | Icon: `Users` (Lucide). Label: "Voters Always Free". |
| Docker Deploy | Icon: `Package` (Lucide). Label: "One-command Deploy". |

Separator between signals: a single `·` character or a `1px` vertical `border-r border-border` divider, `h-4`. Separators are decorative — they do not appear between wrapped items on mobile.

All signal items: `flex items-center gap-2 text-sm font-medium text-muted-foreground`. Icons: `size-4`.

### CTA
None. This section is purely informational. Adding a CTA here would interrupt the legitimacy-building function.

### Desktop Behavior
- Single horizontal row. `flex items-center justify-center gap-8 flex-wrap`.
- Container: `max-w-6xl mx-auto px-8 py-6`.
- Background: `bg-muted`. Top and bottom: `border-y border-border`.
- All 6 signals visible in one row if viewport ≥ 1024px. Wraps gracefully at narrower widths.

### Mobile Behavior
- Items wrap into a 2×3 or 3×2 grid. `flex flex-wrap justify-center gap-x-6 gap-y-3`.
- No separators between items when wrapped — separators only make sense in a single-row context.
- Section padding: `py-5 px-4`.

---

## Section 4 — Key Differentiators

### Goal
Establish WHY IdeaRoads is different before the visitor sees WHAT it does. Features can be compared on a spreadsheet; differentiators cannot. This section answers the implicit question every visitor who has heard of Canny brings with them: "What's the actual difference?"

### User Intent
"How is this different from what I'm currently using or evaluating? Is this just another Canny clone? What's the catch — nothing is actually free." This section must pre-empt the objections that the comparison table (which we removed) used to handle.

### Content Hierarchy

**1. Eyebrow**
Text: `WHY DIFFERENT`
Styling: `text-xs font-bold uppercase tracking-eyebrow text-success`

**2. Section Heading**
Text: `You own your data. Your voters are free.`
Styling: `font-bold text-3xl` (mobile) `text-4xl` (desktop). `mt-4`.
This heading contains two of the three core differentiators as a direct statement, not a marketing claim.

**3. Section Subtext**
Text: `No vendor lock-in. No per-voter pricing. No cloud account required.`
Styling: `text-lg text-muted-foreground mt-3`. `max-w-2xl`.

**4. Three Pillar Cards**

Each card: `bg-card border border-border p-6`. No shadows. No radius.

**Card 1 — MIT Licensed**
- Icon: `Scale` (Lucide), `size-8`, `text-foreground`
- Title: `MIT Licensed`
- Body: `Read the code, fork it, contribute to it. No black boxes, no proprietary lock-in. The license is permanent — not a "source available" bait-and-switch.`

**Card 2 — Self-Hosted**
- Icon: `Server` (Lucide), `size-8`, `text-foreground`
- Title: `Self-Hosted`
- Body: `Runs on your own server. One docker compose up. Your feedback data never leaves your infrastructure.`

**Card 3 — Voters Always Free**
- Icon: `Users` (Lucide), `size-8`, `text-foreground`
- Title: `Voters Always Free`
- Body: `The people using your feedback boards never cost you a seat. Canny charges per voter. IdeaRoads doesn't, and never will.`

The third card names Canny directly. This is intentional. Specific language converts better than vague claims. The tone is matter-of-fact, not aggressive.

### CTA
None. This section builds conviction. The CTA follows naturally after features are understood. Placing a CTA here would interrupt the persuasion sequence.

### Desktop Behavior
- Three equal columns: `grid grid-cols-3 gap-6 mt-12`.
- Section padding: `py-20 px-8`. Container: `max-w-6xl mx-auto`.
- Cards are equal height (grid alignment handles this automatically).
- Icon sits above the title. Title above body. All left-aligned within the card.

### Mobile Behavior
- Single column stack. `grid grid-cols-1 gap-4`.
- Section padding: `py-16 px-4`.
- Each card is full width. Compact padding: `p-5` instead of `p-6`.

---

## Section 5 — Features Grid

### Goal
Prove feature parity with paid alternatives and give technically-minded visitors the specific capability checklist they need to make a decision. Every card names a specific, concrete feature — not a category or a benefit.

### User Intent
"Does it have X? What about Y? Can I actually replace Canny with this?" The visitor is running their personal requirements list against what the product offers. This section is a fast scan, not a read. The card titles do the work; the body copy validates.

### Content Hierarchy

**1. Eyebrow**
Text: `WHAT YOU GET`
Styling: `text-xs font-bold uppercase tracking-eyebrow text-success`

**2. Section Heading**
Text: `Six capabilities. All working together.`
Styling: `font-bold text-3xl` (mobile) `text-4xl` (desktop). `mt-4`.

**3. Feature Cards**

Six cards in a 3×2 grid. Each card: `bg-card border border-border p-6`. No shadows.

Card internal structure:
- Icon: `size-5`, `text-foreground`, aligned left
- Title: `font-semibold text-base text-foreground`, `mt-3`
- Body: `text-sm leading-6 text-muted-foreground`, `mt-1`

**Card 1 — Feedback Boards**
- Icon: `LayoutGrid` (Lucide)
- Title: Feedback Boards
- Body: Multiple boards per workspace. Public or private visibility. Up to 10 active boards per workspace.

**Card 2 — Voting**
- Icon: `ChevronUp` (Lucide)
- Title: Voting
- Body: One vote per signed-in user. Guests vote with email only. Vote counts drive sort order.

**Card 3 — Public Roadmap**
- Icon: `Columns3` (Lucide)
- Title: Public Roadmap
- Body: Auto-generated from post statuses. No manual curation. Posts move columns as their status changes.

**Card 4 — Changelog**
- Icon: `Megaphone` (Lucide)
- Title: Changelog
- Body: Write release notes, link shipped posts, notify every voter automatically on publish.

**Card 5 — Team Roles**
- Icon: `Users` (Lucide)
- Title: Team Roles
- Body: Owner, Admin, Member, and Guest. Invite by email or a shareable link. Role changes take effect immediately.

**Card 6 — Email Notifications**
- Icon: `Bell` (Lucide)
- Title: Email Notifications
- Body: Status changes, comments, replies, and new changelogs. Per-workspace preferences. One-click unsubscribe.

**4. Inline CTA — positioned below the grid**

Centered. `mt-12 flex justify-center`.

Text: **Get Started Free** — default primary button → `/signin`.

This is the first CTA below the fold. It follows the features grid because this is the first point in the scroll where the visitor has enough information to make a decision. Visitors with high intent will convert here; lower-intent visitors will continue scrolling.

### CTA
- Primary (inline): **Get Started Free** → `/signin`

### Desktop Behavior
- Grid: `grid grid-cols-3 gap-6 mt-12`.
- Section padding: `py-20 px-8`. Container: `max-w-6xl mx-auto`.
- Background: `bg-muted`.
- The inline CTA button is centered below the grid, with `mt-12` vertical gap.

### Mobile Behavior
- Grid becomes single column: `grid grid-cols-1 gap-4`.
- Cards are full width. Padding: `p-5`.
- Inline CTA remains centered, full width on mobile (`w-full max-w-xs`).
- Section padding: `py-16 px-4`.

---

## Section 6 — The Closed Loop

### Goal
Differentiate through product architecture. While competitors also have boards, voting, and changelogs, IdeaRoads is the only tool where these six capabilities form a deliberate closed loop — where the output of the last step (Notify) feeds back into the first step (Collect). This section is for visitors who are already interested and want to understand HOW the system works end-to-end.

### User Intent
"How does this all fit together? If I ship a feature, will the voters who asked for it actually get notified? I don't want to manually track who voted for what." The visitor is evaluating architecture, not features. They have already passed the decision threshold — now they want to understand what they are buying into.

### Content Hierarchy

**1. Eyebrow**
Text: `THE FULL PICTURE`
Styling: `text-xs font-bold uppercase tracking-eyebrow text-success`

**2. Section Heading**
Text: `Any tool can collect feedback. Only IdeaRoads closes the loop.`
Styling: `font-bold text-3xl` (mobile) `text-4xl` (desktop). `mt-4`. `max-w-3xl`.

**3. The Loop Diagram**

Six nodes arranged horizontally with connecting arrows. A curved return arrow connects the final node (Notify) back to the first node (Collect), completing the loop.

`mt-12`.

**Node structure (identical for all six):**

- Step number: `01` through `06`. `font-mono text-xs text-muted-foreground`. Positioned top-left of the node or above the title.
- Step name: `font-semibold text-sm text-foreground`
- Step description: `text-xs leading-5 text-muted-foreground`
- Container: `bg-card border border-border p-4`. No radius. Width approximately equal across all six.

**Node content:**

| # | Name | Description |
|---|---|---|
| 01 | Collect | Users submit feature requests and bug reports to your public boards |
| 02 | Vote | Votes surface what matters most — one per user, no gaming |
| 03 | Plan | Voted posts auto-populate your public roadmap by status |
| 04 | Ship | Admin changes post status to Completed when it's done |
| 05 | Announce | Write a changelog entry linked to the shipped feedback |
| 06 | Notify | Every voter automatically gets an email when you ship |

**Connecting arrows between nodes:**
A `→` arrow or a right-pointing chevron rendered as a thin `1px` horizontal line with an arrowhead. Color: `border-border`. This is a CSS/border-based implementation — no SVG, no external diagram library.

**Loop-back arrow:**
A visible curved or L-shaped line that travels below the six nodes, connecting from node 06 (Notify) back to node 01 (Collect). This is the most important visual element in the diagram — it is what makes the "loop" concept literal, not just metaphorical.
On desktop: a horizontal bar below the nodes with upward ticks at each end.
Implementation: a `div` with `border-b border-l border-r border-border` styled to look like a U-shape beneath the row of nodes. Pure CSS, no SVG.

**4. Closing Quote**

Positioned below the loop diagram. `mt-12`. Full width of the content column.

Text: `"Any single piece is a commodity. The integration is what makes it sticky."`

Styling: `text-xl font-semibold text-foreground text-center`. Wrapped in a `blockquote`. Max width `max-w-2xl mx-auto`. No quotation-mark styling (no large decorative `"` character — the content carries itself).

### CTA
None. This section is architectural — it deepens understanding for visitors who are already convinced. A CTA here would interrupt a moment of comprehension. The next section (Quick Start) contains the final CTA.

### Desktop Behavior
- Section padding: `py-20 px-8`. Container: `max-w-6xl mx-auto`.
- Loop diagram: `grid grid-cols-6 gap-3` — all six nodes in one row.
- Connecting arrows: positioned between the grid columns using `::after` pseudo-elements or a thin horizontal line overlay.
- Loop-back visual: rendered as a CSS bordered U-shape spanning the full width of the diagram, `mt-4` below the node row.
- Closing quote: `mt-16 max-w-2xl mx-auto text-center`.

### Mobile Behavior
- Loop diagram becomes a 2×3 grid: `grid grid-cols-2 gap-3`.
- Step numbers (01–06) are the primary sequential indicator on mobile since the visual flow connectors are removed.
- The loop-back arrow is NOT rendered on mobile — it becomes a caption instead: a `text-xs text-muted-foreground text-center mt-4` note reading: `The loop closes — 06 feeds back into 01.`
- Closing quote: `text-lg` on mobile (reduced from `text-xl`).
- Section padding: `py-16 px-4`.

---

## Section 7 — Quick Start

### Goal
Remove the last remaining objection: "Is this too hard to set up?" Convert visitors who are ready to act by making deployment feel immediate and concrete. This section is the activation threshold — visitors who reach it with remaining intent should leave with enough confidence to click the CTA.

### User Intent
"Okay, I want to try this. How long will it actually take? Do I need a cloud account? What do I need to configure?" The visitor is making a deployment effort estimate. The section must make the effort feel minimal without lying about what is required.

### Content Hierarchy

**1. Eyebrow**
Text: `QUICK START`
Styling: `text-xs font-bold uppercase tracking-eyebrow text-success`

Note: on the dark background, `text-success` renders in emerald against near-black — this creates the correct contrast. Do not change to `text-primary-foreground` for the eyebrow.

**2. Section Heading**
Text: `One command. Your own server.`
Styling: `font-black text-3xl text-primary-foreground` (mobile) `text-4xl` (desktop). `mt-4`.

Font weight is `font-black` here (not `font-bold`) — matching the hero. This is a declarative, confident statement, not a feature description.

**3. Section Subtext**
Text: `No cloud account. No credit card. No vendor.`
Styling: `text-lg text-primary-foreground/70 mt-3`. The three "no" statements directly neutralize the three implicit objections at this stage of the visitor's decision process.

**4. Three Steps**

Numbered steps displayed vertically. Each step: step number + step label + code block.

`mt-10`.

**Step 1 — Clone**
- Label: `1. Clone the repo`
- Label styling: `text-sm font-semibold text-primary-foreground/90`
- Code block content:
  ```
  git clone GITHUB_REPO_URL
  ```
- Code block background: `bg-primary-foreground/5 border border-primary-foreground/15` — slightly lighter than the dark section background.
- Code text: `font-mono text-sm text-primary-foreground`.
- Copy-to-clipboard button: a `Copy` icon (Lucide, `size-4`) positioned top-right of the code block. On click: copies the command. This is the one interactive element on the page that gracefully degrades — if JS is disabled, the button is not rendered (use `suppressHydrationWarning` on this component).

**Step 2 — Configure**
- Label: `2. Configure your environment`
- Code block content:
  ```
  cp .env.example .env
  # Edit DATABASE_URL, BETTER_AUTH_SECRET, and SMTP_HOST
  ```
- Comment line uses `text-primary-foreground/40` to visually distinguish it from the command.

**Step 3 — Start**
- Label: `3. Start the stack`
- Code block content:
  ```
  docker compose up -d
  # App runs at http://localhost:3000
  ```

**5. Secondary Link**
Text: `Full self-hosting guide →`
Styling: `text-sm text-primary-foreground/60 hover:text-primary-foreground transition-colors`. Plain text link, no button styling. → `DOCS_URL`.
Positioned: `mt-6`.

**6. Final CTA**
`mt-10`. Horizontally left-aligned with the steps (not centered, unlike the features CTA — this section has a more editorial layout).

Button: **Get Started Free** — `variant="secondary"` on dark background (renders as a light button). → `/signin`.

### CTA
- Primary (final): **Get Started Free** → `/signin`
- Secondary text link: **Full self-hosting guide →** → `DOCS_URL`

### Desktop Behavior
- Section padding: `py-24 px-8`. Container: `max-w-6xl mx-auto`.
- Two-column layout: steps on the left (60% width), a supplementary panel on the right (40%).
- Right panel content: a simple callout card (`bg-primary-foreground/5 border border-primary-foreground/15 p-8`) listing what the stack includes — "PostgreSQL + Drizzle", "Better Auth (Magic Link + Google)", "pg-boss job queue", "Email via SMTP", "Orbit admin panel". Title: `What's included`. This replaces the scaffold's feature checklist card with accurate, production-relevant information.
- Steps are full-height on the left. Right panel is vertically top-aligned.
- The final CTA and guide link are below the left-column steps.

### Mobile Behavior
- Single column. Right panel (What's included) is rendered below the steps, not beside them. It is optional on mobile — if it creates scroll fatigue, it can be omitted on mobile via a `hidden sm:block` modifier.
- Each code block is full width. Copy button is always visible (not hover-only) on mobile — touch targets require persistent buttons.
- Section padding: `py-20 px-4`.
- CTA button: full width `w-full max-w-xs`.

---

## Section 8 — Footer

### Goal
Provide navigation for visitors who have scrolled to the end without converting. Offer links to GitHub, docs, and legal. Signal that IdeaRoads is a genuine project with real infrastructure (docs, contributing guide, license) — not an abandoned prototype.

### User Intent
Either: researching before making a final decision (looking for docs or GitHub), or done with the page and leaving. Neither group needs marketing copy at this point. The footer is pure navigation.

### Content Hierarchy

**Upper Footer — link columns**

Three columns. `grid grid-cols-3 gap-8`.

**Column 1 — Product**
Heading: `Product`
Links: Features (scrolls to section 5), Roadmap (links to IdeaRoads's own public roadmap, post-MVP), Changelog (links to IdeaRoads's own changelog, post-MVP)

Note: At MVP, Roadmap and Changelog links in the footer point to the GitHub repo until IdeaRoads uses its own product for these pages.

**Column 2 — Developers**
Heading: `Developers`
Links: Documentation → `DOCS_URL`, GitHub → `GITHUB_REPO_URL`, Contributing → `GITHUB_REPO_URL/blob/main/CONTRIBUTING.md`

**Column 3 — Legal**
Heading: `Legal`
Links: MIT License → `GITHUB_REPO_URL/blob/main/LICENSE`, Privacy Policy (post-MVP — omit at MVP or mark "Coming soon" in `text-muted-foreground/40`)

**Logo + Tagline — left of the columns, or above them**

On desktop: logo + tagline placed in a fourth column to the left of the three link columns (4-column total grid).
On mobile: logo + tagline appear above the three link columns, full width.

Logo: IdeaRoads wordmark, `font-black text-base`. Links to `/`.
Tagline: `text-sm text-muted-foreground mt-1`. Text: `Open-source customer feedback. Self-hosted. MIT licensed.`

**Lower Footer — bottom bar**

`border-t border-border mt-10 pt-6`.

Text: `Built with IdeaRoads. © 2026 IdeaRoads contributors. MIT License.`
Styling: `text-xs text-muted-foreground`.
Alignment: center on mobile, flex space-between with optional GitHub link on desktop.

### CTA
None. The footer is navigation, not a conversion surface.

### Desktop Behavior
- Background: `bg-background border-t border-border`.
- Section padding: `pt-16 pb-8 px-8`. Container: `max-w-6xl mx-auto`.
- Grid: `grid grid-cols-4 gap-12` — logo/tagline in column 1, three link groups in columns 2-4.
- Column headings: `font-medium text-sm text-foreground mb-4`.
- Links: `block text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 py-1`.

### Mobile Behavior
- Logo + tagline: full width, `mb-8`.
- Three link columns: `grid grid-cols-3 gap-4` — still three columns on mobile, but narrow.
- If viewport is very narrow (<375px): `grid-cols-1`, each column group stacks vertically.
- Bottom bar: centered text, single line.
- Section padding: `pt-12 pb-6 px-4`.

---

## CTA Placement Summary

| Position | Section | Button Text | Destination | Context |
|---|---|---|---|---|
| 1 | Nav (persistent) | Get Started | `/signin` | Impulse — always visible |
| 2 | Hero | Get Started Free | `/signin` | First conversion moment |
| 3 | Features Grid (inline) | Get Started Free | `/signin` | Post-feature-scan conversion |
| 4 | Quick Start (final) | Get Started Free | `/signin` | Post-activation-cost conversion |

Secondary CTAs:
| Position | Section | Text | Destination |
|---|---|---|---|
| Hero | View on GitHub ★ | GitHub repo | Opens new tab |
| Quick Start | Full self-hosting guide → | `DOCS_URL` | Text link |

---

## `config/platform.ts` Required Additions

The following constants must be added to `config/platform.ts` before implementation begins. They do not exist yet.

```
GITHUB_REPO_URL  — the full GitHub URL for the IdeaRoads repository
DOCS_URL         — the documentation URL (GitHub docs folder or external docs site)
PRODUCT_NAME     — update from "IDEA ROADS" to "IdeaRoads" (mixed case)
PRODUCT_DESCRIPTION — update from scaffold description to:
                      "Open-source customer feedback, voting, and changelog. Self-hosted. MIT licensed."
```

---

## Route Structure

```
app/
├── page.tsx                    → if authenticated: redirect("/post-auth")
│                                 if not: render landing page sections inline
│                                 OR: redirect to (marketing)/page.tsx
└── (marketing)/
    ├── layout.tsx              → Nav + Footer components only. No auth context. No sidebar.
    └── page.tsx                → export const dynamic = 'force-static'. All 8 sections.
```

The `(marketing)` route group isolates the landing page from the workspace and auth route groups. No middleware applies to it. No session checks except the redirect-if-authenticated case in `app/page.tsx`.

---

## Component File Map

```
components/marketing/
├── nav.tsx                     Section 1 — sticky navigation bar
├── hero.tsx                    Section 2 — dark hero section
├── trust-bar.tsx               Section 3 — horizontal trust signals
├── differentiators.tsx         Section 4 — three OSS/self-hosted/free-voters cards
├── features-grid.tsx           Section 5 — six feature cards + inline CTA
├── loop-diagram.tsx            Section 6 — six-node closed loop + closing quote
├── quick-start.tsx             Section 7 — dark three-step section + final CTA
├── footer.tsx                  Section 8 — footer columns + bottom bar
└── cta-button.tsx              Shared — CTA button used across sections
```

Components in `components/marketing/` are isolated from app components in `components/ui/`, `components/boards/`, etc. They import from `components/ui/` but are never imported by app components.

---

## SEO Metadata

Implemented via `generateMetadata()` in `app/(marketing)/page.tsx` or `app/layout.tsx`.

| Field | Value |
|---|---|
| `<title>` | `IdeaRoads — Open-source customer feedback & feature voting` |
| `<meta name="description">` | `Self-hosted feedback boards, voting, public roadmap, and changelog. MIT licensed. Deploy in 5 minutes with Docker.` |
| `og:title` | Same as `<title>` |
| `og:description` | Same as `<meta description>` |
| `og:image` | `/public/og-image.png` — a 1200×630 static social card. At MVP, this can be a plain dark card with the IdeaRoads wordmark and tagline. Do not use the product screenshot for og:image — it is too small to be legible at social card dimensions. |
| `twitter:card` | `summary_large_image` |
| `twitter:title` | Same as `og:title` |
| `twitter:description` | Same as `og:description` |

---

## Acceptance Criteria

- [ ] Page renders at `/` without authentication
- [ ] Authenticated user is redirected to `/post-auth` on visiting `/` (routes to workspace, Orbit, or onboarding)
- [ ] Page renders correctly with JavaScript disabled (full SSR)
- [ ] All nav links are functional: wordmark, Docs, GitHub, Sign In, Get Started
- [ ] GitHub star count renders when fetch succeeds; "GitHub" renders without count when fetch fails
- [ ] Hero screenshot renders. Alt text is set correctly.
- [ ] Trust bar renders all 6 signals on desktop in a single row
- [ ] All three differentiator cards render with correct copy
- [ ] All six feature cards render with correct icons, titles, and descriptions
- [ ] Loop diagram renders all 6 nodes in a horizontal row on desktop ≥ 1280px
- [ ] Loop diagram renders in a 2×3 grid on mobile
- [ ] Loop-back caption renders on mobile
- [ ] Closing quote renders below the loop diagram on all viewports
- [ ] All three Quick Start code blocks render correctly
- [ ] Copy-to-clipboard button is present on each code block
- [ ] Final CTA and "Full self-hosting guide →" link render below Quick Start steps
- [ ] Footer renders all 3 link columns and bottom bar
- [ ] No broken links anywhere on the page
- [ ] `<title>` and `<meta description>` are set correctly
- [ ] `og:image` is set
- [ ] Page scores ≥ 90 on Lighthouse Performance (desktop)
- [ ] No horizontal scroll on any section at 375px viewport width (exception: Quick Start code blocks may scroll horizontally on very long commands)
