// 收藏服务（多模型：以 Case.id 为锚点，跨模型不歧义）
import { prisma } from "@/server/lib/prisma";
import type { CaseSummary } from "@/server/services/case-service";

/** 切换收藏：已收藏 → 取消；未收藏 → 添加。返回切换后的状态 */
export async function toggleFavorite(userId: string, caseId: string): Promise<{ favorited: boolean }> {
  const existing = await prisma.favorite.findUnique({
    where: { userId_caseId: { userId, caseId } },
  });
  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return { favorited: false };
  }
  const exists = await prisma.case.findUnique({ where: { id: caseId }, select: { id: true } });
  if (!exists) throw new Error("案例不存在");
  await prisma.favorite.create({ data: { userId, caseId } });
  return { favorited: true };
}

/** 收藏列表（按收藏时间倒序），带案例信息 */
export async function listFavorites(userId: string): Promise<{ favoritedAt: Date; case: CaseSummary }[]> {
  const rows = await prisma.favorite.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      caseRef: {
        select: { id: true, modelId: true, num: true, title: true, displayCategory: true, sourceRepo: true, image: true, description: true },
      },
    },
  });
  return rows
    .filter((r): r is typeof r & { caseRef: NonNullable<typeof r.caseRef> } => !!r.caseRef)
    .map((r) => ({ favoritedAt: r.createdAt, case: r.caseRef }));
}

/** 已收藏的 Case.id 集合 */
export async function favoriteSetOf(userId: string): Promise<Set<string>> {
  const rows = await prisma.favorite.findMany({ where: { userId }, select: { caseId: true } });
  return new Set(rows.map((r) => r.caseId));
}

export async function favoriteCount(userId: string): Promise<number> {
  return prisma.favorite.count({ where: { userId } });
}
