"use client";

// 超管用户管理：待审列表 + 通过/拒绝 + 重置密码
import { useCallback, useEffect, useState } from "react";

interface AdminUserRow {
  id: string;
  email: string;
  nickname: string | null;
  status: string;
  role: string;
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "待审核",
  active: "已通过",
  rejected: "已拒绝",
};

export function AdminUsers() {
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [reloadKey, setReloadKey] = useState(0);
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  // 拉取列表：tab 或操作后（reloadKey 变化）触发
  useEffect(() => {
    let cancelled = false;
    const qs = tab === "pending" ? "?status=pending" : "";
    fetch(`/api/admin/users${qs}`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setUsers(null);
          setError(data.error ?? "加载失败");
          return;
        }
        setUsers(data.users);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) {
          setUsers(null);
          setError("服务开小差了，请稍后重试");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tab, reloadKey]);

  const act = async (id: string, fn: () => Promise<Response>) => {
    setActingId(id);
    try {
      const res = await fn();
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "操作失败");
        return;
      }
      refresh();
    } finally {
      setActingId(null);
    }
  };

  const review = (id: string, action: "approve" | "reject") =>
    act(id, () =>
      fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      }),
    );

  const resetPassword = (id: string, email: string) => {
    const password = window.prompt(`为 ${email} 设置新密码（至少 8 位）：`);
    if (!password) return;
    act(id, () =>
      fetch(`/api/admin/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      }),
    );
  };

  const adjustCredits = (id: string, email: string) => {
    const raw = window.prompt(`调整 ${email} 的积分（输入正数充值、负数扣减，如 +50 或 -10）：`);
    if (!raw) return;
    const delta = parseInt(raw.trim(), 10);
    if (!Number.isInteger(delta) || delta === 0) {
      setError("积分调整量必须是非零整数");
      return;
    }
    const reason = window.prompt("调整原因（将记入积分流水）：");
    if (!reason) return;
    act(id, () =>
      fetch(`/api/admin/users/${id}/credits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta, reason }),
      }),
    );
  };

  return (
    <div className="site-shell py-10">
      <p className="eyebrow text-[10px] mb-2">ADMIN</p>
      <h1 className="serif-title text-2xl mb-6">用户审核</h1>

      <div className="flex gap-2 mb-6 text-sm">
        {(
          [
            ["pending", "待审核"],
            ["all", "全部用户"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-sm border transition-colors ${
              tab === key ? "bg-ink text-paper border-ink" : "border-line hover:border-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-red-700 mb-4">{error}</p>}
      {users === null ? (
        <p className="text-sm text-ink-mute">加载中…</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-ink-mute">暂无用户</p>
      ) : (
        <div className="border border-line rounded-sm divide-y divide-line">
          {users.map((u) => (
            <div key={u.id} className="px-4 py-3 flex flex-wrap items-center gap-3 text-sm">
              <div className="flex-1 min-w-48">
                <div className="truncate">{u.email}</div>
                <div className="text-xs text-ink-mute">
                  {u.nickname ?? "未设昵称"} · 注册于 {new Date(u.createdAt).toLocaleDateString("zh-CN")}
                </div>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-sm border ${
                  u.status === "active"
                    ? "text-moss border-moss"
                    : u.status === "rejected"
                      ? "text-red-700 border-red-700"
                      : "text-ink-soft border-line"
                }`}
              >
                {STATUS_LABEL[u.status] ?? u.status}
              </span>
              {u.role === "admin" && <span className="text-xs text-ink-mute">超管</span>}
              <div className="flex gap-2">
                {u.status !== "active" && (
                  <button
                    onClick={() => review(u.id, "approve")}
                    disabled={actingId === u.id}
                    className="text-xs px-3 py-1 rounded-sm border border-ink hover:bg-ink hover:text-paper transition-colors disabled:opacity-40"
                  >
                    通过
                  </button>
                )}
                {u.status !== "rejected" && u.role !== "admin" && (
                  <button
                    onClick={() => review(u.id, "reject")}
                    disabled={actingId === u.id}
                    className="text-xs px-3 py-1 rounded-sm border border-line hover:border-red-700 hover:text-red-700 transition-colors disabled:opacity-40"
                  >
                    拒绝
                  </button>
                )}
                <button
                  onClick={() => resetPassword(u.id, u.email)}
                  disabled={actingId === u.id}
                  className="text-xs px-3 py-1 text-ink-mute hover:text-ink transition-colors disabled:opacity-40"
                >
                  重置密码
                </button>
                <button
                  onClick={() => adjustCredits(u.id, u.email)}
                  disabled={actingId === u.id}
                  className="text-xs px-3 py-1 text-ink-mute hover:text-ink transition-colors disabled:opacity-40"
                >
                  调积分
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
