import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/session";
import { prismaAuthRepo } from "@/server/repositories/auth-repo";
import { prismaStudioRepo } from "@/server/repositories/studio-repo";
import { adminAdjustCredits } from "@/server/services/studio-service";
import { AuthError } from "@/server/services/auth-service";

const schema = z.object({
  delta: z.number().int(),
  reason: z.string().min(1, "请填写调整原因").max(50),
});

/** 超管调整用户积分:POST { delta: ±N, reason } */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireAdminUser();
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = schema.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 });
    }
    const { id } = await params;
    if (!(await prismaAuthRepo.findUserById(id))) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }
    const balanceAfter = await adminAdjustCredits(prismaStudioRepo, id, body.data.delta, body.data.reason);
    return NextResponse.json({ ok: true, balanceAfter });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[admin/credits]", err);
    return NextResponse.json({ error: "服务开小差了,请稍后重试" }, { status: 500 });
  }
}
