"use client";

// 导航右侧登录态：未登录显示「登录」按钮；已登录显示头像昵称 + 退出
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { maskEmail } from "@/lib/categories";

interface Props {
  user: { id: string; email: string; nickname: string | null; role?: string } | null;
}

export function NavAuth({ user }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  // 服务端渲染时访问令牌可能刚过期：客户端 ping /api/auth/me 触发静默续期
  useEffect(() => {
    if (user) return;
    let cancelled = false;
    fetch("/api/auth/me").then((r) => {
      if (!cancelled && r.ok) router.refresh();
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, router]);

  if (!user) {
    return (
      <Link
        href="/login"
        className="editorial-button editorial-button-dark min-h-9 px-4"
      >
        登录
      </Link>
    );
  }

  const handleLogout = async () => {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {user.role === "admin" && (
        <Link href="/admin/users" className="text-xs text-ink-mute hover:text-ink transition-colors">
          用户审核
        </Link>
      )}
      <Link href="/me" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <span className="w-8 h-8 border border-ink bg-ink text-paper flex items-center justify-center text-xs">
          {(user.nickname ?? maskEmail(user.email)[0]).toUpperCase()}
        </span>
        <span className="max-w-24 truncate">{user.nickname ?? maskEmail(user.email)}</span>
      </Link>
      <button
        onClick={handleLogout}
        disabled={busy}
        className="text-xs text-ink-mute hover:text-ink transition-colors disabled:opacity-50"
      >
        退出
      </button>
    </div>
  );
}
