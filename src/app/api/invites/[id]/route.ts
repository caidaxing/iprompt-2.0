import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/session";
import { inviteRepo } from "@/server/repositories/invite-repo";
import { setInviteStatus } from "@/server/services/invite-service";
import { AuthError } from "@/server/services/auth-service";

const schema = z.object({ action: z.enum(["enable", "disable"]) });

/** 启用/禁用邀请码:PATCH { action } */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireAdminUser();
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = schema.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 });
    }
    const { id } = await params;
    await setInviteStatus(inviteRepo, id, body.data.action);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError && err.code === "INVITE_NOT_FOUND") {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    console.error("[invites/patch]", err);
    return NextResponse.json({ error: "服务开小差了,请稍后重试" }, { status: 500 });
  }
}
