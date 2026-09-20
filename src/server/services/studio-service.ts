// AI 工作台服务:生成(扣积分→出图→落盘→记录,失败全额退) + 作品列表 + 积分账本
// 仓储与 Provider 均注入,便于单测
import { AuthError } from "@/server/services/auth-service";

export const GENERATION_COST = 1; // 每张消耗积分

export interface StudioCaseRef {
  id: string;
  title: string;
  prompt: string;
}

export interface GenerationRef {
  id: string;
  caseId: string | null;
  prompt: string;
  provider: string;
  status: string;
  imagePath: string | null;
  creditCost: number;
  error: string | null;
  createdAt: Date;
}

export interface CreditLogRef {
  id: string;
  delta: number;
  reason: string;
  balanceAfter: number;
  createdAt: Date;
}

export interface StudioRepo {
  findCasePromptById(caseId: string): Promise<{ id: string; title: string; prompt: string } | null>;
  createGeneration(data: {
    userId: string;
    caseId: string | null;
    prompt: string;
    provider: string;
    status: string;
    creditCost: number;
  }): Promise<GenerationRef>;
  updateGenerationResult(
    id: string,
    data: { status: string; imagePath: string | null; error: string | null; creditCost: number },
  ): Promise<void>;
  listGenerationsByUser(userId: string, limit: number): Promise<GenerationRef[]>;
  /** 原子扣分:余额不足返回 false(条件更新,天然防并发超扣) */
  consumeCredits(userId: string, amount: number): Promise<boolean>;
  /** 加分(退款/赠送/调整),返回新余额 */
  addCredits(userId: string, delta: number): Promise<number>;
  createCreditLog(userId: string, delta: number, reason: string, balanceAfter: number): Promise<void>;
  listCreditLogs(userId: string, limit: number): Promise<CreditLogRef[]>;
  getBalance(userId: string): Promise<number>;
}

export interface GenerateInput {
  caseId?: string;
  replacements?: Record<string, string>;
  freePrompt?: string;
}

/** 将案例 prompt 中的 {占位符} 按用户输入替换;缺失或未提供的占位符保留原样并返回缺失清单 */
export function applyReplacements(prompt: string, replacements: Record<string, string> = {}): {
  final: string;
  missing: string[];
} {
  const missing: string[] = [];
  const final = prompt.replace(/\{([^{}]+)\}/g, (_, raw: string) => {
    const key = raw.trim();
    const v = replacements[key];
    if (typeof v !== "string" || !v.trim()) {
      if (!missing.includes(key)) missing.push(key);
      return `{${key}}`;
    }
    return v.trim();
  });
  return { final, missing };
}

export interface GenerateResult {
  generation: GenerationRef;
  balanceAfter: number;
}

/**
 * 生成一张图:
 * 1. 原子扣 1 积分(不足抛 INSUFFICIENT_CREDITS)
 * 2. 建 pending 记录 → 调 Provider → 成品落盘 → 记 succeeded
 * 3. Provider 失败:全额退还积分(generation_refund 流水)并记 failed
 */
export async function generate(
  repo: StudioRepo,
  provider: { name: string; generate: (prompt: string) => Promise<{ buffer: Buffer }> },
  opts: {
    userId: string;
    input: GenerateInput;
    storageDir: string; // public/generations 绝对路径
  },
): Promise<GenerateResult> {
  const { userId, input } = opts;

  // 1. 组装最终提示词
  let basePrompt: string;
  let caseId: string | null = null;
  if (input.caseId) {
    const c = await repo.findCasePromptById(input.caseId);
    if (!c) throw new AuthError("CASE_NOT_FOUND", "案例不存在或已下线");
    caseId = c.id;
    basePrompt = c.prompt;
  } else if (input.freePrompt && input.freePrompt.trim().length >= 8) {
    basePrompt = input.freePrompt.trim();
  } else {
    throw new AuthError("BAD_INPUT", "请选择案例填写占位符,或输入至少 8 个字符的自由提示词");
  }

  const { final: finalPrompt } =
    input.caseId && input.replacements ? applyReplacements(basePrompt, input.replacements) : { final: basePrompt };

  // 2. 原子扣积分(条件更新防并发超扣)
  const consumed = await repo.consumeCredits(userId, GENERATION_COST);
  if (!consumed) throw new AuthError("INSUFFICIENT_CREDITS", "积分不足,请联系管理员充值");
  const balanceAfterConsume = await repo.getBalance(userId);
  await repo.createCreditLog(userId, -GENERATION_COST, "generation", balanceAfterConsume);

  // 3. 建记录 → 出图 → 落盘
  const gen = await repo.createGeneration({
    userId,
    caseId,
    prompt: finalPrompt,
    provider: provider.name,
    status: "pending",
    creditCost: GENERATION_COST,
  });

  try {
    const { buffer } = await provider.generate(finalPrompt);
    const { writeFile, mkdir } = await import("node:fs/promises");
    const { join } = await import("node:path");
    await mkdir(opts.storageDir, { recursive: true });
    const ext = provider.name === "mock" ? "svg" : "png";
    const filename = `${gen.id}.${ext}`;
    await writeFile(join(opts.storageDir, filename), buffer);
    const imagePath = `generations/${filename}`;
    await repo.updateGenerationResult(gen.id, { status: "succeeded", imagePath, error: null, creditCost: GENERATION_COST });
    return {
      generation: { ...gen, status: "succeeded", imagePath, creditCost: GENERATION_COST },
      balanceAfter: balanceAfterConsume,
    };
  } catch (err) {
    // 失败全额退还并记流水,记录标记 failed
    const refunded = await repo.addCredits(userId, GENERATION_COST);
    await repo.createCreditLog(userId, GENERATION_COST, "generation_refund", refunded);
    await repo.updateGenerationResult(gen.id, {
      status: "failed",
      imagePath: null,
      error: err instanceof Error ? err.message.slice(0, 300) : "generation failed",
      creditCost: 0,
    });
    throw new AuthError("GENERATION_FAILED", "生成失败,积分已退还,请稍后重试");
  }
}

export async function listMyGenerations(repo: StudioRepo, userId: string, limit = 50): Promise<GenerationRef[]> {
  return repo.listGenerationsByUser(userId, limit);
}

export async function creditsSummary(repo: StudioRepo, userId: string): Promise<{ balance: number; logs: CreditLogRef[] }> {
  const [balance, logs] = await Promise.all([repo.getBalance(userId), repo.listCreditLogs(userId, 20)]);
  return { balance, logs };
}

/** 超管调整积分:结果余额不允许为负 */
export async function adminAdjustCredits(
  repo: StudioRepo,
  userId: string,
  delta: number,
  reason: string,
): Promise<number> {
  if (!Number.isInteger(delta) || delta === 0) throw new AuthError("BAD_DELTA", "调整量必须是非零整数");
  const current = await repo.getBalance(userId);
  const next = current + delta;
  if (next < 0) throw new AuthError("BAD_DELTA", `调整后余额为负(当前 ${current},调整 ${delta})`);
  await repo.addCredits(userId, delta);
  await repo.createCreditLog(userId, delta, `admin_adjust:${reason}`.slice(0, 60), next);
  return next;
}
