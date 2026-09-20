"use client";

// 模板库:13 分类工业级提示词模板,文本填空 + JSON 进阶 + 防坑指南
// 内容整理自上游 awesome-gpt-image-2(MIT),复制按钮逐块可用
import { useEffect, useState } from "react";
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

function TemplateBlock({ tpl }: { tpl: PromptTemplate }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(tpl.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* 忽略:用户可手动选中复制 */
    }
  };
  return (
    <div className="border border-line rounded-sm overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-ink/5 border-b border-line">
        <span className="text-xs font-medium">
          {tpl.label}
          {tpl.lang === "json" && <span className="ml-2 text-[10px] text-ink-mute">JSON</span>}
        </span>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-xs text-ink-mute hover:text-ink transition-colors"
          aria-label={`复制${tpl.label}`}
        >
          {copied ? CHECK_ICON : COPY_ICON}
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      <pre className="p-3 text-xs leading-5 whitespace-pre-wrap max-h-80 overflow-y-auto bg-white/40">{tpl.code}</pre>
    </div>
  );
}

export function TemplatesLibrary() {
  const [active, setActive] = useState(templateCategories[0]?.anchor ?? "");

  // 滚动时高亮当前分类(简化版:按锚点位置计算)
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

  return (
    <div className="site-shell py-10">
      <p className="eyebrow text-[10px] mb-2">TEMPLATES</p>
      <h1 className="serif-title text-2xl mb-2">工业级提示词模板库</h1>
      <p className="text-sm text-ink-soft mb-8">
        {templateCategories.length} 个分类 · {templateCategories.reduce((n, c) => n + c.templates.length, 0)} 套模板 ·
        开箱即用的 [占位符] 填空与 Agent JSON,附防坑指南。
      </p>

      <div className="grid lg:grid-cols-[200px_1fr] gap-8 items-start">
        {/* 左:分类锚点 */}
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

        {/* 右:分类内容 */}
        <div className="space-y-10 min-w-0">
          {templateCategories.map((c) => (
            <section key={c.anchor} id={c.anchor} className="scroll-mt-24">
              <h2 className="serif-title text-xl mb-4">{c.title}</h2>
              <div className="space-y-4">
                {c.templates.map((t) => (
                  <TemplateBlock key={t.label + t.code.slice(0, 20)} tpl={t} />
                ))}
              </div>
              {c.tips.length > 0 && (
                <div className="mt-4 border border-line rounded-sm p-4">
                  <h3 className="text-xs font-medium mb-2">⚠️ 防坑指南</h3>
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
  );
}
