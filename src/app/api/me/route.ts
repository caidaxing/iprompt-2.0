import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionPayload } from "@/lib/session";
import { prisma } from "@/server/lib/prisma";

const schema = z.object({ nickname: z.string().trim().min(1, "昵称不能为空").max(20, "昵称最长 20 字") });

/** 修改昵称（每人仅一次） */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSessionPayload();
    if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });

    const body = schema.safeParse(await req.json());
    if (!body.success) return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: session.uid } });
    if (!user) return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    if (user.nicknameEdited) {
      return NextResponse.json({ error: "昵称只能修改一次" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { nickname: body.data.nickname, nicknameEdited: true },
      select: { nickname: true },
    });
    return NextResponse.json({ ok: true, nickname: updated.nickname });
  } catch (err) {
    console.error("[me PATCH]", err);
    return NextResponse.json({ error: "服务开小差了，请稍后重试" }, { status: 500 });
  }
}
