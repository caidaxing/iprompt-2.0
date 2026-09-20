# Skills 模块设计（提示词 × Skills 双内容域）

> 背景：平台现有内容域为「提示词案例」（541 条，Case 表，多模型注册表驱动）。用户需要上架自产 Skill（AI Agent 能力包），规划为**独立的第二个内容域**，共享平台底座。
> 参考：生态调研中 `wuyoscar/GPT-Image2-Skill`（5.3k⭐）、`YouMind-OpenLab/ai-image-prompts-skill`（1.0k⭐）均以 Agent Skill 形态分发，验证该方向。

## 1. 核心决策

**Skill 独立建模块，不塞进 Case 体系。** 两者本质不同：

| | 提示词案例 | Skill |
|---|---|---|
| 本质 | 静态文本，复制去生图 | 能力包：指令+脚本+参考文件，供 AI Agent 加载 |
| 消费者 | 人 → 生图模型 | AI 工具（Claude Code / Codex / ZCode / WorkBuddy） |
| 关键字段 | 编号/图片/提示词/分类 | slug/版本/变更日志/文件包/安装方式/许可 |
| 生命周期 | 发布后稳定 | 持续迭代、多版本 |

**共享底座**：账号体系、收藏（S2）、SiteNav/设计系统、三层架构、注册表驱动模式、导入管线模式。

## 2. 数据模型（Phase S1）

```prisma
model Skill {
  id               String  @id @default(cuid())
  slug             String  @unique   // URL 与包名，如 "gpt-image2-poster"
  name             String
  tagline          String            // 一句话简介
  description      String            // 详细说明（Markdown 渲染）
  category         String            // skill 分类（生图提示词/工作流/文案/数据…）
  tags             String  @default("[]") // JSON 数组
  author           String
  license          String  @default("MIT")
  status           String  @default("published") // draft | published
  featured         Boolean @default(false)       // 编辑推荐（列表置顶）
  downloadCount    Int     @default(0)
  applicableModels String  @default("[]") // JSON：适用生图模型 id 数组（关联 Model 注册表）
  createdAt/updatedAt
  versions         SkillVersion[]
  @@index([category, status])
}

model SkillVersion {
  id          String   @id @default(cuid())
  skillId     String
  version     String             // semver："1.0.0"
  changelog   String?
  filePath    String             // "/skills/<slug>-<version>.zip"（public 下）
  fileCount   Int
  sizeBytes   Int
  publishedAt DateTime @default(now())
  skill       Skill @relation(fields: [skillId], references: [id], onDelete: Cascade)
  @@unique([skillId, version])
}
```

要点：
- **不**给 Skill 做 num/displayCategory——那是案例域的概念；skill 用 slug + category
- `applicableModels` 关联 Model 注册表（图像类 skill 标注适用模型），这是两个内容域的打通点
- 收藏 S1 不做；S2 用独立 `SkillFavorite` 表（不做多态）

## 3. 源文件与发布管线（复用案例导入模式）

```
skills/                          # Skill 源目录（入库版本管理）
  gpt-image2-poster/
    SKILL.md                     # 必需，frontmatter: name/description/version/category…
    references/…                 # 可选支持文件
scripts/build-skills.mjs         # 发布管线：zod 校验 frontmatter → 打 zip 到
                                 # public/skills/<slug>-<version>.zip → upsert Skill + SkillVersion
```

- 加/改 skill = 编辑 `skills/` 目录 + 跑 `build-skills.mjs`（幂等），与案例管线同构
- 校验失败的 skill 拒绝发布并列明原因（快速失败）

## 4. 路由与服务（三层架构）

| 层 | 内容 |
|---|---|
| 页面 | `/skills` 列表（分类筛选 + 搜索 + featured 置顶）；`/skills/[slug]` 详情（说明 Markdown + 版本历史 + 获取三件套） |
| API | `GET /api/skills`（列表）、`GET /api/skills/[slug]`、`GET /api/skills/[slug]/download`（下载数 +1 后 302 到文件） |
| 服务 | `skill-service.ts`（列表/详情/下载计数）、`skill-repo.ts` |
| 导航 | SiteNav 增加「Skills」；首页双入口 → 三入口（案例库 / Skills / AI 匹配） |

**获取方式三件套**（详情页）：
1. 下载 zip（解压到 `~/.claude/skills/` 或对应 Agent 的 skills 目录）
2. SKILL.md 一键复制（轻量单文件场景）
3. 安装说明（按平台写清楚：Claude Code / Codex / ZCode 的加载路径）

## 5. 分阶段实施

| 阶段 | 范围 | 工作量 |
|---|---|---|
| **S1 地基** | 两张表 + 发布管线 + /skills 列表/详情 + 下载 API + 导航入口 + TDD 单测与 E2E | 约 1 天 |
| **S2 打通** | SkillFavorite、详情页相关案例推荐、首页三入口、Model 关联的筛选（"适用于 gpt-image-2 的 skills"） | 约半天 |
| **S3 生态** | 用户投稿+审核、评分评论、安装统计、作者主页 | 按需排期 |

S1 明确**不做**：用户上传、评分评论、多态收藏、通用内容引擎（YAGNI）。

## 6. 待用户拍板

1. **Skill 来源**：S1 只上你自产的 skills？还是同时从社区仓库（如 GPT-Image2-Skill）收录改编？
2. **首批上架清单**：你手上有几个 skill、分别是什么领域？
3. **S2 的收藏**：要不要进 S1？（做的话 +2 小时）
