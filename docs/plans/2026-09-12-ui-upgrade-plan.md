# iPrompt Studio UI Upgrade Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade the existing iPrompt Studio pages into a restrained, premium Eastern-minimal interface while preserving all existing routes and behavior.

**Architecture:** Keep the existing Next.js App Router and server-side data flow. Centralize the visual system in `globals.css`, then apply it through the existing navigation, card, search, pagination, and page components. No API, database, or authentication changes.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, existing local case images.

---

### Task 1: Establish the visual system

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

**Steps:**
1. Add paper, ink, muted sage, vermilion, rule, shadow, and spacing tokens.
2. Add reusable classes for display titles, eyebrow labels, hairline rules, editorial buttons, image frames, and subtle paper texture.
3. Improve global selection, focus-visible, scrollbar, responsive container, and footer behavior.
4. Add a small footer brand note without changing navigation behavior.

### Task 2: Refine global navigation and controls

**Files:**
- Modify: `src/components/SiteNav.tsx`
- Modify: `src/components/NavAuth.tsx`
- Modify: `src/components/SearchBox.tsx`
- Modify: `src/components/CategoryTabs.tsx`
- Modify: `src/components/Pagination.tsx`

**Steps:**
1. Add a compact mark, active-link treatment, and editorial navigation spacing.
2. Align auth controls with the same button and pill language.
3. Replace default input/button styling with a quiet search control and visible keyboard focus.
4. Make category and pagination states more legible while retaining existing URLs.

### Task 3: Upgrade content cards and actions

**Files:**
- Modify: `src/components/CaseCard.tsx`
- Modify: `src/components/CaseImage.tsx`
- Modify: `src/components/FavoriteButton.tsx`
- Modify: `src/components/CopyButton.tsx`

**Steps:**
1. Add image hover treatment, metadata numbering, and consistent card rhythm.
2. Improve favorite and copy affordances without changing their handlers.
3. Keep the login guide and clipboard fallback behavior unchanged.

### Task 4: Apply page-level compositions

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/explore/page.tsx`
- Modify: `src/app/case/[num]/page.tsx`
- Modify: `src/app/match/page.tsx`
- Modify: `src/components/SubscribeForm.tsx`

**Steps:**
1. Recompose the landing page as a branded editorial split layout with a case index and quiet decorative marks.
2. Add stronger explore-page heading, spotlight framing, grid rhythm, and results summary.
3. Rebalance detail-page image/prompt columns and style prompt sections as an archival reading panel.
4. Add the four-step matching rail and example chips to the placeholder page.
5. Keep all existing links, labels, forms, and server data intact.

### Task 5: Verify the upgrade

**Files:**
- Test: existing `tests/unit/*` and `tests/e2e/smoke.spec.ts`

**Steps:**
1. Run direct Vitest if npm cache permissions prevent `npm run test:unit`.
2. Run `npm run build`.
3. Check `/api/health` returns HTTP 200.
4. Inspect the four updated routes at desktop and narrow widths.
