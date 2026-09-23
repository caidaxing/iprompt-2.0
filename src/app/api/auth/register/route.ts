import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getEnv } from "@/server/config/env";
import { hit } from "@/server/lib/rate-limit";
import { prismaAuthRepo } from "@/server/repositories/auth-repo";
import { register, AuthError } from "@/server/services/auth-service";

const schema = z.object({
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(8, "密码至少 8 位").max(72, "密码过长"),
  inviteCode: z.string().max(100).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 });
    }

    // IP 维度防批量注册:1 小时内最多 10 次
    const ip = req.headers.get("x-forwarded-for") ?? "local";
    if (!hit(`register:${ip}`, 10, 60 * 60_000)) {
      return NextResponse.json({ error: "操作过于频繁,请稍后再试" }, { status: 429 });
    }

    try {
      await register(prismaAuthRepo, getEnv(), {
        email: body.data.email.toLowerCase(),
        password: body.data.password,
        inviteCode: body.data.inviteCode,
      });
    } catch (err) {
      if (err instanceof AuthError) {
        // 防枚举:邮箱已存在时对外的响应与提交成功完全一致
        if (err.code === "EMAIL_EXISTS") {
          return NextResponse.json({ ok: true, message: "注册成功,使用邮箱和密码登录即可" });
        }
        // 邀请码错误是用户输入问题,文案本身不含库内信息
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }

    return NextResponse.json({
      ok: true,
      message: "注册成功,使用邮箱和密码登录即可",
    });
  } catch (err) {
    console.error("[register]", err);
    return NextResponse.json({ error: "服务开小差了,请稍后重试" }, { status: 500 });
  }
}
