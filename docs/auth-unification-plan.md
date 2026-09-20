# 登录统一改造技术方案(邮箱 / 手机号 / 微信)

> 2026-09-20 定稿。结论:**不引入独立认证服务、不换认证框架**,在现有手写认证架构上增量扩展。
> 预计总工作量 2~3 个编码日,分两期上线,每期独立可用。

## 一、选型结论与理由

| 候选 | 结论 | 理由 |
|---|---|---|
| **自研增量扩展(本方案)** | ✅ 采用 | 现有 auth-service 架构干净(DI 可测、限流、刷新轮换齐全);统一账号的真实缺口只有一张身份关联表 + 通道泛化,改造成本最低、零迁移风险、服务器零新增内存 |
| Better-Auth(嵌入式库) | 备选 | 统一账号模型开箱即用,但需替换全部现有会话/JWT 逻辑,且手机号注册需占位邮箱等 hack,微信仍要手写——收益不抵重写成本 |
| Auth.js / NextAuth | 备选 | 内置微信 provider 是优势,但手机号登录仍要自写,且需迁移到它的 session 模型 |
| Casdoor(独立 IdP) | 不采用 | 需多跑一个服务(几百 MB 内存,1.6G 的机器很紧),登录流程改 OIDC 跳转,现有代码作废 |
| Keycloak / Authentik / Logto | 排除 | JVM/Python 内存过重,或需额外 Postgres,单机 1.6G 不可行 |

## 二、统一身份模型

核心思想:**一个 User 挂多种登录方式**。邮箱、手机号作为 User 上的可空唯一列(可查询、迁移零痛苦);微信等第三方 OAuth 身份进 `AuthIdentity` 表。

### 2.1 Prisma Schema 改动

```prisma
model User {
  id             String   @id @default(cuid())
  email          String?  @unique   // 改为可空:微信/手机号注册的用户可能没有邮箱
  phone          String?  @unique   // 新增:手机号(E.164 或裸 11 位,全库统一一种格式)
  nickname       String?
  nicknameEdited Boolean  @default(false)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  identities    AuthIdentity[]
  refreshTokens RefreshToken[]
  favorites     Favorite[]
}

// 第三方 OAuth 身份(微信等)。一个用户可绑多个第三方身份。
model AuthIdentity {
  id         String   @id @default(cuid())
  userId     String
  provider   String   // "wechat"(预留 "qq" / "apple" ...)
  identifier String   // 微信 unionid(开放平台下多应用统一);拿不到 unionid 时退回 openid
  rawProfile String?  // 首次授权返回的 JSON(头像/昵称),仅存档
  createdAt  DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, identifier])   // 一个微信号只能绑一个账号
  @@index([userId])
}

// 验证码表泛化:同时承载邮箱与短信通道
model VerificationCode {
  id        String   @id @default(cuid())
  target    String   // 原字段 email 更名:邮箱地址或手机号
  channel   String   @default("email") // "email" | "sms"
  codeHash  String
  expiresAt DateTime
  consumed  Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([target, channel, createdAt])
}
```

`RefreshToken`、`Favorite` 等表**不动**。已有用户数据零迁移(email 列放宽为可空是纯 DDL,`prisma migrate dev --name unify-auth` 一步完成)。

### 2.2 登录的统一语义

三种通道最终都归到同一个服务函数:

```
loginByIdentity({ channel, target, credential })
  ├─ email: 校验 VerificationCode → findOrCreate(email)
  ├─ sms:   校验 VerificationCode → findOrCreate(phone)
  └─ wechat:code 换 openid/unionid   → findOrCreate(AuthIdentity)
        ↓ 统一签发
   现有 JWT pair(access cookie + refresh cookie,逻辑不动)
```

`findOrCreate` 规则:按身份查用户 → 有则登录;无则建号(自动注册,与现状一致)。

## 三、后端改动清单

### 3.1 服务层 `src/server/services/auth-service.ts`(泛化)

- `requestCode(email)` → `requestCode(target, channel)`:冷却 Map 的 key 由 email 改为 `channel:target`
- `AuthRepo` 接口扩展(仓储层同步实现):

```ts
findUserByIdentifier(identifier: { channel: "email" | "sms"; target: string }):
  Promise<UserRef | null>;
createUserByIdentifier(identifier: { channel: "email" | "sms"; target: string }):
  Promise<UserRef>;                       // email 通道写入 email 列,sms 通道写入 phone 列
findIdentity(provider: string, identifier: string): Promise<{ userId: string } | null>;
createIdentity(userId: string, provider: string, identifier: string, raw?: string): Promise<void>;
```

- `login()` → `loginByIdentity(...)`,内部按 channel 分派;签发 JWT pair 的尾部逻辑复用
- 新增 `wechat-login.ts`:
  - `buildAuthorizeUrl(state)`:拼 `https://open.weixin.qq.com/connect/qrconnect`(appid、redirect_uri、`scope=snsapi_login`)
  - `exchangeCode(code)`:调 `api.weixin.qq.com/sns/oauth2/access_token` 拿 openid/unionid → `sns/userinfo` 拿昵称头像
  - unionid 优先;`AuthIdentity.identifier` 存 unionid,无则 openid

### 3.2 新增文件

| 文件 | 职责 |
|---|---|
| `src/server/lib/sms.ts` | 阿里云短信发送器(官方 SDK `@alicloud/dysmsapi20170525`),与 `mailer.ts` 同构:`sendLoginCode(phone, code)`。`SMS_PROVIDER=aliyun`,默认 console(本地/E2E) |
| `src/server/services/wechat-login.ts` | 上述微信 OAuth 两个函数 + state 签发/校验(随机 state 写 httpOnly 短时效 cookie,回调时比对,防 CSRF) |

### 3.3 路由改动

| 路由 | 改动 |
|---|---|
| `POST /api/auth/send-code` | body 泛化为 `{ target, channel }`(channel 缺省 "email",兼容旧前端);channel=sms 走短信限流(见 3.4)后调 `sms.ts` |
| `POST /api/auth/login` | body 泛化为 `{ channel, email?, phone?, code }`,转 `loginByIdentity`;cookie 签发段不变 |
| `GET /api/auth/wechat/start` | 新增:签发 state cookie → 302 跳微信扫码页 |
| `GET /api/auth/wechat/callback` | 新增:验 state → 换 openid → findOrCreate → 签发 cookie → 302 回首页 |
| `GET /api/auth/me` | 返回体加 `phone` 字段;`session.ts` 的 select 同步加 |
| 登录后绑定 `POST /api/auth/bind` | 三期再做:当前登录用户绑定新身份;identifier 已属于他人时直接拒绝并提示"该手机号/微信已有账号,请用它登录"(v1 不做账号合并) |

### 3.4 短信防刷(重要:短信是花钱的)

在现有 `rate-limit.ts` 基础上为 sms 通道加三道闸:
- 同一手机号 60 秒 1 条(复用 resend cooldown)
- 同一手机号 24 小时 ≤ 10 条
- 同一 IP 24 小时短信通道 ≤ 10 条
超限一律 429,文案不复存在与否(防撞库)。

## 四、前端改动

`src/app/login/page.tsx` 改为三 Tab:**邮箱登录 | 手机登录 | 微信扫码**
- 邮箱 Tab:现逻辑平移
- 手机 Tab:手机号输入 + 验证码(复用同一 send-code/login 接口,channel="sms")
- 微信 Tab:按钮跳 `/api/auth/wechat/start`;微信回调带 cookie 回首页,前端无需处理 code
- `NavAuth.tsx`:展示昵称逻辑不变;`/api/auth/me` 多返回的 `phone` 不影响现有渲染

## 五、环境变量新增(.env / docker compose 同步)

```
# 短信(阶段一)
SMS_PROVIDER=console            # console | aliyun
ALIYUN_SMS_ACCESS_KEY_ID=...
ALIYUN_SMS_ACCESS_KEY_SECRET=...
ALIYUN_SMS_SIGN_NAME=...        # 签名
ALIYUN_SMS_TEMPLATE_CODE=...    # 模板 CODE
# 微信(阶段二)
WECHAT_LOGIN_APPID=...
WECHAT_LOGIN_SECRET=...
WECHAT_REDIRECT_URI=https://<你的域名>/api/auth/wechat/callback
```

## 六、分期实施与部署

| 阶段 | 内容 | 前置 | 工作量 |
|---|---|---|---|
| **0 前置确认(人工,可并行)** | ① 微信开放平台企业资质(网站应用扫码登录必须企业主体,个人办不了);② 阿里云短信签名+模板报备(个人可申请,但签名通常要求已备案站点/App——当前域名 clientHold 且未备案,存在被拒风险,需先确认) | 无 | 人工走流程 |
| **一:手机号登录** | schema 迁移 → sms.ts → send-code/login 泛化 → 限流 → 登录页手机 Tab → vitest/playwright 用例(E2E 沿用 `E2E_DEV_CODE` 回显) | 短信资质 | 1~1.5 天 |
| **二:微信扫码** | wechat-login.ts → 两条路由 → 登录页微信 Tab → 绑定唯一性校验 | 微信企业资质 | 0.5~1 天 |
| **三(可选)** | 账号设置页绑定/解绑已有身份 | 一、二 | 0.5~1 天 |

部署无任何新服务/新端口/新容器:代码合入后照常 `docker compose build && up -d` 重建即可,内存占用不变。

## 七、风险与边界

1. **账号合并不做**:同一人先用微信后用邮箱,会是两个账号。v1 通过"绑定时发现已被占用 → 提示用那个身份登录"兜底;真正合并(收藏/收藏夹迁移)留待有真实案例再设计。
2. **unionid 依赖开放平台**:只有同一开放平台主体下的应用才返回 unionid;若将来还要做公众号内网页授权,务必用同一开放平台账号挂载,identifier 才能稳定关联。
3. **SQLite 并发写**:验证码写入频率极低,现有量级无压力;上线切 PostgreSQL 时本方案 schema 无需改动(注释里已声明双支持)。
4. **email 放宽为可空后**,`Subscriber` 等以 email 为键的表不受影响(独立表);站内所有 `user.email` 展示处需容忍 null(仅微信注册用户),前端显示昵称兜底。
