import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/server/lib/prisma";
import { SearchBox } from "@/components/SearchBox";
import { Pagination } from "@/components/Pagination";
import { CaseCard } from "@/components/CaseCard";
import { CaseImage } from "@/components/CaseImage";
import { CuratedRecommendations } from "@/components/CuratedRecommendations";
import { ExploreViewToggle } from "@/components/ExploreViewToggle";
import { FilterChipRow, type ChipItem } from "@/components/FilterChipRow";
import { listCases, modelCounts } from "@/server/services/case-service";
import { getCuratedCaseNumbers, groupCuratedCases } from "@/lib/curated-recommendations";
import { getSessionPayload } from "@/lib/session";
import { getModelConfigService } from "@/server/repositories/model-config-repo";
import { getTagService } from "@/server/repositories/tag-repo";
import { favoriteSetOf } from "@/server/services/favorite-service";

interface Props {
  searchParams: Promise<{ model?: string; view?: string; tags?: string; q?: string; page?: string }>;
}

// 注意：title 由根布局模板统一追加「 · iPrompt Studio」，此处不要重复写站点名
export const metadata = { title: "案例浏览" };

export default async function ExplorePage({ searchParams }: Props) {
  const sp = await searchParams;
  const modelSvc = getModelConfigService();
  const tagSvc = getTagService();
  const modelId = await modelSvc.resolveModelId(sp.model);
  const selectedTags = await tagSvc.resolveTagSlugs(sp.tags);
  const q = sp.q?.trim() || undefined;
  const page = Number(sp.page) > 0 ? Number(sp.page) : 1;

  const [activeModels, typeTags, modelCountMap] = await Promise.all([
    modelSvc.getActiveModels(),
    tagSvc.listTags("type", { minCount: 1 }),
    modelCounts(),
  ]);

  // URL 组装：未提及的维度保持现状
  const buildUrl = (over: {
    model?: string | null;
    tags?: string[] | null;
    q?: string | null;
    page?: number | null;
    view?: string | null;
  }) => {
    const p = new URLSearchParams();
    const model = "model" in over ? over.model : (sp.model ?? null);
    const tags = "tags" in over ? over.tags : (selectedTags.length ? selectedTags : null);
    const qv = "q" in over ? over.q : (q ?? null);
    const pg = over.page ?? null;
    const view = "view" in over ? over.view : null;
    if (view) p.set("view", view);
    if (model) p.set("model", model);
    if (tags && tags.length) p.set("tags", tags.join(","));
    if (qv) p.set("q", qv);
    if (pg && pg > 1) p.set("page", String(pg));
    const s = p.toString();
    return s ? `/explore?${s}` : "/explore";
  };

  // ── 改造推荐视图：48 条原创化精选独立成页 ──
  if (sp.view === "curated") {
    const curatedRows = await prisma.case.findMany({
      where: { num: { in: getCuratedCaseNumbers() }, modelId, image: { not: "" } },
      orderBy: { num: "asc" },
      select: { id: true, modelId: true, num: true, title: true, displayCategory: true, sourceRepo: true, image: true, description: true },
    });
    const curatedGroups = groupCuratedCases(curatedRows);

    return (
      <div>
        <div className="flex items-end justify-between gap-5 mb-10">
          <div>
            <p className="eyebrow text-[10px] mb-3">CURATED REGENERATION</p>
            <h1 className="serif-title text-3xl md:text-4xl">改造推荐</h1>
          </div>
          <ExploreViewToggle active="curated" model={sp.model} />
        </div>
        <CuratedRecommendations groups={curatedGroups} />
      </div>
    );
  }

  // ── 案例库视图（默认）：模型/类型标签筛选 + 搜索 + 焦点区 + 分页网格 ──
  const [result, session] = await Promise.all([
    listCases({ model: modelId, tags: selectedTags, q, page }),
    getSessionPayload(),
  ]);
  const favIds = session ? await favoriteSetOf(session.uid) : new Set<string>();

  const focus = result.items[0];
  const rest = result.items.slice(1);

  const modelChips: ChipItem[] = activeModels.map((m) => ({
    key: m.id,
    label: m.name,
    count: modelCountMap[m.id] ?? 0,
    active: m.id === modelId,
    href: buildUrl({ model: m.id, page: 1 }),
  }));
  const typeChips: ChipItem[] = typeTags.map((t) => {
    const active = selectedTags.includes(t.slug);
    const next = active ? selectedTags.filter((s) => s !== t.slug) : [...selectedTags, t.slug];
    return { key: t.slug, label: t.name, count: t.count, active, href: buildUrl({ tags: next, page: 1 }) };
  });

  return (
    <div>
      {/* 页头 + 视图切换 */}
      <div className="flex items-end justify-between gap-5 mb-8">
        <div>
          <p className="eyebrow text-[10px] mb-3">THE PROMPT ARCHIVE</p>
          <h1 className="serif-title text-3xl md:text-4xl">案例浏览</h1>
        </div>
        <ExploreViewToggle active="cases" model={sp.model} />
      </div>

      {/* 模型 / 类型 / 搜索 三行标签筛选 */}
      <div className="flex flex-col gap-3 mb-10">
        <div className="flex items-start gap-4">
          <span className="eyebrow text-[10px] pt-2 w-12 shrink-0">MODEL</span>
          <FilterChipRow items={modelChips} ariaLabel="模型筛选" />
        </div>
        <div className="flex items-start gap-4">
          <span className="eyebrow text-[10px] pt-2 w-12 shrink-0">TYPE</span>
          <FilterChipRow items={typeChips} ariaLabel="类型筛选" />
        </div>
        <div className="flex items-start gap-4">
          <span className="eyebrow text-[10px] pt-2 w-12 shrink-0">SEARCH</span>
          <Suspense fallback={<div className="h-9 w-72" />}>
            <SearchBox />
          </Suspense>
        </div>
      </div>

      {result.items.length === 0 ? (
        /* 空态（PRD F1） */
        <div className="text-center py-24">
          <p className="eyebrow text-xs mb-4">NOTHING FOUND</p>
          <p className="serif-title text-2xl mb-2">没有找到相关案例</p>
          <p className="text-sm text-ink-soft mb-6">换个关键词或减少筛选条件试试</p>
          <Link href="/explore" className="text-sm underline underline-offset-4 hover:text-ink-soft">
            返回全部案例
          </Link>
        </div>
      ) : (
        <>
          {/* 焦点区：左大图 + 右摘要（PRD F1） */}
          {focus && (
            <div className="grid md:grid-cols-5 gap-8 mb-14 items-stretch">
              <Link href={`/case/${focus.num}?model=${encodeURIComponent(focus.modelId)}`} className="md:col-span-3 block image-frame paper-panel p-2">
                <CaseImage
                  src={focus.image}
                  alt={focus.title}
                  num={focus.num}
                  className="w-full aspect-[3/2]"
                />
              </Link>
              <div className="md:col-span-2 flex flex-col justify-center py-2">
                <p className="eyebrow text-[10px] mb-4">SPOTLIGHT · 例 {focus.num}</p>
                <span className="inline-block self-start text-[11px] px-3 py-1 border border-line mb-5 text-ink-soft">
                  {focus.displayCategory}
                </span>
                <h2 className="serif-title text-2xl md:text-3xl leading-snug mb-3">
                  <Link href={`/case/${focus.num}?model=${encodeURIComponent(focus.modelId)}`} className="hover:underline underline-offset-4">
                    {focus.title}
                  </Link>
                </h2>
                <p className="text-sm text-ink-soft leading-relaxed line-clamp-2 mb-5">
                  {focus.description}
                </p>
                <div className="flex items-center gap-4">
                  <Link
                    href={`/case/${focus.num}?model=${encodeURIComponent(focus.modelId)}`}
                    className="text-sm underline underline-offset-4 hover:text-ink-soft"
                  >
                    查看提示词 →
                  </Link>
                  <span className="text-xs text-ink-mute">♥ {favIds.has(focus.id) ? "已收藏" : ""}</span>
                </div>
              </div>
            </div>
          )}

          {/* 案例网格：本页其余案例 */}
          <div className="section-rule mb-5">MORE CASES</div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-5 gap-y-9">
            {rest.map((c) => (
              <CaseCard key={c.id} c={c} />
            ))}
          </div>

          <Pagination page={result.page} totalPages={result.totalPages} model={sp.model} tags={selectedTags} q={q} />
          <p className="text-center text-xs text-ink-mute mt-4">
            共 {result.total} 个案例
          </p>
        </>
      )}
    </div>
  );
}
