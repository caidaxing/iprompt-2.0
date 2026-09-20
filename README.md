# iPrompt Studio · GPT-Image-2 提示词工作站

> 东方极简风 · 案例浏览 + 账号收藏（一期） · TDD 驱动开发
> PRD：`designs/gpt-image2-studio/PRD-iPrompt-Studio-v1.0.md`（工作区）；效果图：`../exec-*.png`

## 一期已实现（M0-M4 全量落地）

| 模块 | 路由 | 说明 |
|---|---|---|
| 落地页 | `/` | 「把灵感变成可复用的结构化提示词」+ 双入口 + 真实案例视觉 |
| 案例浏览 | `/explore` | 6 分类 Tab + 搜索 + 焦点区 + 18/页分页（01/31 式） |
| 案例详情 | `/case/[num]` | 面包屑 / 大图 / 提示词全文+复制 / 查看原图 / 上下篇 / 404 |
| 登录注册 | `/login` | 邮箱验证码：60s 重发冷却、5 分钟时效、5 次失败锁 15 分钟、自动注册 |
| 收藏 | `/favorites` | 登录后可用；游客点 ♥ 弹登录引导；切换式收藏/取消 |
| 我的 | `/me` | 脱敏邮箱、收藏数、昵称（仅可改一次）、退出登录 |
| AI 匹配 | `/match` | 占位页 + 邮箱订阅收集（去重） |
| 通用 | — | 全局错误边界「服务开小差了」、图裂占位（No.XX 底色）、404 页 |

**测试**：单测 26/26（Vitest）· E2E 14/14（Playwright，生产模式跑：build → start）
**注意**：E2E 必须先 `npm run build`；`.env` 的 `E2E_DEV_CODE=1` 仅供本地测试回显验证码，生产必须删除。

## 技术栈

| 层 | 选型 | 说明 |
|---|---|---|
| 框架 | Next.js 16（App Router, TS） | 全栈单体，前后端同仓 |
| 样式 | Tailwind CSS v4 | 设计 token 见 PRD §6（宣纸底/墨黑/宋体标题） |
| ORM | Prisma 6 | 开发期 SQLite，上线切 PostgreSQL（模型已用可移植类型） |
| 认证 | jose(JWT) + 服务端刷新令牌 | 邮箱验证码登录；访问令牌短时效，刷新令牌入库可吊销 |
| 校验 | zod | 输入边界校验 + 环境变量启动校验 |
| 单测 | Vitest | mock 仓储层，不 mock 服务层 |
| E2E | Playwright | 复用本机 Edge（channel: msedge） |

## 目录结构（按功能组织 + 三层架构）

```
iprompt-studio/
├── prisma/
│   └── schema.prisma        # User / VerificationCode / RefreshToken / Favorite
├── src/
│   ├── app/                 # 路由层（页面 + API 路由，只做 HTTP 编排，不写业务）
│   │   ├── api/health/      # 健康检查
│   │   └── (页面路由待建)    # /browse /favorites /me /login /ai (占位)
│   ├── server/
│   │   ├── config/env.ts    # 环境变量集中定义 + zod 校验（快速失败）
│   │   ├── lib/prisma.ts    # Prisma 单例
│   │   ├── services/        # 服务层：业务规则与编排（待按 TDD 逐需求填充）
│   │   └── repositories/    # 仓储层：数据查询与外部调用（待填充）
│   ├── components/          # UI 组件（待建）
│   └── generated/prisma/    # Prisma 生成产物（已 gitignore）
├── tests/
│   ├── unit/                # Vitest 单测
│   └── e2e/                 # Playwright 端到端
├── .env / .env.example
└── vitest.config.ts / playwright.config.ts
```

**分层规则**：控制器（route.ts）不写业务逻辑 → 服务层不依赖 request/response 对象 → 仓储层负责数据访问、避免 N+1 → 跨层依赖注入，便于单测 mock。

## 常用命令

```bash
npm run dev          # 开发服务 http://localhost:3000
npm run db:push      # 同步 schema 到 SQLite（首次必跑）
npm run db:studio    # 数据库可视化
npm run test:unit    # 单元测试
npm run test:e2e     # 端到端（自动起 dev 服务）
npm run test         # 全量
```

## TDD 工作约定（对齐 PRD）

1. 每条需求（PRD A1-A2 / F1-F7）先写**失败测试**（Given-When-Then 对应断言）
2. 实现至测试通过，再重构
3. 提交前 `npm run test` 全量通过

## 开发期决策记录

- **Prisma 6（非 7）**：Prisma 7 强制 driver adapter + 原生模块新架构，Windows 风险高；6 稳定且切 PostgreSQL 无障碍
- **SQLite 起步**：本机无 PostgreSQL，模型字段全部可移植，上线切库只改 provider 一行
- **Edge 跑 E2E**：`channel: "msedge"`，免去浏览器内核下载
- **验证码明文/令牌明文一律不入库**：只存 sha256 哈希
- **@types/node 固定 ^22**：vitest 5 要求 ≥22，与 Node 22 运行时一致

## 静态资源与邮件

- **图片已本地化**：538 张案例出图（151MB）全部在 `public/images/cases/`，DB 存本地路径 `/images/cases/case<num>.<ext>`，不再直连 GitHub raw。复跑工具：`scripts/download-images.mjs`（重新下载）→ `scripts/localize-image-paths.mjs`（回写 DB）
- **邮件服务已就绪**：默认 `MAIL_PROVIDER=console`（验证码只打服务端日志）；要发真邮件，在 `.env` 配置 `MAIL_PROVIDER=smtp` + `SMTP_HOST/PORT/USER/PASS/MAIL_FROM`（详见 `.env.example`），代码走 nodemailer，无需改动。`E2E_DEV_CODE=1` 回显开关与 provider 无关，独立生效

## 多模型架构（2026-09-13 落地 Phase A）

- **注册表进数据库**：`Model` 表（模型注册：id/名称/active 灰度开关/isDefault/数据源/图片目录/描述模板）+ `Category` 表（每模型的分类 Tab 与 rawAliases 原始分类映射）。**加模型 = 插表 + 放数据 + 跑导入，零代码改动**
- **Case.modelId** 是每条案例的模型归属字段，`(modelId, num)` 唯一；`Favorite` 挂 `Case.id`，跨模型收藏不歧义
- 案例查询/分类 Tab/导入脚本全部由注册表驱动（`server/repositories/model-config-repo.ts`，60s 进程内缓存）
- 种子与数据管线：`seed-model-config.mjs`（注册表种子）→ `import-cases.mjs`（配置驱动导入，自动合并 `data/case-descriptions.json` 的人工描述）→ `localize-image-paths.mjs`（扫描目录回写本地路径）
- Phase B（接入新模型）runbook 见 `docs/plans/2026-09-13-multi-model-design.md`

## 案例描述

541 条案例描述为 LLM 撰写的人工文案（`data/case-descriptions.json`，num → 描述），导入时自动覆盖 `descriptionTpl` 模板；新增案例若无对应描述则回落模板。



## 数据来源与许可

- 案例与图片逆向整理自开源项目 [freestylefly/awesome-gpt-image-2](https://github.com/freestylefly/awesome-gpt-image-2)（MIT License），本项目遵循其许可协议并在此致谢
- 541 条案例中文描述为 AI 撰写；`public/images/cases/` 中 10 张为 AI 重绘版本（原图备份于 `_originals/`，重绘件存档于 `_generated/`）
- 平台代码与设计（iPrompt Studio）版权归项目作者所有

## 标签体系（2026-09-13 落地）

- **模型 + 类型 = 双行标签筛选**：`/explore` 页头第一行为模型 chips（Model 注册表驱动），第二行为 12 大类型标签（Tag 表驱动），多选同类型为并集语义
- `Tag`（slug/name/kind/sortOrder）+ `CaseTag` 多对多；`kind` 可扩展 style/scene 等新标签维度
- `displayCategory` 保留为主类型字段；`Category` 表退化为接入映射配置（原始分类 → 类型标签）
- 计数 API：`GET /api/tags?kind=type` 返回各标签案例数；卡片展示来源仓库徽标（`sourceRepo`）
- 设计文档：`docs/plans/2026-09-13-tag-system-design.md`；分类操作指南：`docs/分类与模型操作指南.md`

## 生态语料接入（E1 首批）

- **jau123/nanobanana-trending-prompts**（X 爆款提示词）已接入 gpt-image-2 库：294 条（num 1001-1297），中文标题 + 12 类标签由 AI 分类打标
- 语料文件：`data/sources/gpt-image-2/`（原样抓取 + 分类结果 + 适配器产出）；适配器：`scripts/ingest-jau123.mjs`（幂等可重跑）
- 案例总量 541 → **835**；生态案例图片保留外链预览，卡片带来源仓库徽标
- 后续批次（02 nano-banana 主力库 / 04 GPT-4o 结构化 / 10 风格包）按 `docs/plans/2026-09-13-ecosystem-ingestion-design.md` 推进
