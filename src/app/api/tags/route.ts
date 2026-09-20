import { NextResponse } from "next/server";
import { getTagService } from "@/server/repositories/tag-repo";

/** 标签列表（附案例计数）：?kind=type|style|… 缺省返回全部 */
export async function GET(req: Request) {
  try {
    const kind = new URL(req.url).searchParams.get("kind") ?? undefined;
    const tags = await getTagService().listTags(kind ?? undefined);
    return NextResponse.json({ tags });
  } catch (err) {
    console.error("[tags GET]", err);
    return NextResponse.json({ error: "服务开小差了，请稍后重试" }, { status: 500 });
  }
}
