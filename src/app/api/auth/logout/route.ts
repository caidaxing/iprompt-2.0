import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { REFRESH_COOKIE, ACCESS_COOKIE, cookieBase } from "@/lib/session";
import { prismaAuthRepo } from "@/server/repositories/auth-repo";
import { logout } from "@/server/services/auth-service";

export async function POST() {
  try {
    const store = await cookies();
    const refresh = store.get(REFRESH_COOKIE)?.value;
    if (refresh) await logout(prismaAuthRepo, refresh);

    const res = NextResponse.json({ ok: true });
    res.cookies.set(ACCESS_COOKIE, "", { ...cookieBase, maxAge: 0 });
    res.cookies.set(REFRESH_COOKIE, "", { ...cookieBase, maxAge: 0 });
    return res;
  } catch (err) {
    console.error("[logout]", err);
    return NextResponse.json({ error: "服务开小差了，请稍后重试" }, { status: 500 });
  }
}
