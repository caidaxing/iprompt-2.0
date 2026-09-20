// 工作台服务单测:占位符替换 / 扣积分生成 / 失败退款 / 管理端调分
import { describe, it, expect, beforeEach } from "vitest";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  generate,
  applyReplacements,
  adminAdjustCredits,
  GENERATION_COST,
  type StudioRepo,
  type GenerationRef,
} from "@/server/services/studio-service";
import { MockImageProvider } from "@/server/lib/image-provider";

function fakeStudioRepo(): StudioRepo & {
  balances: Map<string, number>;
  cases: Map<string, { id: string; title: string; prompt: string }>;
  generations: GenerationRef[];
  logs: Array<{ userId: string; delta: number; reason: string; balanceAfter: number }>;
} {
  const balances = new Map<string, number>();
  const cases = new Map<string, { id: string; title: string; prompt: string }>();
  const generations: Array<GenerationRef & { userId: string }> = [];
  const logs: Array<{ userId: string; delta: number; reason: string; balanceAfter: number }> = [];
  let seq = 0;
  return {
    balances,
    cases,
    generations,
    logs,
    async findCasePromptById(caseId) {
      return cases.get(caseId) ?? null;
    },
    async createGeneration(data) {
      seq += 1;
      const row = {
        id: `g-${seq}`,
        caseId: data.caseId ?? null,
        prompt: data.prompt,
        provider: data.provider,
        status: data.status,
        imagePath: null as string | null,
        creditCost: data.creditCost,
        error: null as string | null,
        createdAt: new Date(),
        userId: data.userId,
      };
      generations.push({ ...row, userId: data.userId });
      return row;
    },
    async updateGenerationResult(id, data) {
      const g = generations.find((x) => x.id === id);
      if (g) {
        g.status = data.status;
        g.creditCost = data.creditCost;
      }
    },
    async listGenerationsByUser(userId, limit) {
      return generations.filter((g) => g.userId === userId).slice(0, limit);
    },
    async consumeCredits(userId, amount) {
      const b = balances.get(userId) ?? 0;
      if (b < amount) return false;
      balances.set(userId, b - amount);
      return true;
    },
    async addCredits(userId, delta) {
      const next = (balances.get(userId) ?? 0) + delta;
      balances.set(userId, next);
      return next;
    },
    async createCreditLog(userId, delta, reason, balanceAfter) {
      logs.push({ userId, delta, reason, balanceAfter });
    },
    async listCreditLogs(userId, limit) {
      return logs
        .filter((l) => l.userId === userId)
        .slice(0, limit)
        .map((l) => ({ ...l, id: `cl-${logs.indexOf(l)}`, createdAt: new Date() }));
    },
    async getBalance(userId) {
      return balances.get(userId) ?? 0;
    },
  };
}

describe("applyReplacements", () => {
  it("替换占位符并列出缺失项", () => {
    const r = applyReplacements("A {subject} on {background} with {subject} vibes", {
      subject: "red mug",
    });
    expect(r.final).toBe("A red mug on {background} with red mug vibes");
    expect(r.missing).toEqual(["background"]);
  });
});

describe("generate", () => {
  function setup(balance = 5) {
    const repo = fakeStudioRepo();
    repo.balances.set("u1", balance);
    repo.cases.set("case-1", {
      id: "case-1",
      title: "产品海报",
      prompt: "A clean poster of a {subject} on {background}",
    });
    return { repo };
  }

  it("案例生成成功:扣 1 积分、文件落盘、记录 succeeded", async () => {
    const { repo } = setup();
    const storageDir = await mkdtemp(join(tmpdir(), "iprompt-gen-"));
    const r = await generate(repo, new MockImageProvider(), {
      userId: "u1",
      input: { caseId: "case-1", replacements: { subject: "red mug", background: "oak table" } },
      storageDir,
    });

    expect(r.balanceAfter).toBe(4);
    expect(r.generation.status).toBe("succeeded");
    expect(r.generation.imagePath).toBe(`generations/${r.generation.id}.svg`);
    expect(r.generation.prompt).toContain("red mug");
    // 文件真实落盘
    const buf = await readFile(join(storageDir, `${r.generation.id}.svg`));
    expect(buf.length).toBeGreaterThan(100);
    // 流水:一笔消耗
    expect(repo.logs.filter((l) => l.reason === "generation")).toHaveLength(1);
  });

  it("余额不足 → INSUFFICIENT_CREDITS,且不产生生成记录", async () => {
    const { repo } = setup(0);
    await expect(
      generate(repo, new MockImageProvider(), { userId: "u1", input: { freePrompt: "a lovely cat poster" }, storageDir: "/tmp/x" }),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_CREDITS" });
    expect(repo.generations).toHaveLength(0);
  });

  it("自由提示词过短 → BAD_INPUT,不扣分", async () => {
    const { repo } = setup();
    await expect(
      generate(repo, new MockImageProvider(), { userId: "u1", input: { freePrompt: "短" }, storageDir: "/tmp/x" }),
    ).rejects.toMatchObject({ code: "BAD_INPUT" });
    expect(repo.balances.get("u1")).toBe(5);
  });

  it("案例不存在 → CASE_NOT_FOUND", async () => {
    const { repo } = setup();
    await expect(
      generate(repo, new MockImageProvider(), { userId: "u1", input: { caseId: "nope" }, storageDir: "/tmp/x" }),
    ).rejects.toMatchObject({ code: "CASE_NOT_FOUND" });
  });

  it("Provider 失败 → 积分全额退还,记录 failed", async () => {
    const { repo } = setup();
    const failing = { name: "mock", generate: async () => Promise.reject(new Error("boom")) };
    await expect(
      generate(repo, failing, { userId: "u1", input: { freePrompt: "a lovely cat poster" }, storageDir: "/tmp/x" }),
    ).rejects.toMatchObject({ code: "GENERATION_FAILED" });
    expect(repo.balances.get("u1")).toBe(5); // 已退还
    expect(repo.logs.filter((l) => l.reason === "generation_refund")).toHaveLength(1);
    expect(repo.generations[0].status).toBe("failed");
    expect(repo.generations[0].creditCost).toBe(0);
  });
});

describe("adminAdjustCredits", () => {
  it("正常加减并写流水", async () => {
    const repo = fakeStudioRepo();
    repo.balances.set("u1", 10);
    expect(await adminAdjustCredits(repo, "u1", -3, "活动扣减")).toBe(7);
    expect(await adminAdjustCredits(repo, "u1", 100, "活动赠送")).toBe(107);
    expect(repo.logs).toHaveLength(2);
  });

  it("调整后为负 → BAD_DELTA", async () => {
    const repo = fakeStudioRepo();
    repo.balances.set("u1", 2);
    await expect(adminAdjustCredits(repo, "u1", -5, "x")).rejects.toMatchObject({ code: "BAD_DELTA" });
  });

  it("非零整数校验", async () => {
    const repo = fakeStudioRepo();
    await expect(adminAdjustCredits(repo, "u1", 0, "x")).rejects.toMatchObject({ code: "BAD_DELTA" });
    await expect(adminAdjustCredits(repo, "u1", 1.5, "x")).rejects.toMatchObject({ code: "BAD_DELTA" });
  });
});

describe("成本常量", () => {
  it("每张消耗 1 积分", () => {
    expect(GENERATION_COST).toBe(1);
  });
});
