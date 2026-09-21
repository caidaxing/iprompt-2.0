"use client";

// 导航右侧登录态:未登录显示「登录」;已登录头像下拉菜单(我的作品/个人中心/用户审核/退出)
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { maskEmail } from "@/lib/categories";

interface Props {
  user: { id: string; email: string; nickname: string | null; role?: string } | null;
}

export function NavAuth({ user }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 服务端渲染时访问令牌可能刚过期:客户端 ping /api/auth/me 触发静默续期
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

  // 点击菜单外部 / Esc 关闭
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

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
      setMenuOpen(false);
      router.push("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const menuItem =
    "block w-full text-left px-4 py-2.5 text-[13px] text-ink-soft hover:text-ink hover:bg-ink/5 transition-colors";

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen((o) => !o)}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        <span className="w-8 h-8 border border-ink bg-ink text-paper flex items-center justify-center text-xs">
          {(user.nickname ?? maskEmail(user.email)[0]).toUpperCase()}
        </span>
        <span className="max-w-24 truncate hidden sm:inline">{user.nickname ?? maskEmail(user.email)}</span>
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-44 bg-paper border border-line rounded-sm shadow-lg py-1.5 z-50"
        >
          <Link href="/me/generations" role="menuitem" className={menuItem} onClick={() => setMenuOpen(false)}>
            我的作品
          </Link>
          <Link href="/me" role="menuitem" className={menuItem} onClick={() => setMenuOpen(false)}>
            个人中心
          </Link>
          {user.role === "admin" && (
            <Link href="/admin/users" role="menuitem" className={menuItem} onClick={() => setMenuOpen(false)}>
              用户审核
            </Link>
          )}
          <div className="border-t border-line my-1.5" />
          <button role="menuitem" onClick={handleLogout} disabled={busy} className={menuItem + " disabled:opacity-50"}>
            {busy ? "退出中…" : "退出登录"}
          </button>
        </div>
      )}
    </div>
  );
}
