// 标签仓储层：Prisma 实现 + 进程内服务单例（开发热重载复用）
import { prisma } from "@/server/lib/prisma";
import { createTagService, type TagProvider } from "@/server/services/tag-service";

export const prismaTagProvider: TagProvider = {
  async findTags(kind) {
    const rows = await prisma.tag.findMany({
      where: kind ? { kind } : undefined,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return rows.map((t) => ({ slug: t.slug, name: t.name, kind: t.kind, sortOrder: t.sortOrder }));
  },

  async countCasesByTag(kind) {
    const grouped = await prisma.caseTag.groupBy({
      by: ["tagId"],
      _count: { _all: true },
      where: kind ? { tag: { kind } } : undefined,
    });
    if (grouped.length === 0) return {};
    const tagRows = await prisma.tag.findMany({
      where: { id: { in: grouped.map((g) => g.tagId) } },
      select: { id: true, slug: true },
    });
    const slugById = new Map(tagRows.map((t) => [t.id, t.slug]));
    return Object.fromEntries(
      grouped.map((g) => [slugById.get(g.tagId) ?? "", g._count._all]).filter(([slug]) => slug !== ""),
    );
  },
};

const globalForTag = globalThis as unknown as { tagService?: ReturnType<typeof createTagService> };

/** 标签服务进程内单例（60s 缓存在服务内） */
export function getTagService() {
  if (!globalForTag.tagService) {
    globalForTag.tagService = createTagService(prismaTagProvider);
  }
  return globalForTag.tagService;
}
