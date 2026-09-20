"use client";

/** 全局错误边界：统一提示，不白屏（PRD F7） */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="text-center py-24">
      <p className="eyebrow text-xs mb-4">OOPS</p>
      <p className="serif-title text-2xl mb-2">服务开小差了，请稍后重试</p>
      <button
        onClick={reset}
        className="mt-6 bg-ink text-paper text-sm px-6 py-2 rounded-sm hover:opacity-85 transition-opacity"
      >
        重试
      </button>
    </div>
  );
}
