# CLAUDE.md

## Design Philosophy

This product must never feel AI-generated.

Every UI, component, page, and interaction should feel like it was designed by an experienced product designer working on a successful SaaS product.

Design decisions should prioritize usability, clarity, consistency, and business value over visual gimmicks.

---

## UI Quality Standards

Before generating any UI:

* Think like a Senior Product Designer.
* Think about user goals first.
* Think about information hierarchy.
* Think about accessibility.
* Think about consistency with existing screens.

Never generate layouts that look like generic AI dashboard templates.

---

## Visual Style

The design language should be:

* Clean
* Professional
* Premium
* Modern
* Minimal
* Product-focused

Avoid:

* Excessive gradients
* Random colors
* Glassmorphism unless explicitly requested
* Overly rounded corners
* Oversized shadows
* Fancy animations without purpose
* Generic hero sections

The UI should resemble high-quality SaaS products rather than AI-generated mockups.

---

## Consistency Rules

Every new page must inherit:

* Existing spacing system
* Existing typography scale
* Existing color palette
* Existing component styles
* Existing interaction patterns

Never introduce a new design pattern if an existing one already solves the problem.

Consistency is more important than creativity.

---

## Layout Guidelines

Always establish:

1. Clear page hierarchy
2. Predictable navigation
3. Logical grouping
4. Proper whitespace
5. Responsive behavior

Avoid:

* Empty whitespace without purpose
* Overcrowded layouts
* Misaligned sections
* Random card placements

---

## Typography

Typography should create hierarchy naturally.

Rules:

* Use consistent font sizes
* Use consistent font weights
* Avoid excessive text styles
* Prioritize readability

Headings should clearly communicate page structure.

---

## Components

Components must feel production-ready.

Every component should include:

* Hover states
* Focus states
* Disabled states
* Loading states
* Empty states
* Error states

Never generate incomplete components.

---

## Forms

Forms should:

* Be easy to scan
* Have logical grouping
* Use clear labels
* Include validation feedback
* Have helpful descriptions when necessary

Avoid long walls of inputs.

---

## Tables

Tables should:

* Support sorting where appropriate
* Support searching where appropriate
* Handle empty states
* Handle loading states
* Be responsive

Never generate basic placeholder tables.

---

## Dashboard Pages

Dashboards should focus on:

* Key metrics first
* Actionable insights
* Logical content grouping
* Clear user workflows

Avoid dashboard designs that consist only of random statistic cards.

Every metric shown should have a purpose.

---

## Mobile Experience

Every generated page must be mobile-first.

Verify:

* Touch targets
* Readability
* Responsive layouts
* Navigation usability

No horizontal scrolling unless intentionally required.

---

Design Review Checklist

Before finalizing any UI, perform one design review pass.

Check:

- Does this look human-designed?
- Does it match the existing product?
- Is spacing consistent?
- Is typography consistent?
- Is hierarchy obvious?
- Would a professional SaaS company ship this?
- Does it help users complete their tasks efficiently?

If major issues are found, make one improvement pass before finalizing.
Avoid endless redesign cycles.

---

## Implementation Quality

Generated code must:

* Be production-ready
* Be maintainable
* Follow project conventions
* Reuse existing components
* Avoid duplication
* Avoid unnecessary complexity

Always prefer scalable architecture over quick implementation.

---

## Final Rule

Never generate UI that looks AI-generated.

Generate UI that feels like it was created by an experienced product designer and frontend engineer working together on a premium SaaS product.