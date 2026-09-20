"use client";

// 搜索框：回车或点击触发，写入 URL query（PRD F1）
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function SearchBox() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  const go = () => {
    const next = new URLSearchParams(params);
    if (q.trim()) next.set("q", q.trim());
    else next.delete("q");
    next.delete("page"); // 新搜索回到第 1 页
    router.push(`/explore?${next.toString()}`);
  };

  return (
    <div className="flex gap-2 border-b border-line focus-within:border-ink transition-colors">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && go()}
        placeholder="搜索风格、场景或关键词"
        className="flex-1 md:w-72 bg-transparent px-1 py-2 text-sm placeholder:text-ink-mute focus:outline-none"
      />
      <button
        onClick={go}
        className="px-2 text-xs text-ink-soft hover:text-ink transition-colors"
      >
        搜索
      </button>
    </div>
  );
}
