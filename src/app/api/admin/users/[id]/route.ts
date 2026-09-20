import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/session";
import { prismaAuthRepo } from "@/server/repositories/auth-repo";
import { resetPassword, setUserStatus } from "@/server/services/admin-service";
import { AuthError } from "@/server/services/auth-service";

const patchSchema = z.object({ action: z.enum(["approve", "reject"]) });
const putSchema = z.object({ password: z.string().min(8, "密码至少 8 位").max(72, "密码过长") });

/** 审核：PATCH { action: "approve" | "reject" } */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireAdminUser();
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = patchSchema.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 });
    }
    const { id } = await params;
    await setUserStatus(prismaAuthRepo, id, body.data.action === "approve" ? "active" : "rejected");
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError && err.code === "USER_NOT_FOUND") {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    console.error("[admin/users/patch]", err);
    return NextResponse.json({ error: "服务开小差了，请稍后重试" }, { status: 500 });
  }
}

/** 重置密码：PUT { password }（同时吊销该用户全部会话） */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireAdminUser();
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = putSchema.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 });
    }
    const { id } = await params;
    await resetPassword(prismaAuthRepo, id, body.data.password);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError && err.code === "USER_NOT_FOUND") {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    console.error("[admin/users/put]", err);
    return NextResponse.json({ error: "服务开小差了，请稍后重试" }, { status: 500 });
  }
}
