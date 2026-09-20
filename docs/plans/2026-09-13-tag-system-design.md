# 标签体系设计（类型 × 模型 × 未来扩展）

> 目标：把「类型」「模型」升级为统一的标签化筛选维度，未来风格/场景/来源等都可以挂标签。
> 本文档只做改造方案分析，不含实施。

## 1. 设计判断：两类维度，两种存储

| 维度 | 特性 | 存储方案 |
|---|---|---|
| **模型** | 每条案例**必属且仅属**一个模型；携带配置（数据源/图片目录/描述模板/灰度开关） | 保持 `Model` 表 + `Case.modelId` 外键（现状不动），**UI 层渲染成标签 chip** |
| **类型/风格/场景** | 多值化潜力（一条案例可同时属于「人像摄影」和「电商广告」）；会持续新增 | 新建 `Tag` + `CaseTag` 多对多表 |

**为什么模型不做成 Tag 行**：Model 表本质是注册表（含 dataSource/imageDir/descriptionTpl 等接入配置），硬拆成标签会产生两份真相源；而它的"标签感"在 UI 层实现即可——用户看到的是统一的标签筛选，底层各用最合适的结构。

## 2. 数据模型变更

```prisma
model Tag {
  id        String @id @default(cuid())
  slug      String @unique      // URL 参数值，如 "portrait"（中文显示/英文 slug）
  name      String              // 显示名："人像摄影"
  kind      String              // "type"(12类) | "style" | "scene" | …（未来扩展）
  sortOrder Int    @default(0)
  cases     CaseTag[]
  @@index([kind, sortOrder])
}

model CaseTag {
  caseId String
  tagId  String
  case   Case @relation(fields: [caseId], references: [id], onDelete: Cascade)
  tag    Tag  @relation(fields: [tagId], references: [id], onDelete: Cascade)
  @@unique([caseId, tagId])
  @@index([tagId])
}
```

- `Case.displayCategory` **保留**为"主类型"（兼容现有展示与迁移过渡），类型标签是它的超集
- `Category` 表退化为**纯接入映射配置**（模型原始分类 → 类型标签名的对照表），不再承担页面 Tab 职责
- 12 类作为 `Tag(kind="type")` 种子；`style/scene` 类标签留空架子，未来 AI 打标或手动补充

## 3. 各层改造清单

| 层 | 改造 | 说明 |
|---|---|---|
| Schema | Tag + CaseTag 两表 | 见上 |
| 种子 | 12 类标签种子；Category 配置的映射目标对齐标签名 | |
| 导入 | `import-cases.mjs` 写 CaseTag（按 Category 映射出主类型标签） | 顺带 Case.sourceRepo 字段（生态接入预留） |
| 服务 | 新增 `tag-service`（标签列表+计数）；`case-service.listCases` 加 `tag` 参数（`caseTags: { some: { tag: { slug } } }`） | |
| **页面** | explore 页头改两行筛选：**模型行**（chips，读 Model 注册表 active 项——Phase B 的模型切换 UI 在此落地）+ **类型行**（chips，读 Tag kind=type） | URL：`/explore?model=x&tag=y` |
| 组件 | CaseCard / 详情页挂标签 chips（模型 + 主类型） | |
| API | `/api/tags`（按 kind 列标签+计数） | 收藏/统计用 |

## 4. 与既定路线的关系

- **Phase B（模型切换 UI）被本方案吸收**——模型行筛选就是它
- **生态接入（E 批次）的前置**：外部语料进来后靠标签挂 12 类，跨模型统一浏览成立
- 改造推荐区不受影响（`?view=curated` 独立视图）

## 5. 分期

| 阶段 | 内容 | 工作量 |
|---|---|---|
| **T1** | 两表 + 种子 + 导入写标签 + tag/case 服务 + explore 两行筛选（模型行+类型行）+ 卡片 chips + TDD | 1~1.5 天 |
| T2 | 多标签组合筛选（AND/OR）、标签计数 API、风格标签 AI 打标 | 按需 |

## 6. 待拍板

1. 模型走"外键 + UI 标签 chip"（推荐）还是真做成 Tag 行？（推荐前者，理由见 §1）
2. 类型筛选起步**单选**（简单，与现状一致）还是直接**多选**（`?tags=a,b` AND 语义）？
3. 12 类的中文显示名直接用《01-提示词类型体系》的类名（人像摄影/电商广告/海报插画…）？
