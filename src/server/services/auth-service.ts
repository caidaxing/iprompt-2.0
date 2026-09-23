// 认证服务：注册（待审）+ 密码登录（状态检查）+ 刷新令牌旋转
// 依赖通过参数注入，便于单测替换仓储层
import type { Env } from "@/server/config/env";
import { sha256, randomToken, signAccessToken, verifyAccessToken, type AccessPayload } from "@/server/lib/crypto";
import { hashPassword, verifyPassword } from "@/server/lib/password";
import { getInviteSecret, verifyInviteSignature } from "@/server/lib/invite-code";
import { isBlocked, recordFailure, reset } from "@/server/lib/rate-limit";

/** 认证所需的环境变量子集 */
export type AuthEnv = Pick<
  Env,
  | "AUTH_JWT_SECRET"
  | "ACCESS_TOKEN_TTL_MIN"
  | "REFRESH_TOKEN_TTL_DAYS"
  | "ADMIN_EMAIL"
  | "INVITE_SIGNING_SECRET"
>;

// ---- 仓储接口（由 repositories 层实现，单测用内存假实现） ----

export type UserStatus = "pending" | "active" | "rejected";
export type UserRole = "user" | "admin";

export interface UserRef {
  id: string;
  email: string;
  nickname: string | null;
  passwordHash: string;
  status: string;
  role: string;
  credits: number;
  inviteCodeId: string | null;
  createdAt: Date;
}

export interface AuthRepo {
  findUserByEmail(email: string): Promise<UserRef | null>;
  findUserById(userId: string): Promise<UserRef | null>;
  createUser(
    email: string,
    passwordHash: string,
    status: UserStatus,
    role: UserRole,
    inviteCodeId?: string | null,
  ): Promise<UserRef>;
  setUserStatus(userId: string, status: UserStatus): Promise<void>;
  updatePasswordHash(userId: string, passwordHash: string): Promise<void>;
  listUsersByStatus(status?: UserStatus): Promise<UserRef[]>;
  createRefreshToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  findRefreshToken(tokenHash: string): Promise<{ userId: string; expiresAt: number; revoked: boolean } | null>;
  revokeRefreshToken(tokenHash: string): Promise<void>;
  revokeUserRefreshTokens(userId: string): Promise<void>;
  createCreditLog(userId: string, delta: number, reason: string, balanceAfter: number): Promise<void>;
  /** 原子核销邀请码:有效返回邀请码 id（供 User 关联）,无效返回 null */
  consumeInvite(normalizedCode: string, now: Date): Promise<string | null>;
  /** 建号失败回退核销 */
  refundInvite(normalizedCode: string): Promise<void>;
}

export interface AuthResult {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
}

export class AuthError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

const LOCK_MS = 15 * 60_000;
const FAIL_LIMIT = 5;

/**
 * 注册（邀请码制）：持有效平台签名码 → 直接激活；
 * 命中 ADMIN_EMAIL 则免码并自动授予 admin。邮箱已存在抛 EMAIL_EXISTS（路由层转模糊响应防枚举）。
 */
export async function register(
  repo: AuthRepo,
  env: AuthEnv,
  input: { email: string; password: string; inviteCode?: string },
): Promise<{ status: UserStatus; role: UserRole }> {
  const email = input.email.toLowerCase();
  if (await repo.findUserByEmail(email)) {
    throw new AuthError("EMAIL_EXISTS", "该邮箱已注册");
  }
  const passwordHash = await hashPassword(input.password);
  const isAdmin = !!env.ADMIN_EMAIL && email === env.ADMIN_EMAIL.toLowerCase();

  // 邀请码两级验证：验签（平台签发性）→ 原子核销（状态/次数/有效期）；建号失败回退核销
  let consumedNormalized: string | null = null;
  let inviteId: string | null = null;
  if (!isAdmin) {
    const raw = input.inviteCode?.trim();
    if (!raw) throw new AuthError("INVITE_REQUIRED", "请输入邀请码");
    const secret = getInviteSecret(env.AUTH_JWT_SECRET, env.INVITE_SIGNING_SECRET);
    const verified = verifyInviteSignature(raw, secret);
    if (!verified) throw new AuthError("INVITE_INVALID", "邀请码无效或已失效，请联系管理员");
    inviteId = await repo.consumeInvite(verified.normalized, new Date());
    if (!inviteId) throw new AuthError("INVITE_INVALID", "邀请码无效或已失效，请联系管理员");
    consumedNormalized = verified.normalized;
  }

  try {
    const user = await repo.createUser(
      email,
      passwordHash,
      "active",
      isAdmin ? "admin" : "user",
      inviteId,
    );
    await repo.createCreditLog(user.id, user.credits, "register_gift", user.credits); // 注册赠分入账流水
    return { status: user.status as UserStatus, role: user.role as UserRole };
  } catch (err) {
    if (consumedNormalized) await repo.refundInvite(consumedNormalized); // 建号失败（如并发邮箱冲突）回退核销
    throw err;
  }
}

/** 登录：密码校验 → 状态检查 → 签发令牌。密码错误与账号不存在返回同一错误，防枚举 */
export async function login(
  repo: AuthRepo,
  env: AuthEnv,
  input: { email: string; password: string },
  now = Date.now(),
): Promise<AuthResult> {
  const email = input.email.toLowerCase();
  const failKey = `login:${email}`;
  if (isBlocked(failKey)) {
    throw new AuthError("LOCKED", "失败次数过多，账号已锁定 15 分钟，请稍后再试");
  }

  const user = await repo.findUserByEmail(email);
  const passwordOk = !!user && (await verifyPassword(input.password, user.passwordHash));
  if (!user || !passwordOk) {
    recordFailure(failKey, FAIL_LIMIT, LOCK_MS);
    throw new AuthError("BAD_CREDENTIALS", "邮箱或密码错误");
  }

  if (user.status === "pending") {
    throw new AuthError("AUTH_PENDING", "账号审核中，请等待管理员通过后再登录");
  }
  if (user.status === "rejected") {
    throw new AuthError("AUTH_REJECTED", "账号未通过审核，如有疑问请联系管理员");
  }

  reset(failKey);

  const refreshToken = randomToken();
  const refreshExpires = new Date(now + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000);
  await repo.createRefreshToken(user.id, sha256(refreshToken), refreshExpires);
  const accessToken = await signAccessToken({ uid: user.id, email: user.email }, env);

  return { userId: user.id, email: user.email, accessToken, refreshToken };
}

export async function rotateRefresh(
  repo: AuthRepo,
  env: AuthEnv,
  refreshToken: string,
  now = Date.now(),
): Promise<AuthResult | null> {
  const tokenHash = sha256(refreshToken);
  const record = await repo.findRefreshToken(tokenHash);
  if (!record || record.revoked || record.expiresAt <= now) return null;

  await repo.revokeRefreshToken(tokenHash); // 旋转：旧令牌立即失效
  const user = await repo.findUserById(record.userId);
  if (!user || user.status !== "active") return null; // 审核状态变化（被拒/退回待审）即吊销会话

  const newRefresh = randomToken();
  await repo.createRefreshToken(user.id, sha256(newRefresh), new Date(now + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000));
  const accessToken = await signAccessToken({ uid: user.id, email: user.email }, env);
  return { userId: user.id, email: user.email, accessToken, refreshToken: newRefresh };
}

export async function logout(repo: AuthRepo, refreshToken: string): Promise<void> {
  await repo.revokeRefreshToken(sha256(refreshToken));
}

export async function userFromAccess(
  env: AuthEnv,
  token: string | undefined,
): Promise<AccessPayload | null> {
  if (!token) return null;
  return verifyAccessToken(token, env);
}
