import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getEnv } from "@/server/config/env";
import { cookieBase, ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/session";
import { prismaAuthRepo } from "@/server/repositories/auth-repo";
import { login, AuthError } from "@/server/services/auth-service";

const schema = z.object({
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(1, "请输入密码"),
});

/** 各错误码对应的 HTTP 状态；其余走 400 */
const STATUS_BY_CODE: Record<string, number> = {
  BAD_CREDENTIALS: 401,
  AUTH_PENDING: 403,
  AUTH_REJECTED: 403,
  LOCKED: 423,
};

export async function POST(req: NextRequest) {
  try {
    const body = schema.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 });
    }

    const env = getEnv();
    const result = await login(prismaAuthRepo, env, {
      email: body.data.email.toLowerCase(),
      password: body.data.password,
    });

    const res = NextResponse.json({ ok: true, email: result.email });
    res.cookies.set(ACCESS_COOKIE, result.accessToken, { ...cookieBase, maxAge: env.ACCESS_TOKEN_TTL_MIN * 60 });
    res.cookies.set(REFRESH_COOKIE, result.refreshToken, { ...cookieBase, maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86_400 });
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      const status = STATUS_BY_CODE[err.code] ?? 400;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    console.error("[login]", err);
    return NextResponse.json({ error: "服务开小差了，请稍后重试" }, { status: 500 });
  }
}
