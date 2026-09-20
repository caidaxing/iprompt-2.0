import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { join } from "node:path";
import { getEnv } from "@/server/config/env";
import { getSessionUser } from "@/lib/session";
import { hit } from "@/server/lib/rate-limit";
import { getImageProvider } from "@/server/lib/image-provider";
import { prismaStudioRepo } from "@/server/repositories/studio-repo";
import { generate } from "@/server/services/studio-service";
import { AuthError } from "@/server/services/auth-service";

const schema = z
  .object({
    caseId: z.string().min(1).optional(),
    replacements: z.record(z.string(), z.string().max(500)).optional(),
    freePrompt: z.string().max(4000).optional(),
  })
  .refine((v) => v.caseId || (v.freePrompt && v.freePrompt.trim().length >= 8), {
    message: "请选择案例或输入至少 8 个字符的自由提示词",
  });

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

    // IP 维度防刷:1 小时内最多 20 次
    const ip = req.headers.get("x-forwarded-for") ?? "local";
    if (!hit(`studio:${ip}`, 20, 60 * 60_000)) {
      return NextResponse.json({ error: "生成过于频繁,请稍后再试" }, { status: 429 });
    }

    const body = schema.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 });
    }

    const env = getEnv();
    const result = await generate(prismaStudioRepo, getImageProvider(env.IMAGE_PROVIDER), {
      userId: user.id,
      input: body.data,
      storageDir: join(process.cwd(), "public", "generations"),
    });

    return NextResponse.json({
      ok: true,
      generation: { ...result.generation, createdAt: result.generation.createdAt.toISOString() },
      balanceAfter: result.balanceAfter,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      const status =
        err.code === "INSUFFICIENT_CREDITS" ? 402 : err.code === "CASE_NOT_FOUND" || err.code === "BAD_INPUT" ? 400 : 502;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    console.error("[studio/generate]", err);
    return NextResponse.json({ error: "服务开小差了,请稍后重试" }, { status: 500 });
  }
}
