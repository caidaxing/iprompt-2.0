"use client";

// 昵称编辑器：仅可修改一次（PRD F4）
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  initial: string | null;
  canEdit: boolean;
}

export function NicknameEditor({ initial, canEdit }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial ?? "");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ text: data.error ?? "保存失败", ok: false });
        return;
      }
      setMsg({ text: "已保存", ok: true });
      setEditing(false);
      router.refresh();
    } catch {
      setMsg({ text: "服务开小差了，请稍后重试", ok: false });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-t border-line pt-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-ink-soft">昵称</span>
        {canEdit && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-ink-mute hover:text-ink transition-colors underline underline-offset-2"
          >
            修改（仅一次）
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-2 flex gap-2">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={20}
            className="flex-1 bg-transparent border border-line rounded-sm px-3 py-1.5 text-sm focus:outline-none focus:border-ink"
          />
          <button
            onClick={save}
            disabled={busy || !value.trim()}
            className="text-xs bg-ink text-paper px-4 rounded-sm disabled:opacity-40"
          >
            保存
          </button>
          <button
            onClick={() => setEditing(false)}
            className="text-xs border border-line px-4 rounded-sm hover:border-ink"
          >
            取消
          </button>
        </div>
      ) : (
        <p className="text-sm mt-1">{initial ?? `用户（未设置昵称）`}</p>
      )}
      {msg && <p className={`text-xs mt-2 ${msg.ok ? "text-moss" : "text-red-700"}`}>{msg.text}</p>}
    </div>
  );
}
