import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getEnv } from "@/server/config/env";
import { ACCESS_COOKIE, REFRESH_COOKIE, cookieBase } from "@/lib/session";
import { prismaAuthRepo } from "@/server/repositories/auth-repo";
import { rotateRefresh, userFromAccess } from "@/server/services/auth-service";
import { prisma } from "@/server/lib/prisma";

/** 当前用户信息；访问令牌过期但刷新令牌有效时静默旋转续期 */
export async function GET() {
  try {
    const env = getEnv();
    const store = await cookies();
    let payload = await userFromAccess(env, store.get(ACCESS_COOKIE)?.value);

    let rotated: { accessToken: string; refreshToken: string } | null = null;
    if (!payload) {
      const refresh = store.get(REFRESH_COOKIE)?.value;
      if (refresh) {
        const result = await rotateRefresh(prismaAuthRepo, env, refresh);
        if (result) {
          payload = { uid: result.userId, email: result.email };
          rotated = { accessToken: result.accessToken, refreshToken: result.refreshToken };
        }
      }
    }

    if (!payload) return NextResponse.json({ user: null }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: payload.uid },
      select: { id: true, email: true, nickname: true, role: true },
    });
    if (!user) return NextResponse.json({ user: null }, { status: 401 });

    const res = NextResponse.json({ user });
    if (rotated) {
      res.cookies.set(ACCESS_COOKIE, rotated.accessToken, { ...cookieBase, maxAge: env.ACCESS_TOKEN_TTL_MIN * 60 });
      res.cookies.set(REFRESH_COOKIE, rotated.refreshToken, { ...cookieBase, maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86_400 });
    }
    return res;
  } catch (err) {
    console.error("[me]", err);
    return NextResponse.json({ error: "服务开小差了，请稍后重试" }, { status: 500 });
  }
}
