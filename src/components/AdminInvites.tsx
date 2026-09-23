"use client";

// 邀请码管理:签发(平台签名码) + 列表 + 启停 + 复制
import { useCallback, useEffect, useState } from "react";

interface InviteRow {
  id: string;
  code: string;
  prefix: string;
  note: string;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  status: string; // active | disabled | expired | exhausted
  createdAt: string;
}

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  active: { text: "有效", cls: "text-moss border-moss" },
  disabled: { text: "已禁用", cls: "text-ink-mute border-line" },
  expired: { text: "已过期", cls: "text-red-700 border-red-700" },
  exhausted: { text: "已用尽", cls: "text-red-700 border-red-700" },
};

const inputCls =
  "bg-transparent border border-line rounded-sm px-3 py-2 text-sm placeholder:text-ink-mute focus:outline-none focus:border-ink transition-colors";

export function AdminInvites() {
  const [invites, setInvites] = useState<InviteRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [form, setForm] = useState({ prefix: "", maxUses: "5", expiresDays: "30", note: "" });
  const [created, setCreated] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/invites")
      .then(async (r) => {
        const d = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setInvites([]);
          setError(d.error ?? "加载失败");
          return;
        }
        setInvites(d.invites);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) {
          setInvites([]);
          setError("服务开小差了,请稍后重试");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const create = async () => {
    setBusy(true);
    setError(null);
    setCreated(null);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prefix: form.prefix.trim() || undefined,
          maxUses: Number(form.maxUses),
          expiresDays: Number(form.expiresDays),
          note: form.note.trim(),
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "生成失败");
        return;
      }
      setCreated(d.invite.code);
      setForm((f) => ({ ...f, note: "" }));
      refresh();
    } catch {
      setError("服务开小差了,请稍后重试");
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (id: string, action: "enable" | "disable") => {
    setBusy(true);
    try {
      const res = await fetch(`/api/invites/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "操作失败");
        return;
      }
      refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {/* 生成表单 */}
      <div className="border border-line rounded-sm p-4 mb-6">
        <h2 className="text-sm font-medium mb-3">签发新邀请码</h2>
        <div className="flex flex-wrap items-end gap-3 text-sm">
          <div>
            <label className="block text-xs text-ink-mute mb-1">前缀(可选)</label>
            <input
              value={form.prefix}
              onChange={(e) => setForm((f) => ({ ...f, prefix: e.target.value }))}
              placeholder="IP"
              className={inputCls + " w-24"}
            />
          </div>
          <div>
            <label className="block text-xs text-ink-mute mb-1">可用次数</label>
            <input
              type="number"
              min={1}
              max={100}
              value={form.maxUses}
              onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
              className={inputCls + " w-24"}
            />
          </div>
          <div>
            <label className="block text-xs text-ink-mute mb-1">有效期</label>
            <select
              value={form.expiresDays}
              onChange={(e) => setForm((f) => ({ ...f, expiresDays: e.target.value }))}
              className={inputCls + " w-32"}
            >
              <option value="7">7 天</option>
              <option value="30">30 天</option>
              <option value="90">90 天</option>
              <option value="365">365 天</option>
            </select>
          </div>
          <div className="flex-1 min-w-40">
            <label className="block text-xs text-ink-mute mb-1">发放对象备注(必填)</label>
            <input
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="如:发给张三内测"
              className={inputCls + " w-full"}
              onKeyDown={(e) => e.key === "Enter" && create()}
            />
          </div>
          <button
            onClick={create}
            disabled={busy || !form.note.trim()}
            className="bg-ink text-paper text-sm px-4 py-2 rounded-sm hover:opacity-85 transition-opacity disabled:opacity-40"
          >
            {busy ? "生成中…" : "生成邀请码"}
          </button>
        </div>
        {error && <p className="text-xs text-red-700 mt-3">{error}</p>}
        {created && (
          <div className="mt-3 flex items-center gap-3 text-sm">
            <span className="text-moss">已生成:</span>
            <code className="border border-line rounded-sm px-2 py-1 tracking-wider">{created}</code>
            <button
              onClick={() => navigator.clipboard.writeText(created)}
              className="text-xs text-ink-mute hover:text-ink transition-colors"
            >
              复制
            </button>
          </div>
        )}
      </div>

      {/* 列表 */}
      {invites === null ? (
        <p className="text-sm text-ink-mute">加载中…</p>
      ) : invites.length === 0 ? (
        <p className="text-sm text-ink-mute">还没有邀请码,用上面的表单签发第一张。</p>
      ) : (
        <div className="border border-line rounded-sm divide-y divide-line">
          {invites.map((inv) => {
            const badge = STATUS_LABEL[inv.status] ?? { text: inv.status, cls: "border-line text-ink-soft" };
            return (
              <div key={inv.id} className="px-4 py-3 flex flex-wrap items-center gap-3 text-sm">
                <div className="flex-1 min-w-48">
                  <code className="text-xs tracking-wider">{inv.code}</code>
                  <div className="text-xs text-ink-mute mt-0.5">
                    {inv.note} · {inv.usedCount}/{inv.maxUses} 次 · 到期{" "}
                    {new Date(inv.expiresAt).toLocaleDateString("zh-CN")}
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-sm border ${badge.cls}`}>{badge.text}</span>
                <div className="flex gap-2">
                  {inv.status === "active" ? (
                    <button
                      onClick={() => toggle(inv.id, "disable")}
                      disabled={busy}
                      className="text-xs px-3 py-1 rounded-sm border border-line hover:border-red-700 hover:text-red-700 transition-colors disabled:opacity-40"
                    >
                      禁用
                    </button>
                  ) : inv.status === "disabled" ? (
                    <button
                      onClick={() => toggle(inv.id, "enable")}
                      disabled={busy}
                      className="text-xs px-3 py-1 rounded-sm border border-ink hover:bg-ink hover:text-paper transition-colors disabled:opacity-40"
                    >
                      启用
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
