// 案例仓储与查询服务（多模型：查询均限定 modelId；数据量级下单表查询即可）
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/lib/prisma";
import { getModelConfigService } from "@/server/repositories/model-config-repo";

export const PAGE_SIZE = 18;

const VISIBLE_PROMPT_WHERE: Prisma.CaseWhereInput = {
  NOT: {
    OR: [
      { prompt: { contains: "**作者**:" } },
      { prompt: { contains: "**来源**:" } },
    ],
  },
};

export interface CaseSummary {
  id: string;
  modelId: string;
  num: number;
  title: string;
  displayCategory: string;
  sourceRepo: string | null;
  image: string;
  description: string;
}

export interface CaseFull extends CaseSummary {
  category: string;
  source: string;
  prompt: string;
  model?: { name: string };
  caseTags?: { tag: { slug: string; name: string; kind: string } }[];
}

export interface ListResult {
  items: CaseSummary[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ListQuery {
  model?: string | undefined; // 模型 id；缺省时解析为默认模型
  tags?: string[] | undefined; // 类型标签 slug 多选，AND 语义
  q?: string | undefined;
  page?: number | undefined;
}

const SUMMARY_SELECT = {
  id: true,
  modelId: true,
  num: true,
  title: true,
  displayCategory: true,
  sourceRepo: true,
  image: true,
  description: true,
} as const;

export async function listCases(query: ListQuery): Promise<ListResult> {
  const modelId = await getModelConfigService().resolveModelId(query.model);
  const page = Math.max(1, query.page ?? 1);
  const tagSlugs = (query.tags ?? []).filter(Boolean);

  // 标签筛选语义：同 kind 内 OR（如"人像摄影 或 室内设计"），跨 kind 间 AND（如"人像摄影 且 电影感"）
  let tagFilter: { AND: { caseTags: { some: { tag: { kind: string; slug: { in: string[] } } } } }[] } | undefined;
  if (tagSlugs.length) {
    const tagRows = await prisma.tag.findMany({
      where: { slug: { in: tagSlugs } },
      select: { slug: true, kind: true },
    });
    const slugsByKind = new Map<string, string[]>();
    for (const t of tagRows) slugsByKind.set(t.kind, [...(slugsByKind.get(t.kind) ?? []), t.slug]);
    tagFilter = {
      AND: [...slugsByKind.entries()].map(([kind, slugs]) => ({
        caseTags: { some: { tag: { kind, slug: { in: slugs } } } },
      })),
    };
  }

  const where = {
    modelId,
    image: { not: "" },
    ...VISIBLE_PROMPT_WHERE,
    ...(tagFilter ? { AND: tagFilter.AND } : {}),
    ...(query.q
      ? {
          OR: [
            { title: { contains: query.q } },
            { prompt: { contains: query.q } },
            { description: { contains: query.q } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.case.count({ where }),
    prisma.case.findMany({
      where,
      orderBy: { num: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: SUMMARY_SELECT,
    }),
  ]);

  return {
    items: rows,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getCase(num: number, model?: string): Promise<CaseFull | null> {
  const modelId = await getModelConfigService().resolveModelId(model);
  return prisma.case.findFirst({
    where: { modelId, num, ...VISIBLE_PROMPT_WHERE },
    include: {
      model: { select: { name: true } },
      caseTags: { include: { tag: { select: { slug: true, name: true, kind: true } } } },
    },
  });
}

/** 同展示分类内的上一篇 / 下一篇（num 升序） */
export async function getNeighbors(
  num: number,
  model?: string,
): Promise<{ prev: number | null; next: number | null }> {
  const modelId = await getModelConfigService().resolveModelId(model);
  const current = await prisma.case.findFirst({
    where: { modelId, num, ...VISIBLE_PROMPT_WHERE },
    select: { displayCategory: true },
  });
  if (!current) return { prev: null, next: null };
  const [prev, next] = await Promise.all([
    prisma.case.findFirst({
      where: { modelId, displayCategory: current.displayCategory, num: { lt: num }, ...VISIBLE_PROMPT_WHERE },
      orderBy: { num: "desc" },
      select: { num: true },
    }),
    prisma.case.findFirst({
      where: { modelId, displayCategory: current.displayCategory, num: { gt: num }, ...VISIBLE_PROMPT_WHERE },
      orderBy: { num: "asc" },
      select: { num: true },
    }),
  ]);
  return { prev: prev?.num ?? null, next: next?.num ?? null };
}

/** 各模型的案例数（模型 chips 计数用） */
export async function modelCounts(): Promise<Record<string, number>> {
  const grouped = await prisma.case.groupBy({
    by: ["modelId"],
    where: { image: { not: "" }, model: { active: true }, ...VISIBLE_PROMPT_WHERE },
    _count: { _all: true },
  });
  return Object.fromEntries(grouped.map((g) => [g.modelId, g._count._all]));
}

/** 某模型各展示分类的案例数 */
export async function categoryCounts(model?: string): Promise<Record<string, number>> {
  const modelId = await getModelConfigService().resolveModelId(model);
  const grouped = await prisma.case.groupBy({
    by: ["displayCategory"],
    where: { modelId, image: { not: "" }, ...VISIBLE_PROMPT_WHERE },
    _count: { _all: true },
  });
  return Object.fromEntries(grouped.map((g) => [g.displayCategory, g._count._all]));
}
