// 会话工具：服务端组件 / 路由处理器读取当前登录用户
import { cookies } from "next/headers";
import { getEnv } from "@/server/config/env";
import { userFromAccess } from "@/server/services/auth-service";
import { prisma } from "@/server/lib/prisma";

export const ACCESS_COOKIE = "ip_at";
export const REFRESH_COOKIE = "ip_rt";

export const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
};

export interface SessionUser {
  id: string;
  email: string;
  nickname: string | null;
  role: string;
}

/** 服务端组件内读取当前用户（不校验 DB 存在性，轻量） */
export async function getSessionPayload() {
  const store = await cookies();
  return userFromAccess(getEnv(), store.get(ACCESS_COOKIE)?.value);
}

/** 需要完整用户资料时使用 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const payload = await getSessionPayload();
  if (!payload) return null;
  const user = await prisma.user.findUnique({
    where: { id: payload.uid },
    select: { id: true, email: true, nickname: true, role: true },
  });
  return user ?? null;
}

/** 管理端点守卫：未登录 401，非 admin 403 */
export async function requireAdminUser(): Promise<
  { ok: true; user: SessionUser } | { ok: false; status: 401 | 403; error: string }
> {
  const user = await getSessionUser();
  if (!user) return { ok: false, status: 401, error: "未登录" };
  if (user.role !== "admin") return { ok: false, status: 403, error: "无权限" };
  return { ok: true, user };
}
