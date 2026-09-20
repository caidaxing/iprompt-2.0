# Hide Prompt Attribution Metadata Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prevent public display of any case whose prompt contains `**作者**:` or `**来源**:`, while preserving the underlying data.

**Architecture:** Add one reusable Prisma where-clause fragment in the case service and apply it to every public case lookup or aggregate. This makes the visibility rule consistent for lists, detail routes, neighbor links, and count badges without a schema migration.

**Tech Stack:** Next.js 16, TypeScript, Prisma 6, SQLite, Vitest.

---

### Task 1: Add a regression test for hidden prompt metadata

**Files:**
- Create: `tests/unit/case-service.test.ts`
- Modify: `src/server/services/case-service.ts`

**Step 1: Write the failing test**

Add a Vitest test that exercises the service with three records: a normal prompt, one containing `**作者**:`, and one containing `**来源**:`. Assert that only the normal case is returned and counted; assert direct lookup and neighbor queries apply the same visibility filter.

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/case-service.test.ts`

Expected: FAIL because the current service returns cases containing either marker.

### Task 2: Add the minimal shared visibility predicate

**Files:**
- Modify: `src/server/services/case-service.ts`
- Test: `tests/unit/case-service.test.ts`

**Step 1: Implement the predicate**

Define a reusable Prisma filter equivalent to:

```ts
{
  NOT: {
    OR: [
      { prompt: { contains: "**作者**:" } },
      { prompt: { contains: "**来源**:" } },
    ],
  },
}
```

Apply it to `listCases`, `getCase`, `getNeighbors`, `modelCounts`, and `categoryCounts`. Preserve the existing model, image, tag, query, ordering, and pagination behavior.

**Step 2: Run the focused test**

Run: `npm run test:unit -- tests/unit/case-service.test.ts`

Expected: PASS.

### Task 3: Verify build and deployed runtime behavior

**Files:**
- Modify: none
- Test: project build and local HTTP responses

**Step 1: Run relevant unit tests**

Run: `npm run test:unit`

Expected: all unit tests pass.

**Step 2: Build the production artifact**

Run: `npm run build`

Expected: Next.js production build exits with code 0.

**Step 3: Rebuild the existing Docker service and verify**

Run: `docker compose up -d --build`

Then verify: `curl -fsS http://127.0.0.1:3000/api/health` and request a known affected case URL, confirming it returns 404. Do not expose environment variables or database contents.

**Step 4: Commit**

This directory has no Git repository, so no commit is possible. Record the changed files and fresh verification output in the handoff.
