"use client";

// 2.5 对比工作台:同一提示词下 GPT-Image 2 原图与 2.5 结果的双视图对比
// 参照上游 awesome-gpt-image-2 的 gpt-image-2-5 专区:并排/滑动切换、共享 Prompt、待实测状态治理
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { comparisonCases } from "@/data/comparisons";

const COPY_ICON = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
const CHECK_ICON = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
const GRIP_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m9 7-5 5 5 5" /><path d="m15 7 5 5-5 5" />
  </svg>
);
const CLOSE_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);
const EXPAND_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
  </svg>
);

type ViewMode = "side" | "slider";

const STATUS_BADGE: Record<string, { text: string; cls: string }> = {
  demo: { text: "界面示意", cls: "border-line text-ink-mute" },
  pending: { text: "待实测", cls: "border-line text-ink-soft" },
  tested: { text: "已实测", cls: "border-moss text-moss" },
};

export function CompareWorkspace() {
  // 深链:?case=gallery-532 形式;非法值回落第一组
  const [caseId, setCaseId] = useState(() => {
    if (typeof window !== "undefined") {
      const q = new URLSearchParams(window.location.search).get("case");
      if (q && comparisonCases.some((c) => c.id === q)) return q;
    }
    return comparisonCases[0].id;
  });
  const index = Math.max(0, comparisonCases.findIndex((c) => c.id === caseId));
  const item = comparisonCases[index];

  const [view, setView] = useState<ViewMode>(item.status === "tested" ? "side" : "slider");
  const [position, setPosition] = useState(50);
  const [copyState, setCopyState] = useState<"" | "copied" | "failed">("");
  const [enlarged, setEnlarged] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 深链同步:切换案例/初始进入时写 URL,便于分享
  useEffect(() => {
    const url = new URL(window.location.href);
    if (index > 0) url.searchParams.set("case", item.id);
    else url.searchParams.delete("case");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [index, item.id]);

  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  const selectCase = (nextId: string) => {
    const next = comparisonCases.find((c) => c.id === nextId);
    if (!next) return;
    setCaseId(next.id);
    setView(next.status === "tested" ? "side" : "slider");
    setPosition(50);
    setCopyState("");
  };

  const copyPrompt = async () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
    try {
      await navigator.clipboard.writeText(item.prompt);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    copyTimer.current = setTimeout(() => setCopyState(""), 2500);
  };

  const figure = (side: "before" | "after") => {
    const label = side === "before" ? "图库原图" : item.status === "demo" ? "示意图" : "AI 复现 · 待实测";
    return (
      <figure className="relative min-w-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.image}
          alt={item.title}
          draggable={false}
          className="w-full h-full object-cover"
        />
        <figcaption className="absolute left-2 bottom-2 bg-paper/90 text-[11px] px-2 py-0.5 rounded-sm border border-line">
          {label}
        </figcaption>
      </figure>
    );
  };

  return (
    <div className="site-shell py-10">
      <p className="eyebrow text-[10px] mb-2">COMPARE ZONE</p>
      <h1 className="serif-title text-2xl mb-2">模型比对</h1>
      <p className="text-sm text-ink-soft mb-8">同一提示词,从细节看变化。</p>

      <div className="grid lg:grid-cols-[3fr_2fr] gap-8 items-start">
        {/* 左:对比画布 */}
        <div>
          {/* 状态提示条 */}
          <div className="flex items-center justify-between border border-line rounded-sm px-3 py-2 mb-3 text-xs text-ink-soft">
            <span>
              {item.status === "demo"
                ? "界面示意 · 两侧共用同一图片,仅用于体验对比交互"
                : "原图已就位 · 2.5 复现图待实测后替换右侧,下方 Prompt 为图库完整原文"}
            </span>
            <button
              onClick={() => setEnlarged(true)}
              className="text-ink-mute hover:text-ink transition-colors"
              aria-label="放大查看"
              title="放大查看"
            >
              {EXPAND_ICON}
            </button>
          </div>

          {/* 画布 */}
          <div className="border border-line rounded-sm overflow-hidden">
            {view === "side" ? (
              <div className="grid grid-cols-2 gap-px bg-line">{figure("before")}{figure("after")}</div>
            ) : (
              <div className="relative aspect-[4/3] bg-ink/5">
                <div className="absolute inset-0">
                  <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
                    {figure("before")}
                  </div>
                  <div className="absolute inset-0">{figure("after")}</div>
                </div>
                {/* 分界线 */}
                <div
                  className="absolute top-0 bottom-0 w-px bg-paper pointer-events-none"
                  style={{ left: `${position}%` }}
                  aria-hidden="true"
                >
                  <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-paper text-ink border border-line flex items-center justify-center shadow">
                    {GRIP_ICON}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={position}
                  onChange={(e) => setPosition(Number(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
                  aria-label="调整对比图片分界位置"
                />
              </div>
            )}

            {/* 视图切换 */}
            <div className="flex items-center gap-4 px-3 py-2 border-t border-line text-xs">
              <div className="flex border border-line rounded-sm overflow-hidden">
                {(["side", "slider"] as ViewMode[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    aria-pressed={view === v}
                    className={`px-3 py-1 transition-colors ${view === v ? "bg-ink text-paper" : "hover:bg-ink/5"}`}
                  >
                    {v === "side" ? "并排" : "滑动"}
                  </button>
                ))}
              </div>
              <span className="text-ink-mute">
                {item.status === "tested" ? "构图接近,建议滑动对照" : "左右拖动可调整分界位置"}
              </span>
            </div>
          </div>

          {/* 上下文说明 */}
          <div className="mt-4 text-xs text-ink-soft space-y-1">
            <p>观察重点:{item.focus}</p>
            <p>
              图片来源:{item.source}
              {item.caseNum !== null && (
                <>
                  {" · "}
                  <Link href={`/case/${item.caseNum}`} className="underline hover:text-ink">
                    查看图库详情
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>

        {/* 右:Prompt 与实测治理 */}
        <div className="space-y-4">
          <div className="border border-line rounded-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-medium">共享 Prompt</h2>
              <span className="text-[10px] text-ink-mute">{item.prompt.length} 字符</span>
            </div>
            <textarea
              readOnly
              value={item.prompt}
              spellCheck={false}
              className="w-full h-56 resize-none bg-transparent border border-line rounded-sm p-3 text-xs leading-5 text-ink-soft focus:outline-none focus:border-ink"
              aria-label="本组完整提示词"
            />
            <button
              onClick={copyPrompt}
              className="mt-3 w-full flex items-center justify-center gap-2 bg-ink text-paper text-sm py-2.5 rounded-sm hover:opacity-85 transition-opacity"
            >
              {copyState === "copied" ? CHECK_ICON : COPY_ICON}
              {copyState === "copied" ? "已复制" : "复制 Prompt"}
            </button>
            {copyState === "failed" && (
              <p className="text-xs text-red-700 mt-2">复制失败,请选中上方文字手动复制。</p>
            )}
          </div>

          {/* 实测状态面板 */}
          {item.status === "tested" && item.result ? (
            <div className="border border-line rounded-sm p-4 text-sm space-y-2">
              <h2 className="text-sm font-medium">本次生成记录</h2>
              <p className="flex items-center gap-2 text-moss text-xs">{CHECK_ICON}已完成 · 单次生成</p>
              <p className="text-xs text-ink-soft leading-5">{item.result.summary}</p>
              <p className="text-[11px] text-ink-mute">{item.result.modelNote}</p>
            </div>
          ) : (
            <div className="border border-line rounded-sm p-4 text-sm space-y-3">
              <h2 className="text-sm font-medium">实测计划</h2>
              <dl className="text-xs space-y-2">
                <div className="flex justify-between gap-4"><dt className="text-ink-mute">对比状态</dt><dd>{STATUS_BADGE[item.status].text}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-ink-mute">计划对比</dt><dd className="text-right">同一提示词 × 不同模型</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-ink-mute">尺寸/质量/成本</dt><dd className="text-ink-mute">实测完成后公开</dd></div>
              </dl>
              <p className="text-[11px] text-ink-mute leading-5">
                实测将使用完全相同的 Prompt,分别记录模型、尺寸、质量设置与多次生成结果后在此公开。
              </p>
              <Link
                href="/studio"
                className="block text-center text-xs border border-ink rounded-sm py-2 hover:bg-ink hover:text-paper transition-colors"
              >
                等不及?去工作台自己生成(1 积分/张)
              </Link>
            </div>
          )}

          {/* 案例切换 */}
          <div className="flex gap-2">
            <select
              value={item.id}
              onChange={(e) => selectCase(e.target.value)}
              className="flex-1 bg-transparent border border-line rounded-sm px-3 py-2.5 text-xs focus:outline-none focus:border-ink"
              aria-label="选择对比案例"
            >
              {comparisonCases.map((c, i) => (
                <option key={c.id} value={c.id}>
                  {String(i + 1).padStart(2, "0")} / {String(comparisonCases.length).padStart(2, "0")} · {c.title}
                  {c.status === "demo" ? " · 示意" : c.status === "pending" ? " · 待实测" : ""}
                </option>
              ))}
            </select>
            <button
              onClick={() => selectCase(comparisonCases[(index + 1) % comparisonCases.length].id)}
              className="text-xs px-4 border border-ink rounded-sm hover:bg-ink hover:text-paper transition-colors"
            >
              下一组
            </button>
          </div>
        </div>
      </div>

      {/* 大图弹窗 */}
      {enlarged && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6"
          onClick={() => setEnlarged(false)}
        >
          <div className="bg-paper max-w-5xl w-full rounded-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-line">
              <h2 className="serif-title text-base">{item.title}</h2>
              <button onClick={() => setEnlarged(false)} className="text-ink-mute hover:text-ink" aria-label="关闭">
                {CLOSE_ICON}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-px bg-line">
              {figure("before")}
              {figure("after")}
            </div>
          </div>
        </div>
      )}

      {/* 敬请期待蒙层:只盖内容区(z-30 低于头部 z-40),头部导航保持清晰可点 */}
      <div className="fixed inset-x-0 top-[4.5rem] bottom-0 z-30 bg-paper/70 backdrop-blur-sm flex items-center justify-center">
        <div className="text-center px-6">
          <p className="eyebrow text-[10px] mb-4">COMING SOON</p>
          <h1 className="serif-title text-3xl mb-4">敬请期待</h1>
          <p className="text-sm text-ink-soft leading-6 mb-8 max-w-xs mx-auto">
            多模型实测对比正在准备中,完成后此处开放。
          </p>
          <Link href="/" className="editorial-button editorial-button-dark min-h-9 px-5">
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
