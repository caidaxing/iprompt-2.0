import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/session";
import { inviteRepo } from "@/server/repositories/invite-repo";
import { generateInvite, listInvites, computeStatus } from "@/server/services/invite-service";
import { getInviteSecret } from "@/server/lib/invite-code";
import { getEnv } from "@/server/config/env";

const createSchema = z.object({
  prefix: z.string().max(8).optional(),
  maxUses: z.number().int().min(1).max(100).optional(),
  expiresDays: z.number().int().min(1).max(3650),
  note: z.string().trim().min(1, "请填写发放对象备注").max(50),
});

/** 邀请码列表(仅 admin,含计算状态) */
export async function GET() {
  try {
    const guard = await requireAdminUser();
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const now = new Date();
    const rows = await listInvites(inviteRepo);
    return NextResponse.json({
      invites: rows.map((r) => ({
        id: r.id,
        code: r.code,
        prefix: r.prefix,
        note: r.note,
        maxUses: r.maxUses,
        usedCount: r.usedCount,
        expiresAt: r.expiresAt.toISOString(),
        createdAt: r.createdAt.toISOString(),
        status: computeStatus(r, now),
      })),
    });
  } catch (err) {
    console.error("[invites]", err);
    return NextResponse.json({ error: "服务开小差了,请稍后重试" }, { status: 500 });
  }
}

/** 签发一张平台签名邀请码 */
export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdminUser();
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = createSchema.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 });
    }

    const env = getEnv();
    const secret = getInviteSecret(env.AUTH_JWT_SECRET, env.INVITE_SIGNING_SECRET);
    const row = await generateInvite(
      inviteRepo,
      secret,
      guard.user.id,
      {
        prefix: body.data.prefix,
        maxUses: body.data.maxUses,
        expiresDays: body.data.expiresDays,
        note: body.data.note,
      },
    );
    return NextResponse.json({
      ok: true,
      invite: {
        id: row.id,
        code: row.code,
        prefix: row.prefix,
        note: row.note,
        maxUses: row.maxUses,
        usedCount: row.usedCount,
        expiresAt: row.expiresAt.toISOString(),
        createdAt: row.createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("[invites/create]", err);
    return NextResponse.json({ error: "生成失败,请重试" }, { status: 500 });
  }
}
