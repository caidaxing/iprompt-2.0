import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionPayload } from "@/lib/session";
import { prisma } from "@/server/lib/prisma";
import { toggleFavorite, listFavorites, favoriteSetOf } from "@/server/services/favorite-service";

const toggleSchema = z.object({ caseId: z.string().min(1, "caseId 不能为空") });

/** 收藏列表（登录态） */
export async function GET() {
  try {
    const session = await getSessionPayload();
    if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    const items = await listFavorites(session.uid);
    const ids = await favoriteSetOf(session.uid);
    return NextResponse.json({ items, ids: [...ids] });
  } catch (err) {
    console.error("[favorites GET]", err);
    return NextResponse.json({ error: "服务开小差了，请稍后重试" }, { status: 500 });
  }
}

/** 收藏 / 取消收藏（切换） */
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionPayload();
    if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    const body = toggleSchema.safeParse(await req.json());
    if (!body.success) return NextResponse.json({ error: "参数不合法" }, { status: 400 });

    const result = await toggleFavorite(session.uid, body.data.caseId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[favorites POST]", err);
    return NextResponse.json({ error: "服务开小差了，请稍后重试" }, { status: 500 });
  }
}
