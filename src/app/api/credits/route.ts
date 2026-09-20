import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prismaStudioRepo } from "@/server/repositories/studio-repo";
import { creditsSummary } from "@/server/services/studio-service";

/** 积分账本:余额 + 最近 20 笔流水 */
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

    const summary = await creditsSummary(prismaStudioRepo, user.id);
    return NextResponse.json({
      balance: summary.balance,
      logs: summary.logs.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })),
    });
  } catch (err) {
    console.error("[credits]", err);
    return NextResponse.json({ error: "服务开小差了,请稍后重试" }, { status: 500 });
  }
}
