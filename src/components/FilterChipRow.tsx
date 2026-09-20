import Link from "next/link";

export interface ChipItem {
  key: string;
  label: string;
  active: boolean;
  href: string;
  count?: number;
}

/** 标签 chips 行（模型行/类型行通用）；active 项反白 */
export function FilterChipRow({ items, ariaLabel }: { items: ChipItem[]; ariaLabel: string }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label={ariaLabel}>
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          aria-current={item.active ? "true" : undefined}
          className={`inline-flex items-center gap-1.5 border rounded-sm px-3 py-1.5 text-xs transition-colors ${
            item.active
              ? "bg-ink text-paper border-ink"
              : "border-line text-ink-soft hover:border-ink hover:text-ink"
          }`}
        >
          <span>{item.label}</span>
          {typeof item.count === "number" && (
            <span className={item.active ? "text-paper/60" : "text-ink-mute"}>{item.count}</span>
          )}
        </Link>
      ))}
    </div>
  );
}
