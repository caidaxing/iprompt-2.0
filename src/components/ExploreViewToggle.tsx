import Link from "next/link";

interface Props {
  active: "cases" | "curated";
  model?: string | undefined;
}

/** /explore 视图切换：案例库（默认浏览体验）/ 改造推荐（48 条精选） */
export function ExploreViewToggle({ active, model }: Props) {
  const prefix = model ? `model=${encodeURIComponent(model)}&` : "";
  const items = [
    { key: "cases" as const, label: "案例库", href: `/explore?${prefix}`.replace(/[?&]$/, "") },
    { key: "curated" as const, label: "改造推荐", href: `/explore?${prefix}view=curated` },
  ];

  return (
    <div className="inline-flex items-center border border-line rounded-sm p-0.5 gap-0.5 shrink-0">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={`px-4 py-1.5 text-xs rounded-sm transition-colors ${
            active === item.key ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
