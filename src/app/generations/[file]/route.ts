import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// 生成产物在运行时才落盘,public 静态清单不包含它们;由本路由动态读盘提供
const MIME: Record<string, string> = {
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  // 仅允许工作台产出的安全文件名(防目录穿越)
  if (!/^[a-z0-9]+\.(svg|png|jpe?g|webp)$/i.test(file)) {
    return new NextResponse("Not found", { status: 404 });
  }
  try {
    const buf = await readFile(join(process.cwd(), "public", "generations", file));
    const ext = file.split(".").pop()!.toLowerCase();
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
