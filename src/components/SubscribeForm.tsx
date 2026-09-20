"use client";

// 邮箱订阅表单（AI 匹配占位页，PRD F6）
import { useState } from "react";

export function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ text: data.error ?? "提交失败", ok: false });
      } else {
        setMsg({ text: data.message, ok: true });
        if (!data.duplicate) setEmail("");
      }
    } catch {
      setMsg({ text: "服务开小差了，请稍后重试", ok: false });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && email && submit()}
          placeholder="留下你的邮箱"
          className="flex-1 bg-transparent border border-line rounded-sm px-4 py-2.5 text-sm placeholder:text-ink-mute focus:outline-none focus:border-ink transition-colors"
        />
        <button
          onClick={submit}
          disabled={busy || !email}
          className="bg-ink text-paper text-sm px-6 rounded-sm hover:opacity-85 transition-opacity disabled:opacity-40"
        >
          订阅
        </button>
      </div>
      {msg && (
        <p className={`text-xs mt-2 ${msg.ok ? "text-moss" : "text-red-700"}`}>{msg.text}</p>
      )}
    </div>
  );
}
