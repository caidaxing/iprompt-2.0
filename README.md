# iPrompt Studio 2.0

> AI 出图提示词案例库 + 工作台 —— 同一提示词,看见不同模型的可能。

面向中文创作者的 AI 出图提示词库:**8700+ 真实出图案例**(GPT-Image-2 / Nano Banana Pro / Seedream 4.5 / Grok Imagine 等)、**22 套工业级提示词模板**、**多模型效果比对专区**,以及自带积分体系的 **AI 生图工作台**。

> 注册采用**邀请码制**(平台签名邀请码,注册即激活),保证内测期用户质量与社区氛围。

## 功能总览

| 板块 | 路由 | 说明 |
|---|---|---|
| 案例库 | `/explore` | 多模型案例:模型 + 类型双行标签筛选(并集语义)、搜索、焦点推荐、分页 |
| 案例详情 | `/case/[num]` | 大图、完整提示词一键复制、收藏、上下篇、面包屑、404 |
| 模板库 | `/templates` | 13 分类、22 套工业级模板:文本填空开箱即用 + Agent JSON + 防坑指南,逐块复制 |
| 模型比对 | `/compare` | 同一提示词 × 不同模型,并排 / 滑动双视图对比(实测数据准备中,现为敬请期待占位) |
| AI 工作台 | `/studio` | 挑案例改占位符或自由创作 → 消耗积分生成 → 作品自动留存(mock Provider 内置,可插真实模型 API) |
| 我的作品 | `/me/generations` | 生成历史网格、大图预览、提示词复用 |
| 收藏 | `/favorites` | 登录后可用,跨设备同步 |
| 管理后台 | `/admin/users` | 用户管理、**邀请码签发/启停**(平台签名码,可设次数/有效期/备注)、积分调整、密码重置 |

### 账号体系:邀请码注册制

- 注册需持有**平台签名邀请码**(`前缀-载荷-HMAC签名` 三段式,无法伪造),**注册即激活**,无需人工审核
- 每张码可设可用次数(1~100)与有效期(7~365 天,必填),超管可随时禁用;账号与码双向可溯源
- 密码 scrypt 加盐存储;JWT 双令牌会话(旋转 + 可吊销);登录防爆破(5 次锁 15 分钟)、注册/生成 IP 限流;登录与注册防枚举
- 忘记密码由超管在后台重置(重置即吊销该用户全部会话);积分体系:注册赠 20 分,生成一张扣 1 分,全部流水可审计

## 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Next.js 16(App Router,TS)+ React 19,全栈单体 |
| 样式 | Tailwind CSS 4,宣纸墨黑东方极简视觉体系 |
| 数据 | Prisma 6 + SQLite(字段可移植,上线可切 PostgreSQL) |
| 认证 | 自研:jose JWT 双令牌 + scrypt 密码哈希 + 平台签名邀请码,零第三方认证依赖 |
| 生图 | Provider 抽象(内置 mock 出图打通链路,可插真实模型 API) |
| 测试 | Vitest(服务层 DI 单测,74 用例)+ Playwright(E2E) |

依赖纪律:不加运行时重依赖;外部能力(邮件/远程生图)一律走 Provider 抽象 + mock/console 兜底。

## 快速开始

```bash
git clone https://github.com/caidaxing/iprompt-2.0.git
cd iprompt-2.0
npm install

# 1. 配置环境变量(完整说明见 .env.example)
cp .env.example .env
#   必填:DATABASE_URL / AUTH_JWT_SECRET / NEXT_PUBLIC_SITE_URL
#   建议:ADMIN_EMAIL(该邮箱注册即超管)/ INVITE_SIGNING_SECRET(缺省自动派生)

# 2. 建库(表结构;案例语料数据不在仓库中,导入管线见下文)
npm run db:push

# 3. 启动
npm run dev                    # 开发 http://localhost:3000
npm run build && npm start     # 生产(standalone 构建预览方式见 docs/architecture.md)
```

注册需要一个邀请码:配置 `ADMIN_EMAIL` 后用该邮箱注册即自动成为超管,在管理后台「邀请码」Tab 签发。

## 数据管线(多模型注册表架构)

- **加模型 = 插表 + 放数据 + 跑导入,零代码改动**:`Model` 注册表(id/灰度开关/数据源/图片目录)+ `Category` 分类映射,查询与 Tab 全部注册表驱动(`model-config-repo.ts`,60s 进程内缓存)
- 管线:`seed-model-config.mjs`(注册表种子)→ `import-cases.mjs`(配置驱动导入,自动合并 `data/case-descriptions.json` 人工描述)→ `localize-image-paths.mjs`(本地路径回写);生态适配器:`scripts/ingest-jau123.mjs` 等(幂等可重跑)
- **标签体系**:`Tag` + `CaseTag` 多对多(kind 可扩展 style/scene),`GET /api/tags` 返回计数;操作指南见 `docs/分类与模型操作指南.md`
- 案例图片已本地化至 `public/images/cases/`(DB 存本地路径);生态新增图片批量本地化工具:`scripts/localize-case-images.mjs`(断点续传,manifest 记录于 `.backup/`)

## 部署

单机 **standalone + systemd** 模式(适配 1.6G 内存小机器;禁止在服务器上构建),完整流程、rsync 安全规则(排除 data/.env、尾部斜杠、同步后必须重启)与踩坑记录见 **`docs/architecture.md`** §7。

## 文档

| 文档 | 内容 |
|---|---|
| `docs/architecture.md` | 完整架构基准:信息架构 / 技术分层 / ER / 认证与积分机制 / 部署与踩坑 |
| `docs/plans/` | 产品需求与施工方案归档(按日期) |
| `docs/分类与模型操作指南.md` | 模型注册表与案例导入操作 |

## 目录结构

```
src/
├── app/              # 路由层:页面 + API 薄壳(只做 HTTP 编排)
├── components/       # UI 组件(客户端交互岛)
├── data/             # 站点静态内容(模板卡片/对比条目)
├── lib/              # 同构工具(session/site/categories)
├── server/
│   ├── config/       # 环境变量唯一出口(zod 启动校验)
│   ├── lib/          # 基础设施:加密/密码/限流/邀请码签名/生图 Provider
│   ├── services/     # 业务逻辑(依赖注入,单测覆盖)
│   └── repositories/ # Prisma 数据访问
└── tests/            # Vitest 单测 + Playwright E2E
```

**分层规则**:route.ts 不写业务 → 服务层不依赖 request/response → 仓储层负责数据访问 → 跨层依赖注入便于单测。

## 数据来源与许可

- 案例与图片逆向整理自开源项目 [freestylefly/awesome-gpt-image-2](https://github.com/freestylefly/awesome-gpt-image-2)(MIT License),并接入 jau123/nanobanana-trending-prompts、YouMind-OpenLab 系列、jamez-bondos/awesome-gpt4o-images 等生态仓库,遵循其许可协议并在此致谢
- 部分案例中文描述为 AI 撰写;平台代码与设计(iPrompt Studio)版权归项目作者所有
