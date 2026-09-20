import { NextResponse } from "next/server";

// 健康检查：探活用，不暴露内部细节
export function GET() {
  return NextResponse.json({
    ok: true,
    service: "iprompt-studio",
    version: "0.1.0",
    time: new Date().toISOString(),
  });
}
