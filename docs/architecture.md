# iPrompt Studio 2.0 完整架构

> 2026-09-21 定稿。本文档是 2.0 的唯一架构基准:产品信息架构、技术分层、数据模型、关键机制、质量与演进。
> 配套历史方案见 `docs/plans/`(按日期归档)。

## 1. 系统总览

```
用户浏览器
   │
   ▼
Next.js 16 单体应用(App Router,生产模式单进程)
   │
   ├── 页面层  src/app/*(RSC 服务端渲染 + 客户端交互岛)
   ├── API 层  src/app/api/*(Route Handlers,薄壳:校验/鉴权/限流)
   │      ▼
   ├── 服务层  src/server/services/*(业务逻辑,纯函数 + 依赖注入,单测覆盖)
   │      ▼
   ├── 数据访问 src/server/repositories/* + Prisma Client
   │      ▼
   └── SQLite(prisma/dev.db,单文件,~9k 案例 + 业务数据)
                +
   静态内容  src/data/*(模板卡片/对比专区,代码内数据,出处以注释满足 MIT)
   文件存储  public/generations/*(AI 生成产物,动态路由出图)
```

外部依赖:**零运行时外部服务**。生图 Provider 默认 mock(本地 SVG);上游开源语料(awesome-gpt-image-2 等,MIT)在构建期/导入期消费,运行时不访问。

## 2. 信息架构(站点地图)

| 路由 | 页面 | 访问权限 | 说明 |
|---|---|---|---|
| `/` | 首页 | 公开 | 精选案例 + 各板块入口 |
| `/explore` | 案例库 | 公开 | 多模型/标签/搜索/分页 |
| `/case/[num]` | 案例详情 | 公开 | 提示词、收藏、上下篇 |
| `/templates` | 模板库 | 公开 | 22 张模板卡片 + 47 块填空模板详表 |
| `/compare` | 2.5 对比专区 | 公开 | 双视图对比,深链 `?case=` |
| `/studio` | AI 工作台 | **登录** | 案例占位符/自由创作 → 生成(扣积分) |
| `/me` | 个人中心 | **登录** | 资料、昵称、余额、各入口 |
| `/me/generations` | 我的作品 | **登录** | 生成记录网格 + 大图/复制 |
| `/favorites` | 收藏 | **登录** | |
| `/login` | 登录/注册 | 公开 | 注册即待审 |
| `/admin/users` | 用户管理 | **admin** | 审核/重置密码/调积分 |
| `/skills` | 技能中心 | 公开 | 占位(3.0 分发) |
| `/match` | AI 匹配 | 公开 | 1.0 占位页,导航不再露出(被 /studio 实质承接) |

**导航规则**(治乱核心):
- 主导航只放 5 项:**案例库 · 模板库 · 2.5 对比 · AI 工作台 · 技能**(小屏折叠技能)
- 右侧常驻:**♡ 收藏** + 登录态
- 登录后:头像下拉菜单收拢个人入口 —— 我的作品 / 个人中心 / 用户审核(仅 admin)/ 退出
- 管理后台不进主导航,仅下拉菜单 + 直链

## 3. 技术栈

| 层 | 选型 | 说明 |
|---|---|---|
| 框架 | Next.js 16(App Router)+ React 19 | RSC 为主,交互岛 client 组件 |
| 样式 | Tailwind CSS 4 + 站内自定义类(`serif-title`/`eyebrow`/`site-shell` 等) | 米白宣纸东方极简视觉体系 |
| ORM | Prisma 6 + SQLite | 单文件库;切 PostgreSQL 仅改 provider |
| 认证 | 自研: jose(HS256 JWT)+ httpOnly Cookie + scrypt 密码哈希 | 零第三方认证依赖 |
| 生图 | Provider 抽象,`IMAGE_PROVIDER=mock` | 远程供应商预留插槽 |
| 测试 | Vitest(单测,服务层 DI)+ Playwright(E2E) | |

**依赖纪律**:不加运行时重依赖。图标用内联 SVG;邮件/远程生图等外部能力一律走"Provider 抽象 + console/mock 兜底"模式。

## 4. 目录结构与放置规则

```
src/
├── app/                  # 路由即产品:页面与 API 按 URL 组织
│   ├── (公开区)          page explore case/[num] templates compare skills match
│   ├── (登录区)          studio me me/generations favorites login
│   ├── (管理区)          admin/users
│   └── api/              # 薄壳:zod 校验 → 会话/守卫 → 限流 → service
│       ├── auth/         # register login logout me
│       ├── studio/       # generate generations cases
│       ├── credits/      # 余额与流水
│       ├── admin/        # users + [id](审核/重置密码)+ [id]/credits
│       ├── generations/[file]/  # 生成产物动态出图(运行时落盘,静态清单不含)
│       └── favorites me subscribe tags health
├── components/           # 复用 UI(客户端岛 + 服务端组件混合)
├── content → src/data/   # 站点静态内容数据(模板卡片/对比条目),出处注释满足 MIT
├── lib/                  # 同构工具(session/categories/site)
└── server/
    ├── config/env.ts     # 环境变量唯一出口,zod 启动校验,禁止直接读 process.env
    ├── lib/              # 基础设施:crypto password rate-limit image-provider prisma mailer(休眠)
    ├── services/         # 业务逻辑:auth admin studio case favorite tag model-config
    └── repositories/     # Prisma 数据访问:auth studio model-config tag
```

**放置规则**:新页面 → `app/<route>/page.tsx`;新接口 → `api/` 薄壳 + `services/` 逻辑 + 需要时 `repositories/`;纯展示数据(不改库的)→ `data/`;可注入测试的业务函数一律进 `services/`。

## 5. 数据架构(Prisma ER)

```
User ──1:N── RefreshToken          (会话刷新令牌,可吊销/旋转)
User ──1:N── Favorite ──N:1── Case (收藏)
User ──1:N── Generation ──N:1── Case(可选关联;AI 作品)
User ──1:N── CreditLog             (积分流水:register_gift/generation/refund/admin_adjust)
Model ──1:N── Category             (模型与展示分类,注册配置表)
Case ──N:M── Tag(经 CaseTag)     (类型/风格/场景标签)
Subscriber                          (上线订阅收集)
```

关键字段:User {email✦, passwordHash, nickname, nicknameEdited, status: pending|active|rejected, role: user|admin, credits};Generation {caseId?, prompt, provider, status, imagePath, params, creditCost};数据文件:开发 `prisma/dev.db`(生产库迁移副本,8786 案例),`data/*.json` 为导入源(1.0 管线产物)。

## 6. 关键机制

### 6.1 认证与权限(注册审核制)
```
注册(email+password) → status=pending → 超管在 /admin/users 通过/拒绝
登录:密码校验(scrypt+timingSafeEqual) → status=active 才签发 JWT pair
     pending→403 AUTH_PENDING  rejected→403 AUTH_REJECTED  凭据错误→401(防枚举)
会话:access(15min) + refresh(30d,旋转+吊销)双 Cookie;刷新时复核 status
ADMIN_EMAIL 命中注册 → 自动 active+admin(超管引导)
防刷:登录 5 次锁 15 分钟;注册 10 次/h/IP;生成 20 次/h/IP
```
权限矩阵:公开页(未登录可读)→ 登录区(401)→ 管理区(requireAdminUser,401/403 分明)。

### 6.2 积分账本
注册赠 20;生成原子扣 1(`updateMany where credits>=1` 防并发超扣);Provider 失败全额退 + `generation_refund` 流水;管理端调整校验余额不为负;每笔变动写 CreditLog(balanceAfter 可审计)。

### 6.3 生成管道
`POST /api/studio/generate` → 组装最终 Prompt(案例占位符替换或自由)→ 扣分 → Provider.generate → 落盘 `public/generations/<id>.svg` → 记录 succeeded。产物经 `/generations/[file]` 动态路由读盘出图(绕开 Next 静态清单限制),文件名白名单防穿越。

### 6.4 内容管道
上游 MIT 语料(awesome-gpt-image-2 等 10 仓库)→ `data/*.json` 导入 → DB;模板卡片/对比条目为代码内静态数据(`src/data/`),封面与原图**本地化**于 `public/images/`(不热链上游);出处以源码注释 + README 致谢满足 MIT。

## 7. 质量与运维

- **质量门(每次交付必过)**:vitest(47 单测,服务层全 DI)→ eslint(0 error)→ tsc → production build → 运行时 curl 冒烟(注册→审核→生成→扣费→作品→调分)
- **部署**:阿里云 ECS 单机(Ubuntu 22.04,1.6G 内存),`docker compose build && up -d`,nginx 443 反代;SQLite 单写够用;内存红线:不加常驻服务
- **备份**:改库/改配置前先备份;`prisma/prod.db.bak` 类文件不进仓库

## 8. 3.0 演进路线(边界明确,不混入 2.0)

1. **真实生图 API**:实现远程 Provider;慢请求 → Generation.status 异步任务化 + 前端轮询(表结构已预留)
2. **商业化**:积分充值(支付宝/Stripe,参考上游 billing 架构)→ 会员
3. **Skills 分发**:案例风格库 + 模板包打包为标准 Agent Skill(参考上游 agents/skills)
4. **基础设施**:生成产物迁对象存储;SQLite → PostgreSQL;运营指标看板
5. **内容扩展**:2.5 实测结果填充(`comparisons.ts` status→tested);更多模型语料接入
