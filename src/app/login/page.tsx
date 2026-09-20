"use client";

// 登录/注册页：邮箱 + 密码，注册后进入待审状态（超管审核制）
import { useState } from "react";
import { useRouter } from "next/navigation";

type Tab = "login" | "register";

const inputCls =
  "w-full bg-transparent border border-line rounded-sm px-3 py-2.5 text-sm placeholder:text-ink-mute focus:outline-none focus:border-ink transition-colors";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [registered, setRegistered] = useState(false); // 注册提交成功 → 显示待审核说明
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const switchTab = (next: Tab) => {
    setTab(next);
    setMsg(null);
    setPassword("");
    setConfirm("");
  };

  const submit = async () => {
    if (tab === "register" && password !== confirm) {
      setMsg({ text: "两次输入的密码不一致", ok: false });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/auth/${tab}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ text: data.error ?? "操作失败", ok: false });
        return;
      }
      if (tab === "register") {
        setRegistered(true); // 无论邮箱是否已存在，统一展示待审核说明（防枚举）
        return;
      }
      router.push("/explore"); // 登录成功，跳转首页（来源页传递后续可加）
      router.refresh();
    } catch {
      setMsg({ text: "服务开小差了，请稍后重试", ok: false });
    } finally {
      setBusy(false);
    }
  };

  if (registered) {
    return (
      <div className="max-w-sm mx-auto py-16 text-center">
        <p className="eyebrow text-[10px] text-center mb-3">REGISTRATION</p>
        <h1 className="serif-title text-2xl mb-4">注册已提交</h1>
        <p className="text-sm text-ink-soft leading-6 mb-10">
          本站采用邀请审核制，管理员通过后会开放登录。
          <br />
          请稍后再用邮箱 + 密码登录。
        </p>
        <button
          onClick={() => {
            setRegistered(false);
            switchTab("login");
          }}
          className="editorial-button editorial-button-dark px-6"
        >
          返回登录
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto py-16">
      <p className="eyebrow text-[10px] text-center mb-3">{tab === "login" ? "SIGN IN" : "SIGN UP"}</p>
      <h1 className="serif-title text-2xl text-center mb-2">
        {tab === "login" ? "登录" : "申请注册"}
      </h1>
      <p className="text-sm text-ink-soft text-center mb-8">
        {tab === "login" ? "使用邮箱和密码登录" : "注册后需管理员审核通过方可登录"}
      </p>

      {/* Tab 切换 */}
      <div className="grid grid-cols-2 border border-line rounded-sm mb-6 text-sm">
        {(["login", "register"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={`py-2.5 transition-colors ${
              tab === t ? "bg-ink text-paper" : "hover:bg-ink/5"
            }`}
          >
            {t === "login" ? "登录" : "注册"}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs text-ink-mute mb-1.5">邮箱</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-xs text-ink-mute mb-1.5">密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={tab === "register" ? "至少 8 位" : "输入密码"}
            className={inputCls}
          />
        </div>

        {tab === "register" && (
          <div>
            <label className="block text-xs text-ink-mute mb-1.5">确认密码</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="再次输入密码"
              className={inputCls}
            />
          </div>
        )}

        {msg && <p className={`text-xs ${msg.ok ? "text-moss" : "text-red-700"}`}>{msg.text}</p>}

        <button
          onClick={submit}
          disabled={busy || !email || !password}
          className="w-full bg-ink text-paper text-sm py-3 rounded-sm hover:opacity-85 transition-opacity disabled:opacity-40"
        >
          {busy ? "请稍候…" : tab === "login" ? "登录" : "提交注册申请"}
        </button>
      </div>
    </div>
  );
}
