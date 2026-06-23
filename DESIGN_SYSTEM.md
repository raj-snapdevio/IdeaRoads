# DESIGN_SYSTEM.md

## Purpose

This document defines the implementation rules and design system constraints used throughout the application.

All generated UI must follow these rules.

If this file conflicts with CLAUDE.md, DESIGN_SYSTEM.md takes precedence for implementation details.

---

# Design Tokens

Always use design system tokens.

Never hardcode colors.

Forbidden:

* bg-[#...]
* text-[#...]
* border-[#...]
* rgb(...)
* hsl(...)

Use approved tokens only.

Examples:

* bg-background
* bg-card
* bg-primary
* bg-accent
* text-foreground
* text-muted-foreground
* border-border
* bg-destructive
* text-destructive

---

# Border Radius

Only use approved radius tokens.

Do not use arbitrary values.

Forbidden:

* rounded-[12px]
* rounded-[20px]
* rounded-[999px]

Use:

* --radius-xs
* --radius-sm
* --radius-md
* --radius-lg
* --radius-xl

---

# Borders

Standard UI uses 1px borders.

Avoid:

* border-2
* border-4
* thick borders

Exception:

* Active tab indicators
* Explicit design requirements

---

# Shadows

Do not use shadows unless explicitly required.

Forbidden:

* shadow-sm
* shadow-md
* shadow-lg
* shadow-xl

Use borders, spacing, and hierarchy instead.

---

# Typography

Use project font variables only.

Examples:

* font-sans
* font-mono

Do not use:

* inline font families
* custom font declarations

Recommended hierarchy:

* font-medium → labels/navigation
* font-semibold → buttons/cards
* font-bold → page headings
* font-black → hero sections only

---

# Spacing

Use the standard spacing scale.

Avoid arbitrary values.

Forbidden:

* p-[13px]
* gap-[11px]
* mt-[17px]

Prefer:

* 1
* 2
* 3
* 4
* 6
* 8
* 10
* 12

Spacing should feel systematic.

---

# Focus States

Interactive elements must support keyboard navigation.

Preferred pattern:

focus-visible:outline-none
focus-visible:ring-2
focus-visible:ring-ring

---

# Hover States

Hover styles should use approved design tokens.

Avoid random opacity values and custom colors.

---

# Transitions

Prefer:

transition-colors duration-150

Avoid:

duration-300
duration-500
duration-700

unless explicitly required.

---

# Icons

Use a consistent icon system.

Recommended:

* Lucide React

Use consistent sizing across similar UI patterns.

Avoid arbitrary icon dimensions.

---

# Images

Never use HTML img elements.

Always use:

next/image

Requirements:

* width
* height
* alt text

must always be provided.

---

# Loading States

Use skeleton screens whenever possible.

Skeletons should resemble the final layout.

Avoid full-page loading spinners.

---

# Mutation States

Actions that submit data must:

* show loading state
* disable repeated submission
* communicate progress

Prevent double-submits.

---

# Empty States

Every data-driven view should provide:

* helpful messaging
* clear next action
* contextual guidance

Avoid blank screens.

---

# Error States

Error messages should:

* explain the issue
* provide recovery options
* avoid technical jargon

---

# Dialogs

Use proper dialog components.

Avoid:

window.alert()
window.confirm()

Dialogs should include:

* title
* description
* primary action
* secondary action

---

# Tooltips

Use the project's approved tooltip component.

Do not build custom tooltip implementations.

---

# Tables

Large datasets may scroll horizontally.

Do not force complex responsive transformations that reduce usability.

Prioritize readability.

---

# Truncation

When truncating text:

* use truncate
* ensure parent containers support shrinking

Avoid hidden overflow hacks that break layouts.

---

# Accessibility

All interactive elements must:

* be keyboard accessible
* provide focus states
* include accessible labels where necessary

Accessibility is required.

---

# Final Rule

When implementing UI:

1. Follow CLAUDE.md for design intent.
2. Follow DESIGN_SYSTEM.md for implementation details.
3. Prefer consistency over customization.
4. Prefer system rules over personal preference.
