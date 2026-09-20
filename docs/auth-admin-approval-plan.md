# 注册审核制改造方案(邮箱 + 密码 + 超管审核)

> 2026-09-20。替代原"三通道统一登录"方案(手机号/微信因资质搁置,见 auth-unification-plan.md)。
> 核心变化:**注册改为邮箱+密码,不发验证码;注册后进入待审状态,超管审核通过才能登录使用。**
> 生产库当前 0 用户,迁移零风险,旧验证码登录可整体移除。

## 一、认证流程

```
注册:填邮箱+密码(可选昵称) → 创建 status=pending 账号 → 前端提示"等待管理员审核"
审核:超管在管理页看到待审列表 → 通过(active)/ 拒绝(rejected)
登录:邮箱+密码
      ├─ active   → 正常签发会话,进入站点
      ├─ pending  → 提示"账号审核中,请等待管理员通过"
      └─ rejected → 提示"账号未通过审核"
超管引导:.env 配 ADMIN_EMAIL,用该邮箱注册时自动置为 active + role=admin,无需人工审核自己
```

## 二、数据模型(仅改 User 表)

```prisma
model User {
  id             String   @id @default(cuid())
  email          String   @unique
  passwordHash   String               // scrypt 加盐哈希,格式 scrypt$N$r$p$salt$hash(node:crypto 内置,零新依赖)
  nickname       String?
  nicknameEdited Boolean  @default(false)
  status         String   @default("pending") // pending | active | rejected
  role           String   @default("user")    // user | admin
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  refreshTokens RefreshToken[]
  favorites     Favorite[]
}
```

- 删除 `VerificationCode` 表与 `send-code`、旧验证码登录逻辑(不再需要,连 SMTP 都不用配)
- `mailer.ts` 代码保留不删:将来做"审核结果邮件通知/找回密码"时直接复用
- 密码用 `node:crypto` 的 scrypt + `timingSafeEqual` 校验,不引入任何第三方库

## 三、后端改动

| 端点 | 说明 |
|---|---|
| `POST /api/auth/register`(新) | zod 校验(邮箱格式、密码 ≥ 8 位);邮箱查重;写入 pending 用户;IP 维度限流防批量注册(如 10 次/小时) |
| `POST /api/auth/login`(改造) | 邮箱+密码;scrypt 校验;按 status 分支返回(见上);登录失败锁定复用现有 rate-limit(5 次锁 15 分钟) |
| `GET /api/admin/users?status=pending`(新) | 待审/全部用户列表,仅 role=admin |
| `POST /api/admin/users/[id]/approve` `…/reject`(新) | 审核操作,仅 admin |
| `POST /api/admin/users/[id]/reset-password`(新) | 超管为用户设置新密码(替代"忘记密码"——没有邮件通道前由管理员人工重置) |
| 会话部分 | **完全不动**:JWT access + refresh 轮换、cookie、`/api/auth/me`、`logout` 原样保留;`me` 返回体加 status/role |
| 删除 | `send-code`、旧 `login` 的验证码分支、`AuthRepo` 中验证码相关接口 |

管理端点鉴权:统一的 `requireAdmin` 守卫(读会话 → 查 role),403 兜底。

## 四、前端改动

1. **登录页**:改「登录 / 注册」两 Tab
   - 注册 Tab:邮箱、密码、确认密码、可选昵称 → 成功后进入"已提交,等待审核"页(说明审核制,引导稍后回来登录)
   - 登录 Tab:错误提示三分支(审核中/未通过/邮箱或密码错误,后两类不泄露账号是否存在)
2. **管理页 `/admin/users`**(新):
   - 待审列表:邮箱、昵称、注册时间、[通过] [拒绝] 按钮
   - 全部用户:搜索、状态筛选、重置密码
   - 导航入口仅 role=admin 可见;前端隐藏 + 后端 403 双保险
3. `NavAuth.tsx`:登录逻辑不变,`me` 多返回的字段不影响现有渲染

## 五、安全要点

- 密码哈希:scrypt(N=16384)+ 每用户随机盐;日志与任何接口响应永不回传密码
- 注册防刷:IP 限流(复用 rate-limit 库);同邮箱重复注册返回模糊提示
- 越权:管理端点后端强制 role 校验,前端隐藏只是体验层
- 枚举防护:登录失败统一"邮箱或密码错误";注册时若邮箱已存在,统一返回"已提交,等待审核"(不暴露该邮箱已注册)

## 六、实施与工作量

| 步骤 | 内容 | 量 |
|---|---|---|
| 1 | schema 迁移(加 3 列、删 VerificationCode)+ 仓储/服务层改造 | 0.3 天 |
| 2 | register/login + admin 端点 + 守卫 + 限流 | 0.3 天 |
| 3 | 前端登录页两 Tab + 管理页 + 路由守卫 | 0.3 天 |
| 4 | vitest 单测(scrypt/状态分支/权限)+ Playwright 用例(注册→拒登→审核→通过→登录全流程) | 0.2 天 |

合计约 **1 人天**;由我实施可一次会话交付。部署无新服务,`docker compose build && up -d` 照常。
上线时你只需在 `.env` 加一行 `ADMIN_EMAIL=你的邮箱`,然后用它注册即成为超管。

## 七、留待将来(明确不做进本期)

- 审核结果邮件通知、忘记密码自助找回(等 SMTP 接入后复用 mailer.ts)
- 手机号/微信登录(见 auth-unification-plan.md,资质到位后两方案可叠加:本期 passwordHash 即密码登录基座)
- 账号合并/多身份绑定
