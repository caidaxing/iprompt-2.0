import Link from "next/link";

interface Props {
  page: number;
  totalPages: number;
  model?: string | undefined;
  tags?: string[] | undefined;
  q?: string | undefined;
}

/** 页码导航：01 / 31 式，保留模型/标签/搜索条件（PRD F1） */
export function Pagination({ page, totalPages, model, tags, q }: Props) {
  const build = (p: number) => {
    const params = new URLSearchParams();
    if (model) params.set("model", model);
    if (tags && tags.length) params.set("tags", tags.join(","));
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return s ? `/explore?${s}` : "/explore";
  };

  const pad = (n: number) => String(n).padStart(2, "0");
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2,
  );

  return (
    <div className="flex items-center justify-center gap-2 mt-10 text-sm">
      {page > 1 && (
        <Link href={build(page - 1)} className="px-3 py-1.5 text-ink-soft hover:text-ink transition-colors">
          ← 上一页
        </Link>
      )}
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-2">
          {i > 0 && p - pages[i - 1] > 1 && <span className="text-ink-mute">…</span>}
          <Link
            href={build(p)}
            className={`px-3 py-1.5 rounded-sm transition-colors ${
              p === page ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
            }`}
          >
            {pad(p)}
          </Link>
        </span>
      ))}
      <span className="text-ink-mute mx-1">/ {pad(totalPages)}</span>
      {page < totalPages && (
        <Link href={build(page + 1)} className="px-3 py-1.5 text-ink-soft hover:text-ink transition-colors">
          下一页 →
        </Link>
      )}
    </div>
  );
}
