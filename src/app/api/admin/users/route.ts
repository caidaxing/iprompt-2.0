import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/session";
import { prismaAuthRepo } from "@/server/repositories/auth-repo";
import { listUsers } from "@/server/services/admin-service";
import type { UserStatus } from "@/server/services/auth-service";

const STATUSES = ["pending", "active", "rejected"];

/** 用户列表；?status= 按状态筛选。响应不含密码哈希 */
export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdminUser();
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const statusParam = req.nextUrl.searchParams.get("status");
    const status = statusParam && STATUSES.includes(statusParam) ? (statusParam as UserStatus) : undefined;
    const users = await listUsers(prismaAuthRepo, status);
    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        nickname: u.nickname,
        status: u.status,
        role: u.role,
        createdAt: u.createdAt,
      })),
    });
  } catch (err) {
    console.error("[admin/users]", err);
    return NextResponse.json({ error: "服务开小差了，请稍后重试" }, { status: 500 });
  }
}
