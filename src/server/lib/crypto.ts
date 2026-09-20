// 加密与令牌工具：哈希、随机令牌、JWT 签发/校验
import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import type { Env } from "@/server/config/env";

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sixDigitCode(): string {
  return String(randomBytes(4).readUInt32BE(0) % 1_000_000).padStart(6, "0");
}

const secretKey = (secret: string) => new TextEncoder().encode(secret);

export interface AccessPayload {
  uid: string;
  email: string;
}

export async function signAccessToken(
  payload: AccessPayload,
  env: Pick<Env, "AUTH_JWT_SECRET" | "ACCESS_TOKEN_TTL_MIN">,
): Promise<string> {
  return new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.uid)
    .setIssuedAt()
    .setExpirationTime(`${env.ACCESS_TOKEN_TTL_MIN}m`)
    .sign(secretKey(env.AUTH_JWT_SECRET));
}

export async function verifyAccessToken(
  token: string,
  env: Pick<Env, "AUTH_JWT_SECRET">,
): Promise<AccessPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(env.AUTH_JWT_SECRET));
    if (!payload.sub) return null;
    return { uid: payload.sub, email: String(payload.email ?? "") };
  } catch {
    return null;
  }
}
