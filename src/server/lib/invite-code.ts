// 平台签名邀请码:前缀-载荷-签名 三段式
// 签名 = HMAC-SHA256(密钥, 前缀+载荷) 截取编码;无密钥无法伪造能通过验签的码
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const CHARSET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // 31 个,去掉 0O1lI
const PAYLOAD_LEN = 10;
const SIG_LEN = 8;
export const PREFIX_MIN = 1;
export const PREFIX_MAX = 4;

export function getInviteSecret(authJwtSecret: string, custom?: string): string {
  if (custom) return custom;
  return createHmac("sha256", "invite-v1").update(authJwtSecret).digest("hex");
}

/** 输入归一化:去空格/连字符等非字母数字、转大写 */
export function normalizeInviteInput(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function encode(buf: Buffer, len: number): string {
  let out = "";
  let acc = 0;
  let bits = 0;
  let i = 0;
  while (out.length < len) {
    if (bits < 5) {
      acc = ((acc << 8) | buf[i % buf.length]) & 0xfffff;
      bits += 8;
      i += 1;
    }
    // 字符集长 31(非 2 的幂):& 31 取 5bit 后再模 31,取值偏差可忽略
    const idx = ((acc >> (bits - 5)) & 31) % CHARSET.length;
    acc &= (1 << (bits - 5)) - 1;
    bits -= 5;
    out += CHARSET[idx];
  }
  return out;
}

function sign(prefix: string, payload: string, secret: string): string {
  const digest = createHmac("sha256", secret).update(prefix + payload).digest();
  return encode(digest, SIG_LEN);
}

/** 前缀是人读的,放开全字母数字;易混淆字符集仅约束机器生成的载荷/签名 */
export function isValidPrefix(prefix: string): boolean {
  return /^[A-Z0-9]{1,4}$/.test(prefix);
}

export interface GeneratedInvite {
  display: string; // 前缀-载荷-签名(带连字符,展示/发放用)
  normalized: string; // 归一化串(入库唯一键)
  prefix: string;
  payload: string;
}

/** 生成一张平台签名码 */
export function generateInviteCode(prefixInput: string, secret: string): GeneratedInvite {
  const prefix = normalizeInviteInput(prefixInput || "IP");
  if (!isValidPrefix(prefix)) throw new Error(`前缀须为 ${PREFIX_MIN}-${PREFIX_MAX} 位字母数字`);
  const payload = encode(randomBytes(PAYLOAD_LEN), PAYLOAD_LEN);
  const sig = sign(prefix, payload, secret);
  return {
    display: `${prefix}-${payload}-${sig}`,
    normalized: prefix + payload + sig,
    prefix,
    payload,
  };
}

export interface VerifiedInvite {
  prefix: string;
  payload: string;
  normalized: string;
}

/** 两级验证的第一级:验签。通过返回归一化解析结果;伪造/格式非法返回 null(不查库) */
export function verifyInviteSignature(raw: string, secret: string): VerifiedInvite | null {
  const normalized = normalizeInviteInput(raw);
  const minLen = PREFIX_MIN + PAYLOAD_LEN + SIG_LEN;
  const maxLen = PREFIX_MAX + PAYLOAD_LEN + SIG_LEN;
  if (normalized.length < minLen || normalized.length > maxLen) return null;
  const sig = normalized.slice(-SIG_LEN);
  const payload = normalized.slice(-SIG_LEN - PAYLOAD_LEN, -SIG_LEN);
  const prefix = normalized.slice(0, -SIG_LEN - PAYLOAD_LEN);
  const expected = sign(prefix, payload, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { prefix, payload, normalized };
}

/** 签发时计算过期时间 */
export function expiresAtFromDays(days: number, from = new Date()): Date {
  return new Date(from.getTime() + days * 86_400_000);
}
