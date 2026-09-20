import Link from "next/link";

/** 上一篇 / 下一篇（同展示分类内，首尾禁用态）（PRD F2） */
export function PrevNext({ prev, next, modelId }: { prev: number | null; next: number | null; modelId: string }) {
  const box = (label: string, num: number | null, align: "left" | "right") => {
    const cls = `flex-1 border border-line rounded-sm p-4 ${align === "right" ? "text-right" : ""} ${
      num ? "hover:border-ink transition-colors" : "opacity-40 pointer-events-none"
    }`;
    const inner = (
      <>
        <p className="text-xs text-ink-mute mb-1">{label}</p>
        <p className="serif-title text-sm">{num ? `例 ${num}` : "已到边界"}</p>
      </>
    );
    return num ? (
      <Link href={`/case/${num}?model=${encodeURIComponent(modelId)}`} className={cls}>
        {inner}
      </Link>
    ) : (
      <div className={cls}>{inner}</div>
    );
  };

  return (
    <div className="flex gap-4 mt-10">
      {box("← 上一篇", prev, "left")}
      {box("下一篇 →", next, "right")}
    </div>
  );
}
