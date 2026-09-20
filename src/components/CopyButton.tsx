"use client";

import { useState } from "react";

/** 复制按钮：成功后显示「已复制 ✓」2 秒还原（PRD F2） */
export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 剪贴板 API 不可用时退化为选区复制
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 border border-ink text-ink text-xs px-3 py-2 hover:bg-ink hover:text-paper transition-colors"
    >
      {copied ? "已复制 ✓" : "复制提示词"}
    </button>
  );
}
