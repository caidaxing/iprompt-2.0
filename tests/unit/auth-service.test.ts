// 认证服务单测:内存假仓储,覆盖邀请码注册制验收标准
import { describe, it, expect, beforeEach } from "vitest";
import {
  login,
  register,
  rotateRefresh,
  logout,
  type AuthRepo,
  type UserRef,
  type UserStatus,
} from "@/server/services/auth-service";
import { resetPassword } from "@/server/services/admin-service";
import { generateInviteCode, getInviteSecret } from "@/server/lib/invite-code";
import { hashPassword, verifyPassword } from "@/server/lib/password";
import { __clearAll } from "@/server/lib/rate-limit";

const env = {
  AUTH_JWT_SECRET: "test-secret-0123456789abcdef",
  ACCESS_TOKEN_TTL_MIN: 15,
  REFRESH_TOKEN_TTL_DAYS: 30,
} as const;

const envWithAdmin = { ...env, ADMIN_EMAIL: "boss@test.com" };

interface FakeCreditLog { userId: string; delta: number; reason: string; balanceAfter: number }

interface FakeInvite {
  id: string;
  code: string; // 归一化串
  prefix: string;
  note: string;
  maxUses: number;
  usedCount: number;
  expiresAt: number;
  status: string;
}

/** 内存假仓储 */
function fakeRepo(): AuthRepo & {
  users: Map<string, UserRef>;
  tokenHashesByUser: Map<string, string[]>;
  creditLogs: FakeCreditLog[];
  invites: Map<string, FakeInvite>;
  consumed: Array<{ code: string; refunded: boolean }>;
} {
  const users = new Map<string, UserRef>();
  const tokens = new Map<string, { userId: string; expiresAt: number; revoked: boolean }>();
  const tokenHashesByUser = new Map<string, string[]>();
  const creditLogs: FakeCreditLog[] = [];
  const invites = new Map<string, FakeInvite>();
  const consumed: Array<{ code: string; refunded: boolean }> = [];
  let seq = 0;
  return {
    users,
    tokenHashesByUser,
    creditLogs,
    invites,
    consumed,
    async findUserByEmail(email) {
      return users.get(email) ?? null;
    },
    async findUserById(userId) {
      for (const u of users.values()) if (u.id === userId) return u;
      return null;
    },
    async createUser(email, passwordHash, status, role, inviteCodeId) {
      seq += 1;
      const user: UserRef = {
        id: `u-${seq}`,
        email,
        nickname: null,
        passwordHash,
        status,
        role,
        credits: 20,
        inviteCodeId: inviteCodeId ?? null,
        createdAt: new Date(),
      };
      users.set(email, user);
      return user;
    },
    async setUserStatus(userId, status) {
      for (const [key, u] of users.entries()) if (u.id === userId) users.set(key, { ...u, status });
    },
    async updatePasswordHash(userId, passwordHash) {
      for (const [key, u] of users.entries()) if (u.id === userId) users.set(key, { ...u, passwordHash });
    },
    async listUsersByStatus(status) {
      return [...users.values()].filter((u) => !status || u.status === status);
    },
    async createRefreshToken(userId, tokenHash, expiresAt) {
      tokens.set(tokenHash, { userId, expiresAt: expiresAt.getTime(), revoked: false });
      tokenHashesByUser.set(userId, [...(tokenHashesByUser.get(userId) ?? []), tokenHash]);
    },
    async findRefreshToken(tokenHash) {
      return tokens.get(tokenHash) ?? null;
    },
    async revokeRefreshToken(tokenHash) {
      const t = tokens.get(tokenHash);
      if (t) tokens.set(tokenHash, { ...t, revoked: true });
    },
    async revokeUserRefreshTokens(userId) {
      for (const h of tokenHashesByUser.get(userId) ?? []) {
        const t = tokens.get(h);
        if (t) tokens.set(h, { ...t, revoked: true });
      }
    },
    async createCreditLog(userId, delta, reason, balanceAfter) {
      creditLogs.push({ userId, delta, reason, balanceAfter });
    },
    async consumeInvite(normalizedCode, now) {
      const inv = invites.get(normalizedCode);
      if (!inv || inv.status !== "active" || inv.usedCount >= inv.maxUses || inv.expiresAt <= now.getTime()) return null;
      inv.usedCount += 1;
      consumed.push({ code: normalizedCode, refunded: false });
      return inv.id;
    },
    async refundInvite(normalizedCode) {
      const inv = invites.get(normalizedCode);
      if (inv && inv.usedCount > 0) {
        inv.usedCount -= 1;
        const c = consumed.findLast?.((x) => x.code === normalizedCode) ?? [...consumed].reverse().find((x) => x.code === normalizedCode);
        if (c) c.refunded = true;
      }
    },
  };
}

/** 在假仓储里登记一张有效签名码,返回归一化串 */
function seedInvite(repo: ReturnType<typeof fakeRepo>, normalized: string, opts?: Partial<FakeInvite>) {
  repo.invites.set(normalized, {
    id: `inv-${repo.invites.size + 1}`,
    code: normalized,
    prefix: "T",
    note: "测试",
    maxUses: 5,
    usedCount: 0,
    expiresAt: Date.now() + 30 * 86_400_000,
    status: "active",
    ...opts,
  });
  return normalized;
}

describe("register(邀请码制)", () => {
  beforeEach(() => __clearAll());

  it("携有效签名码注册 → 账号直接激活", async () => {
    const repo = fakeRepo();
    const gen = generateInviteCode("T", getInviteSecret(env.AUTH_JWT_SECRET));
    seedInvite(repo, gen.normalized);

    const r = await register(repo, env, { email: "a@b.com", password: "password123", inviteCode: gen.display });
    expect(r.status).toBe("active");
    expect(r.role).toBe("user");

    const stored = await repo.findUserByEmail("a@b.com");
    expect(stored?.status).toBe("active");
    expect(stored?.inviteCodeId).toBe("inv-1"); // 假仓储返回的邀请码 id
    expect(await verifyPassword("password123", stored!.passwordHash)).toBe(true);
    expect(repo.creditLogs[0]).toMatchObject({ userId: stored!.id, delta: 20, reason: "register_gift", balanceAfter: 20 });
  });

  it("无邀请码 → INVITE_REQUIRED", async () => {
    const repo = fakeRepo();
    await expect(register(repo, env, { email: "a@b.com", password: "password123" })).rejects.toMatchObject({
      code: "INVITE_REQUIRED",
    });
  });

  it("伪造/乱编的码 → 验签失败 INVITE_INVALID", async () => {
    const repo = fakeRepo();
    await expect(
      register(repo, env, { email: "a@b.com", password: "password123", inviteCode: "IP-AAAAAAAABBBB-CCCCCCCC" }),
    ).rejects.toMatchObject({ code: "INVITE_INVALID" });
  });

  it("过期码 → INVITE_INVALID", async () => {
    const repo = fakeRepo();
    const gen = generateInviteCode("T", getInviteSecret(env.AUTH_JWT_SECRET));
    seedInvite(repo, gen.normalized, { expiresAt: Date.now() - 1000 });
    await expect(
      register(repo, env, { email: "a@b.com", password: "password123", inviteCode: gen.display }),
    ).rejects.toMatchObject({ code: "INVITE_INVALID" });
  });

  it("禁用码 → INVITE_INVALID", async () => {
    const repo = fakeRepo();
    const gen = generateInviteCode("T", getInviteSecret(env.AUTH_JWT_SECRET));
    seedInvite(repo, gen.normalized, { status: "disabled" });
    await expect(
      register(repo, env, { email: "a@b.com", password: "password123", inviteCode: gen.display }),
    ).rejects.toMatchObject({ code: "INVITE_INVALID" });
  });

  it("用尽码 → INVITE_INVALID", async () => {
    const repo = fakeRepo();
    const gen = generateInviteCode("T", getInviteSecret(env.AUTH_JWT_SECRET));
    seedInvite(repo, gen.normalized, { maxUses: 2, usedCount: 2 });
    await expect(
      register(repo, env, { email: "a@b.com", password: "password123", inviteCode: gen.display }),
    ).rejects.toMatchObject({ code: "INVITE_INVALID" });
  });

  it("输入含空格/连字符/小写 → 归一化后可用", async () => {
    const repo = fakeRepo();
    const gen = generateInviteCode("ZS", getInviteSecret(env.AUTH_JWT_SECRET));
    seedInvite(repo, gen.normalized);
    const messy = gen.display.toLowerCase().split("").join(" ").replace(/ - /g, "-");
    const r = await register(repo, env, { email: "a@b.com", password: "password123", inviteCode: messy });
    expect(r.status).toBe("active");
  });

  it("重复邮箱 → EMAIL_EXISTS 且核销回退", async () => {
    const repo = fakeRepo();
    const gen = generateInviteCode("T", getInviteSecret(env.AUTH_JWT_SECRET));
    seedInvite(repo, gen.normalized);
    await register(repo, env, { email: "a@b.com", password: "password123", inviteCode: gen.display });
    const before = repo.invites.get(gen.normalized)!.usedCount;

    await expect(
      register(repo, env, { email: "a@b.com", password: "password456", inviteCode: gen.display }),
    ).rejects.toMatchObject({ code: "EMAIL_EXISTS" });
    // 回退:第二次核销被撤销,usedCount 保持 1
    expect(repo.invites.get(gen.normalized)!.usedCount).toBe(1);
    expect(before).toBe(1);
  });

  it("命中 ADMIN_EMAIL → 免邀请码直接 active+admin", async () => {
    const repo = fakeRepo();
    const r = await register(repo, envWithAdmin, { email: "BOSS@test.com", password: "password123" });
    expect(r.status).toBe("active");
    expect(r.role).toBe("admin");
    expect((await repo.findUserByEmail("boss@test.com"))?.inviteCodeId).toBeNull();
  });

  it("邮箱大写统一转小写", async () => {
    const repo = fakeRepo();
    const gen = generateInviteCode("T", getInviteSecret(env.AUTH_JWT_SECRET));
    seedInvite(repo, gen.normalized);
    await register(repo, env, { email: "MiXeD@B.com", password: "password123", inviteCode: gen.display });
    expect(await repo.findUserByEmail("mixed@b.com")).toBeTruthy();
  });
});

describe("login", () => {
  beforeEach(() => __clearAll());

  async function seed(repo: AuthRepo, email: string, status: UserStatus = "active") {
    await repo.createUser(email, await hashPassword("password123"), status, "user");
  }

  it("active 用户密码正确 → 签发双令牌", async () => {
    const repo = fakeRepo();
    await seed(repo, "a@b.com");
    const r = await login(repo, env, { email: "a@b.com", password: "password123" });
    expect(r.accessToken).toBeTruthy();
    expect(r.refreshToken).toBeTruthy();
    expect(r.userId).toBe((await repo.findUserByEmail("a@b.com"))!.id);
  });

  it("密码错误 → BAD_CREDENTIALS", async () => {
    const repo = fakeRepo();
    await seed(repo, "a@b.com");
    await expect(login(repo, env, { email: "a@b.com", password: "wrong-password" })).rejects.toMatchObject({
      code: "BAD_CREDENTIALS",
    });
  });

  it("账号不存在 → 同样的 BAD_CREDENTIALS(防枚举)", async () => {
    const repo = fakeRepo();
    await expect(login(repo, env, { email: "ghost@b.com", password: "whatever123" })).rejects.toMatchObject({
      code: "BAD_CREDENTIALS",
    });
  });

  it("rejected 用户密码正确 → AUTH_REJECTED", async () => {
    const repo = fakeRepo();
    await seed(repo, "r@b.com", "rejected");
    await expect(login(repo, env, { email: "r@b.com", password: "password123" })).rejects.toMatchObject({
      code: "AUTH_REJECTED",
    });
  });

  it("连续 5 次失败后锁定", async () => {
    const repo = fakeRepo();
    await seed(repo, "l@b.com");
    for (let i = 0; i < 5; i++) {
      await expect(login(repo, env, { email: "l@b.com", password: "wrong-password" })).rejects.toMatchObject({
        code: "BAD_CREDENTIALS",
      });
    }
    await expect(login(repo, env, { email: "l@b.com", password: "password123" })).rejects.toMatchObject({
      code: "LOCKED",
    });
  });

  it("登录成功会重置失败计数", async () => {
    const repo = fakeRepo();
    await seed(repo, "s@b.com");
    for (let i = 0; i < 4; i++) {
      await login(repo, env, { email: "s@b.com", password: "wrong-password" }).catch(() => {});
    }
    const r = await login(repo, env, { email: "s@b.com", password: "password123" });
    expect(r.accessToken).toBeTruthy();
    await expect(login(repo, env, { email: "s@b.com", password: "wrong-password" })).rejects.toMatchObject({
      code: "BAD_CREDENTIALS", // 未锁定:成功登录已重置计数
    });
  });
});

describe("rotateRefresh / logout", () => {
  beforeEach(() => __clearAll());

  it("旋转:旧令牌失效、新令牌可用", async () => {
    const repo = fakeRepo();
    await repo.createUser("a@b.com", await hashPassword("password123"), "active", "user");
    const r = await login(repo, env, { email: "a@b.com", password: "password123" });
    const rotated = await rotateRefresh(repo, env, r.refreshToken);
    expect(rotated).toBeTruthy();
    expect(rotated!.refreshToken).not.toBe(r.refreshToken);
    expect(await rotateRefresh(repo, env, r.refreshToken)).toBeNull(); // 旧令牌已被旋转失效
  });

  it("用户被拒后刷新令牌不再可用", async () => {
    const repo = fakeRepo();
    const user = await repo.createUser("a@b.com", await hashPassword("password123"), "active", "user");
    const r = await login(repo, env, { email: "a@b.com", password: "password123" });
    await repo.setUserStatus(user.id, "rejected");
    expect(await rotateRefresh(repo, env, r.refreshToken)).toBeNull();
  });

  it("logout 后刷新令牌失效", async () => {
    const repo = fakeRepo();
    await repo.createUser("a@b.com", await hashPassword("password123"), "active", "user");
    const r = await login(repo, env, { email: "a@b.com", password: "password123" });
    await logout(repo, r.refreshToken);
    expect(await rotateRefresh(repo, env, r.refreshToken)).toBeNull();
  });
});

describe("admin resetPassword", () => {
  beforeEach(() => __clearAll());

  it("重置后新密码可登录、旧会话全部吊销", async () => {
    const repo = fakeRepo();
    const user = await repo.createUser("a@b.com", await hashPassword("password123"), "active", "user");
    const r = await login(repo, env, { email: "a@b.com", password: "password123" });

    await resetPassword(repo, user.id, "newpassword456");

    await expect(login(repo, env, { email: "a@b.com", password: "password123" })).rejects.toMatchObject({
      code: "BAD_CREDENTIALS",
    });
    expect(await rotateRefresh(repo, env, r.refreshToken)).toBeNull(); // 旧会话被吊销
    const ok = await login(repo, env, { email: "a@b.com", password: "newpassword456" });
    expect(ok.accessToken).toBeTruthy();
  });

  it("用户不存在 → USER_NOT_FOUND", async () => {
    const repo = fakeRepo();
    await expect(resetPassword(repo, "nobody", "newpassword456")).rejects.toMatchObject({
      code: "USER_NOT_FOUND",
    });
  });
});

describe("password hashing", () => {
  it("哈希可验证,且每次盐不同", async () => {
    const h1 = await hashPassword("password123");
    const h2 = await hashPassword("password123");
    expect(h1).not.toBe(h2);
    expect(await verifyPassword("password123", h1)).toBe(true);
    expect(await verifyPassword("password124", h1)).toBe(false);
  });

  it("非法哈希格式返回 false 而不是抛错", async () => {
    expect(await verifyPassword("x", "not-a-hash")).toBe(false);
    expect(await verifyPassword("x", "")).toBe(false);
  });
});
