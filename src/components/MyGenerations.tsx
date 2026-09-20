"use client";

// 我的作品:当前登录用户的生成记录网格
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface GenerationRow {
  id: string;
  caseId: string | null;
  prompt: string;
  provider: string;
  status: string;
  imagePath: string | null;
  creditCost: number;
  error: string | null;
  createdAt: string;
}

export function MyGenerations() {
  const [items, setItems] = useState<GenerationRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<GenerationRow | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    fetch("/api/studio/generations")
      .then(async (r) => {
        const d = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setError(d.error ?? "加载失败");
          setItems([]);
          return;
        }
        setItems(d.generations);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError("服务开小差了,请稍后重试");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="site-shell py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="eyebrow text-[10px] mb-2">MY WORKS</p>
          <h1 className="serif-title text-2xl">我的作品</h1>
        </div>
        <Link href="/studio" className="editorial-button editorial-button-dark min-h-9 px-4">
          去工作台生成
        </Link>
      </div>

      {error && <p className="text-xs text-red-700 mb-4">{error}</p>}
      {items === null ? (
        <p className="text-sm text-ink-mute">加载中…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-ink-mute">
          还没有作品。去 <Link href="/studio" className="underline hover:text-ink">工作台</Link> 生成第一张吧。
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((g) => (
            <button
              key={g.id}
              onClick={() => setPreview(g)}
              className="text-left border border-line rounded-sm overflow-hidden hover:border-ink transition-colors"
            >
              {g.status === "succeeded" && g.imagePath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={"/" + g.imagePath} alt={g.prompt.slice(0, 40)} className="w-full aspect-square object-cover" />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center bg-ink/5 text-xs text-ink-mute">
                  {g.status === "failed" ? "生成失败" : "生成中…"}
                </div>
              )}
              <div className="px-3 py-2">
                <div className="text-xs truncate">{g.prompt.slice(0, 40)}</div>
                <div className="text-[10px] text-ink-mute mt-1">
                  {new Date(g.createdAt).toLocaleDateString("zh-CN")} · {g.status === "succeeded" ? `-${g.creditCost} 积分` : "已退分"}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {preview && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6"
          onClick={() => setPreview(null)}
        >
          <div className="bg-paper max-w-2xl w-full rounded-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {preview.imagePath && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={"/" + preview.imagePath} alt="作品" className="w-full max-h-[60vh] object-contain bg-ink/5" />
            )}
            <div className="p-4">
              <p className="text-xs text-ink-soft whitespace-pre-wrap max-h-40 overflow-y-auto">{preview.prompt}</p>
              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => navigator.clipboard.writeText(preview.prompt)}
                  className="text-xs px-3 py-1.5 border border-ink rounded-sm hover:bg-ink hover:text-paper transition-colors"
                >
                  复制提示词
                </button>
                <button
                  onClick={() => setPreview(null)}
                  className="text-xs px-3 py-1.5 text-ink-mute hover:text-ink transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
