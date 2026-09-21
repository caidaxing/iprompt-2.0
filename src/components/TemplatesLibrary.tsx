"use client";

// 模板库:22 张工业级模板卡片(封面+编号+标签)+ 详情浮层(适用场景/核心指引/避坑/一键复制)
// 卡片数据逆向整理自上游 awesome-gpt-image-2(MIT)style-library.json,交互对其官网 /#templates
import { useEffect, useState } from "react";
import Link from "next/link";
import { templateCards, formatCardPrompt, type TemplateCard } from "@/data/templates";
import { templateCategories, type PromptTemplate } from "@/data/templates";

const COPY_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
const CHECK_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
const CLOSE_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

function CopyButton({ text, label = "复制", className = "" }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          /* 用户可手动选中复制 */
        }
      }}
      className={`inline-flex items-center gap-1.5 transition-colors ${className}`}
    >
      {copied ? CHECK_ICON : COPY_ICON}
      {copied ? "已复制" : label}
    </button>
  );
}

function TemplateBlock({ tpl }: { tpl: PromptTemplate }) {
  return (
    <div className="border border-line rounded-sm overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-ink/5 border-b border-line">
        <span className="text-xs font-medium">
          {tpl.label}
          {tpl.lang === "json" && <span className="ml-2 text-[10px] text-ink-mute">JSON</span>}
        </span>
        <CopyButton text={tpl.code} className="text-ink-mute hover:text-ink" />
      </div>
      <pre className="p-3 text-xs leading-5 whitespace-pre-wrap max-h-80 overflow-y-auto bg-white/40">{tpl.code}</pre>
    </div>
  );
}

function TagChip({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] px-2 py-0.5 rounded-sm border border-line text-ink-soft">{children}</span>;
}

export function TemplatesLibrary() {
  const [active, setActive] = useState(templateCategories[0]?.anchor ?? "");
  const [detail, setDetail] = useState<TemplateCard | null>(null);

  // 滚动时高亮当前分类(仅作用于下方详表锚点)
  useEffect(() => {
    const onScroll = () => {
      let current = templateCategories[0]?.anchor ?? "";
      for (const c of templateCategories) {
        const el = document.getElementById(c.anchor);
        if (el && el.getBoundingClientRect().top < 120) current = c.anchor;
      }
      setActive(current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!detail) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDetail(null);
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [detail]);

  return (
    <div className="site-shell py-10">
      <p className="eyebrow text-[10px] mb-2">TEMPLATES</p>
      <h1 className="serif-title text-2xl mb-2">工业级提示词模板库</h1>
      <p className="text-sm text-ink-soft mb-8">
        {templateCards.length} 套成熟模板,每套都提炼自真实出图案例,含结构、约束与避坑,开箱即用。
      </p>

      {/* 卡片画廊 */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {templateCards.map((card) => (
          <button
            key={card.id}
            onClick={() => setDetail(card)}
            className="text-left border border-line rounded-sm overflow-hidden transition-all hover:border-ink hover:-translate-y-0.5 hover:shadow-md group"
          >
            <div className="relative aspect-[4/3] bg-ink/5 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={card.cover}
                alt={card.titleZh}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
              />
            </div>
            <div className="p-4">
              <p className="text-[10px] tracking-wide text-ink-mute mb-1.5">
                提示词模板 · {card.categoryZh}
              </p>
              <h2 className="serif-title text-base mb-1.5">{card.titleZh}</h2>
              <p className="text-xs text-ink-soft leading-5 mb-3">{card.descZh}</p>
              <div className="flex flex-wrap gap-1.5">
                {[...card.styles, ...card.scenes].slice(0, 4).map((t) => (
                  <TagChip key={t}>{t}</TagChip>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* 详情浮层 */}
      {detail && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 md:p-8"
          onClick={() => setDetail(null)}
        >
          <div
            className="bg-paper max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid md:grid-cols-2">
              <div className="bg-ink/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={detail.cover} alt={detail.titleZh} className="w-full h-full object-cover" />
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[10px] px-2 py-0.5 bg-ink text-paper rounded-sm">提示词模板</span>
                    <span className="text-[10px] px-2 py-0.5 border border-line rounded-sm text-ink-soft">
                      {detail.categoryZh}
                    </span>
                  </div>
                  <button onClick={() => setDetail(null)} className="text-ink-mute hover:text-ink" aria-label="关闭">
                    {CLOSE_ICON}
                  </button>
                </div>
                <h2 className="serif-title text-2xl mb-2">{detail.titleZh}</h2>
                <p className="text-xs text-ink-soft leading-5 mb-3">{detail.descZh}</p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {[...detail.styles, ...detail.scenes, ...detail.tags].map((t) => (
                    <TagChip key={t}>{t}</TagChip>
                  ))}
                </div>

                <div className="border border-line rounded-sm p-3 mb-4">
                  <h3 className="text-xs font-medium mb-1">适用场景</h3>
                  <p className="text-xs text-ink-soft leading-5">{detail.useWhenZh}</p>
                </div>

                <div className="space-y-2 mb-4 text-xs">
                  <h3 className="text-xs font-medium">核心指引</h3>
                  <ul className="text-ink-soft space-y-1 leading-5 list-disc pl-4">
                    {detail.guidanceZh.map((g, i) => (
                      <li key={i}>{g}</li>
                    ))}
                  </ul>
                  <h3 className="text-xs font-medium pt-1">需要避免</h3>
                  <ul className="text-ink-soft space-y-1 leading-5 list-disc pl-4">
                    {detail.pitfallsZh.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap gap-2">
                  <CopyButton
                    text={formatCardPrompt(detail)}
                    label="复制模板 Prompt"
                    className="bg-ink text-paper text-xs px-4 py-2 rounded-sm hover:opacity-85"
                  />
                  {detail.exampleCases.length > 0 && (
                    <Link
                      href={`/case/${detail.exampleCases[0]}`}
                      className="inline-flex items-center gap-1.5 text-xs px-4 py-2 border border-line rounded-sm hover:border-ink transition-colors"
                    >
                      看站内同类案例
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 完整填空模板详表(按分类) */}
      <div className="mt-16 pt-10 border-t border-line">
        <p className="eyebrow text-[10px] mb-2">FULL LIBRARY</p>
        <h2 className="serif-title text-xl mb-2">完整填空模板与防坑指南</h2>
        <p className="text-xs text-ink-mute mb-6">按分类展开的原始填空模板与 JSON 进阶模板,逐块可复制。</p>

        <div className="grid lg:grid-cols-[200px_1fr] gap-8 items-start">
          <nav className="hidden lg:block sticky top-24 text-xs space-y-1" aria-label="模板分类">
            {templateCategories.map((c) => (
              <a
                key={c.anchor}
                href={`#${c.anchor}`}
                className={`block px-3 py-1.5 rounded-sm transition-colors ${
                  active === c.anchor ? "bg-ink text-paper" : "text-ink-soft hover:text-ink hover:bg-ink/5"
                }`}
              >
                {c.title}
              </a>
            ))}
          </nav>

          <div className="space-y-10 min-w-0">
            {templateCategories.map((c) => (
              <section key={c.anchor} id={c.anchor} className="scroll-mt-24">
                <h3 className="serif-title text-lg mb-4">{c.title}</h3>
                <div className="space-y-4">
                  {c.templates.map((t) => (
                    <TemplateBlock key={t.label + t.code.slice(0, 20)} tpl={t} />
                  ))}
                </div>
                {c.tips.length > 0 && (
                  <div className="mt-4 border border-line rounded-sm p-4">
                    <h4 className="text-xs font-medium mb-2">⚠️ 防坑指南</h4>
                    <ul className="text-xs text-ink-soft space-y-1.5 leading-5 list-disc pl-4">
                      {c.tips.map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
