import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CaseImage } from "@/components/CaseImage";
import { CopyButton } from "@/components/CopyButton";
import { FavoriteButton } from "@/components/FavoriteButton";
import { PrevNext } from "@/components/PrevNext";
import { getCase, getNeighbors } from "@/server/services/case-service";
import { getSessionPayload } from "@/lib/session";
import { favoriteSetOf } from "@/server/services/favorite-service";
import { absoluteUrl, siteName } from "@/lib/site";

interface Props {
  params: Promise<{ num: string }>;
  searchParams: Promise<{ model?: string }>;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { num } = await params;
  const { model } = await searchParams;
  const c = await getCase(Number(num), model);
  if (!c) return { title: "案例不存在", robots: { index: false, follow: false } };

  const url = absoluteUrl(`/case/${c.num}?model=${encodeURIComponent(c.modelId)}`);
  const modelName = c.model?.name ?? "AI";
  const typeTags = (c.caseTags ?? []).filter((t) => t.tag.kind === "type").map((t) => t.tag);
  const tagNames = typeTags.map((t) => t.name);
  // description 模板植入搜索意图关键词（提示词 / 出图案例 / 可复制），同时保留案例自述
  const description = c.description
    ? `${c.description} — ${modelName} 出图案例，附完整可复制的中文提示词。`
    : `${c.title}：${modelName} 可复用的 AI 图像提示词案例，查看出图效果并一键复制提示词。`;
  return {
    title: c.title,
    description,
    keywords: [c.title, `${modelName} 提示词`, ...tagNames, c.displayCategory].filter(Boolean),
    alternates: { canonical: url },
    openGraph: {
      type: "article", url, title: `${c.title} · ${siteName}`, description,
      images: [{ url: absoluteUrl(c.image), alt: c.title }],
    },
    twitter: { card: "summary_large_image", title: c.title, description, images: [absoluteUrl(c.image)] },
  };
}

export default async function CaseDetailPage({ params, searchParams }: Props) {
  const { num: numStr } = await params;
  const { model } = await searchParams;
  const num = Number(numStr);
  if (!Number.isInteger(num) || num <= 0) notFound();

  const c = await getCase(num, model);
  if (!c) notFound();

  const caseUrl = absoluteUrl(`/case/${c.num}?model=${encodeURIComponent(c.modelId)}`);
  const typeTags = (c.caseTags ?? []).filter((t) => t.tag.kind === "type").map((t) => t.tag);
  const primaryTypeHref = typeTags.length ? `/explore?tags=${typeTags[0].slug}` : "/explore";

  const caseJsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: c.title,
    description: c.description,
    url: caseUrl,
    image: {
      "@type": "ImageObject",
      url: absoluteUrl(c.image),
      caption: c.title,
    },
    inLanguage: "zh-CN",
    isPartOf: { "@id": absoluteUrl("/#website") },
    about: [c.displayCategory, c.model?.name].filter(Boolean),
    keywords: typeTags.map((t) => t.name).join(", "),
    identifier: `${c.modelId}-${c.num}`,
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: "案例浏览", item: absoluteUrl("/explore") },
      { "@type": "ListItem", position: 3, name: c.displayCategory, item: absoluteUrl(primaryTypeHref ?? "/explore") },
      { "@type": "ListItem", position: 4, name: c.title, item: caseUrl },
    ],
  };

  const [{ prev, next }, session] = await Promise.all([getNeighbors(num, model), getSessionPayload()]);
  const favIds = session ? await favoriteSetOf(session.uid) : new Set<string>();
  // typeTags / primaryTypeHref 已在 JSON-LD 构建前计算

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(caseJsonLd).replace(/</g, "\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\u003c") }} />
      {/* 面包屑（PRD F2） */}
      <nav className="eyebrow text-[10px] mb-8">
        <Link href="/explore" className="hover:text-ink transition-colors">
          案例浏览
        </Link>
        <span className="mx-2">/</span>
        <Link href={primaryTypeHref} className="hover:text-ink transition-colors">
          {c.displayCategory}
        </Link>
      </nav>

      <div className="grid md:grid-cols-[1.04fr_.96fr] gap-10 lg:gap-16">
        {/* 左大图 */}
        <div className="paper-panel p-2 self-start">
          <CaseImage src={c.image} alt={c.title} num={c.num} className="w-full" />
        </div>

        {/* 右信息 */}
        <div className="py-2">
          <p className="eyebrow text-[10px] mb-4">CASE No.{String(c.num).padStart(3, "0")} · {c.displayCategory}</p>
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="serif-title text-2xl md:text-3xl leading-snug">{c.title}</h1>
            <FavoriteButton caseId={c.id} initialFavorited={favIds.has(c.id)} loggedIn={!!session} />
          </div>
          <p className="text-sm text-ink-soft leading-[1.9] mb-7 max-w-lg">{c.description}</p>

          <div className="text-xs text-ink-mute space-y-1 mb-5">
            <p>
              分类 <span className="text-ink-soft">{c.category}</span>
            </p>
            {c.source && (
              <p>
                来源 <span className="text-ink-soft">{c.source}</span>
              </p>
            )}
            {c.sourceRepo && (
              <p>
                语料库 <span className="text-ink-soft">{c.sourceRepo}</span>
              </p>
            )}
          </div>

          {/* 模型 + 类型标签 */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            {c.model?.name && (
              <span className="text-[11px] px-2.5 py-1 bg-ink text-paper rounded-sm">{c.model.name}</span>
            )}
            {typeTags.map((t) => (
              <Link
                key={t.slug}
                href={`/explore?tags=${t.slug}`}
                className="text-[11px] px-2.5 py-1 border border-line rounded-sm text-ink-soft hover:border-ink hover:text-ink transition-colors"
              >
                {t.name}
              </Link>
            ))}
          </div>

          {/* 中文提示词全文 + 复制（PRD F2） */}
          <section className="paper-panel p-5 md:p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm text-ink-soft">提示词全文</h2>
              <CopyButton text={c.prompt} />
            </div>
            <pre className="whitespace-pre-wrap break-words text-[13px] leading-relaxed max-h-96 overflow-y-auto">
              {c.prompt}
            </pre>
          </section>

          {c.image && (
            <a
              href={c.image}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline underline-offset-4 hover:text-ink-soft"
            >
              查看原图 →
            </a>
          )}
        </div>
      </div>

      {/* 上一篇 / 下一篇 */}
      <PrevNext prev={prev} next={next} modelId={c.modelId} />
    </article>
  );
}
