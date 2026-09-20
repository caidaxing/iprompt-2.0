import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/lib/prisma";

const schema = z.object({ email: z.string().email("邮箱格式不正确") });

/** AI 匹配上线订阅（重复邮箱去重） */
export async function POST(req: NextRequest) {
  try {
    const body = schema.safeParse(await req.json());
    if (!body.success) return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 });

    const email = body.data.email.toLowerCase();
    const existing = await prisma.subscriber.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ ok: true, duplicate: true, message: "这个邮箱已经留过了" });
    }
    await prisma.subscriber.create({ data: { email } });
    return NextResponse.json({ ok: true, message: "已收到，上线时通知你" });
  } catch (err) {
    console.error("[subscribe]", err);
    return NextResponse.json({ error: "服务开小差了，请稍后重试" }, { status: 500 });
  }
}
