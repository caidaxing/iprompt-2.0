"use client";

// 收藏按钮：登录 → 切换收藏；游客 → 登录引导弹窗（PRD F3）
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Props {
  caseId: string; // 收藏锚点用 Case.id（跨模型唯一），展示编号仍用 num
  initialFavorited: boolean;
  loggedIn: boolean;
  size?: "sm" | "md";
}

export function FavoriteButton({ caseId, initialFavorited, loggedIn, size = "md" }: Props) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [showGuide, setShowGuide] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (!loggedIn) {
      setShowGuide(true);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId }),
      });
      if (res.status === 401) {
        setShowGuide(true);
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFavorited(data.favorited);
      router.refresh();
    } catch {
      alert("服务开小差了，请稍后重试");
    } finally {
      setBusy(false);
    }
  };

  const dim = size === "md" ? "text-lg w-9 h-9" : "text-sm w-7 h-7";

  return (
    <>
      <button
        onClick={handleClick}
        disabled={busy}
        aria-label={favorited ? "取消收藏" : "收藏"}
        className={`${dim} inline-flex items-center justify-center rounded-full border border-line hover:border-ink transition-colors disabled:opacity-50`}
      >
        <span className={favorited ? "text-red-600" : "text-ink-mute"}>{favorited ? "♥" : "♡"}</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="bg-paper border border-line rounded-sm max-w-sm w-full p-8 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="serif-title text-xl mb-2">收藏需要登录</p>
            <p className="text-sm text-ink-soft mb-6">登录后即可建立你的灵感收藏库</p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/login"
                className="bg-ink text-paper text-sm px-6 py-2 rounded-sm hover:opacity-85 transition-opacity"
              >
                去登录
              </Link>
              <button
                onClick={() => setShowGuide(false)}
                className="text-sm px-6 py-2 border border-line rounded-sm hover:border-ink transition-colors"
              >
                先逛逛
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
