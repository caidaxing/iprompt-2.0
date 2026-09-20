# 多模型架构改造设计（Phase A：模型维度地基）

> **状态：Phase A 已完成（2026-09-13）**——单测 23/23、E2E 9/9、构建通过；541 案例全部带 modelId 重建，注册表种子（gpt-image-2 + 6 分类）入库，收藏链路 caseId 化。备份：`prisma/dev.db.backup-20260913`。
>
> 背景：产品将从「GPT-Image-2 单模型案例库」演进为「多生图模型提示词工作站」（Nano Banana Pro / 豆包 Seedream / Grok Imagine 等）。
> 生态参考（2026-09-13 调研）：Nano Banana Pro 有 13.4k⭐ 提示词仓库（YouMind-OpenLab/awesome-nano-banana-pro-prompts，10,000+ 条带预览图）、Seedream 4.5 有专项仓库（awesome-seedream-4.5）、中文全覆盖仓库（dongyubin/Awesome-AI-Images-Prompts）——**新模型的数据源是现成的，架构必须先具备承接能力**。

## 1. 目标

- 给数据与全链路加「模型（model）」一等维度，使新增模型 = 新增一份数据源 + 一条注册配置，不改架构。
- **Phase A（本次）**：只打地基——数据模型 + 服务层 + 收藏链路改造，UI 保持现状（单模型下用户无感知）。
- **Phase B（接入第一个新模型时）**：多源导入 + 模型切换 Tab + per-model 分类映射（本档只给 runbook，不实施）。

## 2. 设计原则

1. `model` 是案例的一等属性，不是分类（各模型提示词语法不同，案例库/展示分类/改造提示词均 per-model）。
2. 现有 GPT-Image-2 数据、路由、页面、SEO 零破坏；不带 model 参数的 URL 一律默认 `gpt-image-2`。
3. 模型注册表集中一处（`src/lib/models.ts`），前端/服务层不散落硬编码。

## 3. 模型注册（数据库表配置：加模型 = 插数据，零代码改动）

设计目标：**模型的映射在表里配置；每段提示词的模型归属是一个字段**。导航/筛选/导入全部读表，加模型不改代码、不重新部署。

### 表设计

**Model（模型注册表）**

| 字段 | 说明 |
|---|---|
| `id` | `"gpt-image-2"`，同时是 `?model=` 参数值 |
| `name` | 筛选项显示名（"GPT-Image-2"） |
| `active` | 灰度开关：false 不出现在筛选/导航 |
| `isDefault` | 默认模型（URL 不带 model 参数时用它） |
| `sortOrder` | 筛选项排序 |
| `dataSource` / `imageDir` / `descriptionTpl` | 数据源路径 / 图片目录 / 案例描述模板（`{title} {category} {modelName}` 占位符），供导入脚本用 |

**Category（模型展示分类 + 原始分类映射，跟着模型走）**

| 字段 | 说明 |
|---|---|
| `modelId` + `name` | 属于哪个模型 + Tab 名（"产品静物"） |
| `rawAliases` | 原始分类别名 JSON 数组（如 `["🛍️ 商品与电商","🏷️ 品牌与标志"]`），**导入时按它把数据源原始分类映射到该展示分类——映射在表里配** |
| `sortOrder` | 分类 Tab 排序 |
| `@@unique([modelId, name])` | — |

**Case（案例）**：`modelId` 字段 = 每段提示词的模型归属；`displayCategory` 保留为字符串（取值来自 `Category.name`，由导入脚本按 `rawAliases` 映射写入，现有查询零改动）。

### 运行机制

- **导航/分类 Tab**：server component 读 `Model(active)` + `Category`（个位数小表，进程内缓存 60s）——新模型插入后筛选立即多一项
- **导入脚本**：遍历 Model 表 active 行 → 读各自 `dataSource` → 按 `rawAliases` 映射分类 → upsert
- **案例查询**：`where modelId`；不带参数时用 `isDefault` 行
- **类型安全兜底**：zod 校验注册行结构 + 导入前校验数据文件

### 加模型三步（纯数据操作）

① `Model` 表插 1 行 + `Category` 表插该模型的展示分类几行（映射就在这里配） → ② 放 `data/cases-<id>.json` → ③ 跑 `import-cases.mjs`。

## 4. 数据模型变更（prisma/schema.prisma）

| 表 | 现状 | 改为 |
|---|---|---|
| `Model`（新增） | — | 模型注册表，见 §3 |
| `Category`（新增） | — | 模型展示分类 + rawAliases 映射，见 §3 |
| `Case` | `num Int @id`（编号即全局主键，单模型假设） | 新增 `id String @id @default(cuid())` 代理主键；`modelId String` 外键指向 `Model`（★ 每段提示词的模型归属字段）；`num Int` 降为模型内业务编号；`@@unique([modelId, num])`；索引改 `@@index([modelId, displayCategory, num])` |
| `Favorite` | `caseNum Int` + `@@unique([userId, caseNum])` | `caseId String` 外键指向 `Case.id` + `@@unique([userId, caseId])`（跨模型不歧义） |
| 其余表 | User / VerificationCode / RefreshToken / Subscriber | **不动**（与模型无关） |

种子数据：`Model` 表 1 行（gpt-image-2，isDefault）+ `Category` 表 6 行（现有 6 展示分类，rawAliases 搬自现有 CATEGORY_MAP）。

## 5. 代码改造清单（Phase A）

| 层 | 文件 | 改动 |
|---|---|---|
| Schema | `prisma/schema.prisma` | 新增 Model / Category 表（§4） |
| 注册仓储 | `server/repositories/model-config-repo.ts` | 新增：读 Model/Category（zod 校验 + 进程内缓存 60s），提供 `getActiveModels / getDefaultModel / getCategories(modelId)` |
| 服务层 | `services/case-service.ts` | `ListQuery` 加 `model`（缺省用 isDefault）；`listCases / getCase / getNeighbors / categoryCounts` 全部带 `where modelId`；`CaseSummary / CaseFull` 增加 `id` 字段 |
| 服务层 | `services/favorite-service.ts` | `toggleFavorite / listFavorites / favoriteSetOf / favoriteCount` 改按 `caseId`；收藏列表 join `Case` 取案例信息 |
| API | `api/favorites/route.ts` | POST 参数 `num` → `caseId`（zod 同步）；GET 返回不变 |
| 组件 | `FavoriteButton.tsx` | props 加 `caseId`，请求体改 `caseId` |
| 页面 | `case/[num]/page.tsx`、`explore/page.tsx` | 取 `c.id` 传给 FavoriteButton；`getCase(num)` 内部默认模型，路由不变；分类 Tab 改从 model-config-repo 渲染 |
| 脚本 | `scripts/import-cases.mjs` | 读 Model 表配置遍历 active 模型，按 `rawAliases` 映射分类，upsert 键改 `(modelId, num)`，描述用 `descriptionTpl` 生成 |

**不改动**：认证/限流/邮件/订阅、SiteNav、落地页、探索页布局、图片路径（DB 已本地化的 `/images/cases/caseN.ext` 保持）。

## 6. 数据迁移方案（二选一，默认推荐 ①）

现状：`dev.db` 内 541 案例 + 4 用户 + 7 订阅 + 3 收藏，**全部为测试数据**。

- **① 重置重建（推荐，约 10 分钟）**：备份 `dev.db` → 改 schema → `prisma db push`（重建表）→ 重跑 `import-cases.mjs`（541 条回填，含 model）→ 重跑 `localize-image-paths.mjs`（图片路径回写本地）。代价：3 条测试收藏/4 用户/7 订阅清零（上线前反正会清库）。
- **② 逐表迁移脚本（约再 +2 小时）**：`Case` 表重建时在 JS 内生成 id 并回填，`Favorite` 按 num→caseId 映射改写。仅当想保留现有测试用户数据时才值得。

## 7. URL 兼容性（Phase A 不变，Phase B 预留）

- A：`/explore?cat=&q=&page=` 与 `/case/[num]` 保持原样，服务端默认 `model=gpt-image-2`。
- B：新增 `?model=<id>` 参数；导航加模型切换；不带参数 = 默认模型（老链接永不失效）。若未来某模型编号体系复杂，再评估 `/case/[model]/[num]`。

## 8. 测试与验收

1. 迁移后 `Case.count = 541`、全部 `model = gpt-image-2`、`num` 连续性与迁移前一致。
2. 单测 17/17 通过（favorite 相关断言按 caseId 调整）。
3. E2E 9/9 通过（登录→收藏→我的全链路自动覆盖新外键）。
4. 手测：/explore、/case/1、收藏/取消收藏、收藏列表、我的页收藏数。

## 9. Phase B Runbook（接入第一个新模型时照此执行，本次不做）

1. **选数据源**：Nano Banana → `YouMind-OpenLab/awesome-nano-banana-pro-prompts`（13.4k⭐，带预览图）；豆包 Seedream → `awesome-seedream-4.5` + `dongyubin/Awesome-AI-Images-Prompts`（中文全覆盖）。逆向整理成 `data/cases-<model>.json`（字段对齐现有 num/title/category/source/image/prompt）。
2. **注册（插表）**：`Model` 表插 1 行（id/name/dataSource/imageDir/descriptionTpl）；`Category` 表插该模型的展示分类几行（`rawAliases` 即映射配置）。零代码改动。
3. **导入**：`import-cases.mjs` 遍历注册表中 active 模型的 `dataSource` 逐个 upsert；图片下载到各自 `imageDir`。
4. **UI**：`/explore` 加 `?model=` + 导航模型 Tab（选项直接渲染 `MODELS` 中 active 项）；新模型初期可置 `active: false` 灰度，且初期不启用改造推荐区。
5. **提示词库导出**：Obsidian 导出脚本按 `提示词库/<model>/` 分文件夹（脚本读注册表即可）。

## 10. 工作量

Phase A：约半天（含迁移与全量回归）。Phase B：首个模型 1-2 天（主要是数据源逆向整理），后续每模型 ≈ 0.5 天。
