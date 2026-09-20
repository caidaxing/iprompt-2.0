import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prismaStudioRepo } from "@/server/repositories/studio-repo";
import { listMyGenerations } from "@/server/services/studio-service";

/** 当前用户的作品列表(不含他人数据) */
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

    const generations = await listMyGenerations(prismaStudioRepo, user.id);
    return NextResponse.json({
      generations: generations.map((g) => ({ ...g, createdAt: g.createdAt.toISOString() })),
    });
  } catch (err) {
    console.error("[studio/generations]", err);
    return NextResponse.json({ error: "服务开小差了,请稍后重试" }, { status: 500 });
  }
}
