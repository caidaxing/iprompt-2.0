# iPrompt Studio 2.0 方案(参照 awesome-gpt-image-2 / canghe.ai 思路)

> 2026-09-20 定稿。对标仓库:freestylefly/awesome-gpt-image-2(32.9k star,MIT)。
> 1.0 定位是"案例浏览站",用户看完即走;2.0 参照 canghe.ai 的产品闭环,
> 补上"**看案例 → 改提示词 → AI 出图 → 作品留存**"的核心回路,并用积分体系为商业化打好地基。

## 1. 对标映射:它有什么 → 我们做什么

| canghe.ai 功能 | 2.0 对应决策 |
|---|---|
| 案例库浏览(541 案例/13 分类) | ✅ 1.0 已有,直接继承 |
| **AI 生图工作台**(核心) | ✅ 2.0 主打:`/studio` 工作台,选案例改占位符或自由创作 |
| 生图任务队列 + 轮询 | 简化为同步生成 + 本地落盘(mock 秒回;接真 API 后同链路) |
| 积分计费(Stripe/支付宝) | ✅ 先做**积分账本**(注册赠 20、生成扣 1、管理端调整);真实支付需商户资质,留 3.0 |
| 会员体系 / 付费社区 | ❌ 3.0 再议 |
| Supabase 账号 + OAuth | ✅ 1.0 已有自研账号(注册审核制),不换 |
| 收藏同步 | ✅ 1.0 已有 |
| 管理后台(用户/调积分/指标) | ✅ 用户审核已有;新增积分调整;指标看板 3.0 |
| Agent Skills 分发 | 💡 3.0 候选(把中文案例库打包成 skill 投放 AI 助手生态) |

**2.0 明确不做**:真实支付、会员、付费社区、多语言。聚焦把"生图闭环"跑通。

## 2. 技术设计

### 2.1 数据模型(在 1.0 基础上加 2 表 1 列)

```prisma
model User {
  // …1.0 字段不变…
  credits       Int          @default(20)  // 注册即赠 20 积分
  generations   Generation[]
  creditLogs    CreditLog[]
}

// 生成记录(我的作品)
model Generation {
  id         String   @id @default(cuid())
  userId     String
  caseId     String?            // 关联案例;自由创作时为空
  prompt     String             // 实际发送的最终提示词
  provider   String             // mock | 远程供应商(预留)
  status     String   @default("pending") // pending | succeeded | failed
  imagePath  String?            // 成品相对路径 public/generations/<id>.svg
  params     String?            // 占位符替换记录(JSON)
  creditCost Int      @default(0)
  error      String?
  createdAt  DateTime @default(now())

  user    User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  caseRef Case? @relation(fields: [caseId], references: [id])

  @@index([userId, createdAt])
}

// 积分流水(每笔余额变动都可追溯)
model CreditLog {
  id           String   @id @default(cuid())
  userId       String
  delta        Int      // 正=入账 负=消耗
  reason       String   // register_gift | generation | admin_adjust
  balanceAfter Int
  createdAt    DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
}
```

### 2.2 生图 Provider 抽象(参照其 apimart 网关思路,先本地可跑)

```
src/server/lib/image-provider.ts
  interface ImageProvider { name: string; generate(prompt: string): Promise<Buffer> }
  - MockProvider(默认):无任何外部依赖,按提示词哈希生成确定性 SVG 海报(文字+色块),
    端到端打通"扣积分→出图→落盘→作品页";后续接真 API 时零改动换实现
  - 远程 Provider(预留):IMAGE_PROVIDER=xxx + API_KEY 即插;V2.0 不实现
```

环境变量:`IMAGE_PROVIDER`(默认 mock)。与 1.0 的 `MAIL_PROVIDER=console` 同一设计哲学。

### 2.3 API

| 端点 | 说明 |
|---|---|
| `POST /api/studio/generate` | 登录用户;body `{ caseId?, replacements? }` 或 `{ freePrompt }`;校验积分 ≥ 1 → 事务:扣 1 积分 + 写流水 → 调 Provider → 落盘 `public/generations/<id>.svg` → 写 Generation;失败退还积分;IP 限流防刷 |
| `GET /api/studio/generations` | 当前用户作品列表(倒序,含缩略路径/状态/扣分) |
| `GET /api/credits` | 余额 + 最近流水 |
| `POST /api/admin/users/[id]/credits` | 超管调积分 `{ delta, reason }`,写 admin_adjust 流水(仅 admin;对 pending/rejected 用户禁用) |

案例关联生成:`caseId` 校验存在;提示词 = 案例 prompt 中的 `{占位符}` 按 replacements 替换后提交,替换记录存 `params` 便于复现。

### 2.4 前端

| 页面 | 内容 |
|---|---|
| `/studio`(新) | 工作台:左栏选案例(或自由创作)→ 占位符表单/提示词编辑 → 生成按钮(显示余额与单价 1 积分)→ 右栏结果图 + "保存到我的作品"(自动) |
| `/me/generations`(新) | 我的作品网格:缩略图、提示词摘要、时间;点击看大图/复制提示词 |
| `/me` 改造 | 加"我的作品 / 积分明细"入口,显示当前余额 |
| `/admin/users` 扩展 | 行内"调积分"按钮(输入增减量+备注) |
| 导航 | SiteNav 增加「AI 工作台」入口 |

### 2.5 安全与边界

- 扣费与生成为同一事务语义:provider 失败 → 积分全额退还并记流水(`generation` 退正数)
- 余额不足返回 `INSUFFICIENT_CREDITS`(402 语义,前端引导"联系管理员充值")
- 生成接口 IP 限流(20 次/小时)+ 登录才能用(审核制账号天然防批量刷)
- 作品文件名用生成 id(不可枚举路径穿越);prompt 全文不入 public 目录
- 管理端调积分仅 admin(复用 requireAdminUser 守卫),流水中记录操作来源

## 3. 里程碑与验收标准

| 里程碑 | 交付物 | 验收 |
|---|---|---|
| M1 数据地基 | schema 迁移 + 注册赠积分 + CreditLog | 迁移后老用户补赠;注册新用户余额=20 且有 gift 流水 |
| M2 生图工作台 | Provider 抽象(mock)+ generate 接口 + /studio | 登录用户选案例填占位符 → 生成 → 扣 1 积分 → 图可见;余额不足被拒 |
| M3 作品与治理 | /me/generations + /api/credits + 管理端调积分 | 作品页只看自己的;超管加减积分后用户余额与流水一致 |
| 质量门 | vitest 全绿(新增积分/生成服务单测)+ eslint 0 错 + build 通过 + 运行时冒烟 | 全流程 curl 演练:注册→生成→扣费→查作品→超管调分 |

## 4. 风险与留待 3.0

- **真模型接入**:mock 只保证链路;接真 API(国内可直连的生图服务)时需处理慢请求(改异步任务+轮询,表结构已预留 status)、按张成本与限免策略
- **存储增长**:生成图落盘本地,量大后需对象存储;SQLite 单机写入场景足够
- **支付/会员/付费社区**:需商户资质与客服成本,3.0 视用户量决策
- **版权**:生成结果归用户;案例语料沿用 1.0 的 MIT 致谢链路

## 8. 追加交付:2.5 对比专区(参照上游 gpt-image-2-5 专区,2026-09-20)

用户指定对齐上游的 `/gpt-image-2-5/` 专区,已实现 `/compare`:

- **双视图对比**:`GPT-Image 2 图库原图` vs `GPT-Image 2.5`,支持并排 / 滑动(slider 拖拽分界)两种视图
- **状态治理**:demo(界面示意,两侧同图)/ pending(原图就位待实测)/ tested(已实测,含复现图+结论+参数表)——与上游"诚实标注"的做法一致
- **共享 Prompt 面板**:完整提示词只读展示 + 一键复制
- **实测计划面板**:待实测条目公开对比计划与方法论;tested 条目展示生成记录
- **案例切换**:下拉 + 下一组;URL 深链 `?case=<id>` 可分享
- **放大弹窗 / 观察重点 / 来源署名 / 图库详情跳转**
- 数据:`src/data/comparisons.ts`(5 条:1 示意 + 4 待实测,案例取自图库 #11/#14/#22/#28);实测后填 `result` 字段即上线,无需改代码
- 入口:导航「2.5 对比」;页面 `/compare`
