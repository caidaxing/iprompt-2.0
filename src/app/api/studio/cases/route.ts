import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/server/lib/prisma";

/** 工作台案例选择器:最近 60 条(编号/标题/提示词,含占位符原文) */
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

    const cases = await prisma.case.findMany({
      select: { id: true, num: true, title: true, prompt: true, modelId: true },
      orderBy: { createdAt: "desc" },
      take: 60,
    });
    return NextResponse.json({ cases });
  } catch (err) {
    console.error("[studio/cases]", err);
    return NextResponse.json({ error: "服务开小差了,请稍后重试" }, { status: 500 });
  }
}
