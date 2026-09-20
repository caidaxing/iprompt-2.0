# 改造案例推荐与分批生图 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 接入 48 条改造案例推荐，并完成首批 10 张图片的生成、备份和替换。

**Architecture:** 服务端从 48 条提示词清单读取选中案例编号，再从现有案例服务获取完整案例摘要；探索页在默认浏览状态下渲染独立的分组推荐区。图片采用内置 imagegen 逐张生成，生成结果经过文件检查后复制到项目图片目录，原图保留在 `_originals` 目录用于回滚。

**Tech Stack:** Next.js 16 App Router, React Server Components, TypeScript, Prisma/SQLite, Vitest, built-in imagegen.

---

### Task 1: 添加推荐数据组装与测试

**Files:**
- Create: `src/lib/curated-recommendations.ts`
- Test: `tests/curated-recommendations.test.ts`

**Step 1: Write the failing test**

覆盖清单加载、12 个场景分组、每组 3 个主推 + 1 个备用、编号唯一和缺失案例拒绝。

**Step 2: Run test to verify it fails**

Run: `& '.\\node_modules\\.bin\\vitest.ps1' run tests/curated-recommendations.test.ts`

Expected: FAIL because the recommendation loader does not exist.

**Step 3: Write minimal implementation**

实现服务端可用的清单加载与分组函数，返回场景、角色和案例编号，不改变原始 `data/cases.json`。

**Step 4: Run test to verify it passes**

Run: `& '.\\node_modules\\.bin\\vitest.ps1' run tests/curated-recommendations.test.ts`

Expected: PASS.

### Task 2: 将推荐区放到案例浏览核心位置

**Files:**
- Create: `src/components/CuratedRecommendations.tsx`
- Modify: `src/app/explore/page.tsx`

**Step 1: Write the failing test**

扩展推荐数据测试，确认主推和备用的展示数量与场景顺序稳定。

**Step 2: Run test to verify it fails**

Run: `& '.\\node_modules\\.bin\\vitest.ps1' run tests/curated-recommendations.test.ts`

Expected: FAIL on the new display-shape assertion.

**Step 3: Write minimal implementation**

默认探索页在分页列表前渲染“改造推荐”，每个场景展示 3 张主推卡片并在末尾展示备用池；带搜索或分类参数时保持原有筛选结果优先。

**Step 4: Run test to verify it passes**

Run: `& '.\\node_modules\\.bin\\vitest.ps1' run tests/curated-recommendations.test.ts`

Expected: PASS.

### Task 3: 生成首批 10 张并安全替换

**Files:**
- Create: `public/images/cases/_originals/` (runtime backup directory)
- Create: `public/images/cases/_generated/batch-01/` (batch staging directory)
- Modify: the 10 selected case image files after generation validation.

**Step 1: Generate**

使用内置 imagegen，按 10 个案例的 `revisedPrompt` 逐张生成，保留每张返回的本地输出路径和案例编号。

**Step 2: Validate**

检查每个输出文件存在、可读取、为有效 raster image，并确认 10 个案例编号一一对应。

**Step 3: Backup and replace**

复制原始案例图片到 `_originals`，再将验证通过的新图复制为对应案例的稳定文件名；不改数据库和案例编号。

### Task 4: 端到端验证第一批

**Files:**
- Test: `tests/curated-recommendations.test.ts`

**Step 1: Run unit tests**

Run: `& '.\\node_modules\\.bin\\vitest.ps1' run`

Expected: all test files and tests pass.

**Step 2: Verify service**

Run: `Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3000/api/health'`

Expected: HTTP 200.

**Step 3: Verify browser**

Open `/explore`, confirm “改造推荐”、12 个场景、首批新图片和案例链接可见。

**Step 4: Report batch status**

报告已生成数量、已替换数量、备份位置、失败项和下一批候选编号；只有第一批核验完成后再继续下一批。
