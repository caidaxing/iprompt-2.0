// 邀请码服务:签发(平台签名码)/ 列表 / 启停
// 仓储与签名密钥注入,便于单测
import { generateInviteCode, isValidPrefix, normalizeInviteInput, expiresAtFromDays } from "@/server/lib/invite-code";
import { AuthError } from "@/server/services/auth-service";

export interface InviteView {
  id: string;
  code: string;
  prefix: string;
  note: string;
  maxUses: number;
  usedCount: number;
  expiresAt: Date;
  status: string; // active | disabled | expired | exhausted(计算得出)
  createdAt: Date;
}

export interface InviteRepo {
  createInvite(data: {
    code: string;
    prefix: string;
    payload: string;
    createdBy: string;
    maxUses: number;
    expiresAt: Date;
    note: string;
  }): Promise<InviteView>;
  listInvites(): Promise<InviteView[]>;
  setInviteStatus(id: string, status: string): Promise<boolean>;
}

export interface GenerateInviteInput {
  prefix?: string;
  maxUses?: number;
  expiresDays: number;
  note: string;
}

/** 计算展示状态(禁用 > 过期 > 用尽 > 有效) */
export function computeStatus(inv: { status: string; expiresAt: Date; usedCount: number; maxUses: number }, now: Date): string {
  if (inv.status === "disabled") return "disabled";
  if (inv.expiresAt.getTime() <= now.getTime()) return "expired";
  if (inv.usedCount >= inv.maxUses) return "exhausted";
  return "active";
}

/** 签发一张平台签名码;自定义码与既有码冲突时自动重试换载荷 */
export async function generateInvite(
  repo: InviteRepo,
  secret: string,
  adminId: string,
  input: GenerateInviteInput,
  now = new Date(),
): Promise<InviteView> {
  const note = input.note.trim();
  if (!note) throw new AuthError("NOTE_REQUIRED", "请填写发放对象备注");
  const maxUses = input.maxUses ?? 5;
  if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 100) {
    throw new AuthError("BAD_MAX_USES", "可用次数须为 1~100 的整数");
  }
  if (!Number.isInteger(input.expiresDays) || input.expiresDays < 1 || input.expiresDays > 3650) {
    throw new AuthError("BAD_EXPIRES", "有效期须为 1~3650 天");
  }
  const prefix = normalizeInviteInput(input.prefix || "IP");
  if (prefix && !isValidPrefix(prefix)) {
    throw new AuthError("BAD_PREFIX", "前缀须为 1~4 位字母数字(不含 0O1lI)");
  }

  const expiresAt = expiresAtFromDays(input.expiresDays, now);
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const gen = generateInviteCode(prefix, secret);
    try {
      const row = await repo.createInvite({
        code: gen.normalized,
        prefix: gen.prefix,
        payload: gen.payload,
        createdBy: adminId,
        maxUses,
        expiresAt,
        note,
      });
      return row;
    } catch (err) {
      lastErr = err; // 码唯一键冲突(极小概率)→ 换载荷重试
    }
  }
  throw new AuthError("GEN_FAILED", "生成失败,请重试:" + String((lastErr as Error)?.message ?? "").slice(0, 80));
}

export async function listInvites(repo: InviteRepo): Promise<InviteView[]> {
  return repo.listInvites();
}

/** 启用/禁用;目标不存在抛 USER_NOT_FOUND 语义复用为 INVITE_NOT_FOUND */
export async function setInviteStatus(
  repo: InviteRepo,
  id: string,
  action: "enable" | "disable",
): Promise<void> {
  const status = action === "enable" ? "active" : "disabled";
  const changed = await repo.setInviteStatus(id, status);
  if (!changed) throw new AuthError("INVITE_NOT_FOUND", "邀请码不存在");
}
