// 邀请码服务单测:签发校验/列表状态计算/启停/码碰撞重试
import { describe, it, expect } from "vitest";
import {
  generateInvite,
  listInvites,
  setInviteStatus,
  computeStatus,
  type InviteRepo,
  type InviteView,
} from "@/server/services/invite-service";

const SECRET = "unit-test-secret-0123456789abcdef";

interface FakeState {
  rows: InviteView[];
  createCalls: number;
  failFirstCreates: number;
}

function fakeInviteRepo(state: FakeState): InviteRepo {
  return {
    async createInvite(data) {
      state.createCalls += 1;
      if (state.createCalls <= state.failFirstCreates) {
        throw new Error("UNIQUE constraint failed: InviteCode.code");
      }
      const row: InviteView = {
        id: `inv-${state.createCalls}`,
        code: data.code,
        prefix: data.prefix,
        note: data.note,
        maxUses: data.maxUses,
        usedCount: 0,
        expiresAt: data.expiresAt,
        status: "active",
        createdAt: new Date(),
      };
      state.rows.push(row);
      return row;
    },
    async listInvites() {
      return state.rows;
    },
    async setInviteStatus(id, status) {
      const row = state.rows.find((r) => r.id === id);
      if (!row) return false;
      row.status = status;
      return true;
    },
  };
}

describe("generateInvite", () => {
  it("正常签发:30 天有效期、active、码以前缀开头", async () => {
    const state: FakeState = { rows: [], createCalls: 0, failFirstCreates: 0 };
    const repo = fakeInviteRepo(state);
    const now = new Date();
    const row = await generateInvite(repo, SECRET, "admin-1", {
      prefix: "ZS",
      maxUses: 10,
      expiresDays: 30,
      note: "发给张三",
    });
    expect(row.code.startsWith("ZS")).toBe(true);
    expect(row.status).toBe("active");
    const days = (row.expiresAt.getTime() - now.getTime()) / 86_400_000;
    expect(days).toBeGreaterThanOrEqual(29.9);
    expect(days).toBeLessThanOrEqual(30.1);
  });

  it("码唯一键冲突时自动换载荷重试(最多 3 次)", async () => {
    const state: FakeState = { rows: [], createCalls: 0, failFirstCreates: 2 };
    const repo = fakeInviteRepo(state);
    const row = await generateInvite(repo, SECRET, "admin-1", { expiresDays: 30, note: "x" });
    expect(row.id).toBe("inv-3"); // 前两次模拟碰撞,第三次成功
    expect(state.createCalls).toBe(3);
  });

  it("备注必填", async () => {
    const state: FakeState = { rows: [], createCalls: 0, failFirstCreates: 0 };
    await expect(
      generateInvite(fakeInviteRepo(state), SECRET, "admin-1", { expiresDays: 30, note: "  " }),
    ).rejects.toMatchObject({ code: "NOTE_REQUIRED" });
  });

  it("次数与有效期边界校验", async () => {
    const state: FakeState = { rows: [], createCalls: 0, failFirstCreates: 0 };
    const repo = fakeInviteRepo(state);
    await expect(
      generateInvite(repo, SECRET, "admin-1", { maxUses: 0, expiresDays: 30, note: "x" }),
    ).rejects.toMatchObject({ code: "BAD_MAX_USES" });
    await expect(
      generateInvite(repo, SECRET, "admin-1", { maxUses: 101, expiresDays: 30, note: "x" }),
    ).rejects.toMatchObject({ code: "BAD_MAX_USES" });
    await expect(
      generateInvite(repo, SECRET, "admin-1", { expiresDays: 0, note: "x" }),
    ).rejects.toMatchObject({ code: "BAD_EXPIRES" });
  });

  it("非法前缀拒绝(超长)", async () => {
    const state: FakeState = { rows: [], createCalls: 0, failFirstCreates: 0 };
    await expect(
      generateInvite(fakeInviteRepo(state), SECRET, "admin-1", { prefix: "ABCDE", expiresDays: 30, note: "x" }),
    ).rejects.toMatchObject({ code: "BAD_PREFIX" });
  });
});

describe("computeStatus", () => {
  const base = { status: "active", expiresAt: new Date(Date.now() + 86_400_000), usedCount: 0, maxUses: 5 };
  it("四种状态判定", () => {
    const now = new Date();
    expect(computeStatus({ ...base }, now)).toBe("active");
    expect(computeStatus({ ...base, status: "disabled" }, now)).toBe("disabled");
    expect(computeStatus({ ...base, expiresAt: new Date(now.getTime() - 1) }, now)).toBe("expired");
    expect(computeStatus({ ...base, usedCount: 5 }, now)).toBe("exhausted");
  });
});

describe("setInviteStatus / listInvites", () => {
  it("禁用与启用", async () => {
    const state: FakeState = { rows: [], createCalls: 0, failFirstCreates: 0 };
    const repo = fakeInviteRepo(state);
    await generateInvite(repo, SECRET, "admin-1", { expiresDays: 30, note: "x" });
    const id = state.rows[0].id;
    await setInviteStatus(repo, id, "disable");
    expect(state.rows[0].status).toBe("disabled");
    await setInviteStatus(repo, id, "enable");
    expect(state.rows[0].status).toBe("active");
  });

  it("不存在的码 → INVITE_NOT_FOUND", async () => {
    const state: FakeState = { rows: [], createCalls: 0, failFirstCreates: 0 };
    await expect(setInviteStatus(fakeInviteRepo(state), "ghost", "disable")).rejects.toMatchObject({
      code: "INVITE_NOT_FOUND",
    });
  });

  it("listInvites 返回全量", async () => {
    const state: FakeState = { rows: [], createCalls: 0, failFirstCreates: 0 };
    const repo = fakeInviteRepo(state);
    await generateInvite(repo, SECRET, "admin-1", { expiresDays: 30, note: "x" });
    await generateInvite(repo, SECRET, "admin-1", { prefix: "ZS", expiresDays: 30, note: "y" });
    expect((await listInvites(repo)).length).toBe(2);
  });
});
