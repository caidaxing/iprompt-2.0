"use client";

// AI 工作台:选案例填占位符(或自由创作)→ 消耗 1 积分生成 → 作品留存
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

interface StudioCase {
  id: string;
  num: number;
  title: string;
  prompt: string;
  modelId: string;
}

const inputCls =
  "w-full bg-transparent border border-line rounded-sm px-3 py-2.5 text-sm placeholder:text-ink-mute focus:outline-none focus:border-ink transition-colors";

function extractPlaceholders(prompt: string): string[] {
  const keys = new Set<string>();
  for (const m of prompt.matchAll(/\{([^{}]+)\}/g)) keys.add(m[1].trim());
  return [...keys];
}

export default function StudioPage() {
  const [mode, setMode] = useState<"case" | "free">("case");
  const [cases, setCases] = useState<StudioCase[] | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<StudioCase | null>(null);
  const [replacements, setReplacements] = useState<Record<string, string>>({});
  const [freePrompt, setFreePrompt] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [resultPath, setResultPath] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  // 拉取案例选择器与余额
  useEffect(() => {
    let cancelled = false;
    fetch("/api/studio/cases")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((d) => {
        if (!cancelled) setCases(d.cases);
      })
      .catch(() => {
        if (!cancelled) setCases([]);
      });
    fetch("/api/credits")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("credits"))))
      .then((d) => {
        if (!cancelled) setBalance(d.balance);
      })
      .catch(() => {
        if (!cancelled) setBalance(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const placeholders = useMemo(() => (selected ? extractPlaceholders(selected.prompt) : []), [selected]);

  const previewPrompt = useMemo(() => {
    if (mode === "free") return freePrompt;
    if (!selected) return "";
    return selected.prompt.replace(/\{([^{}]+)\}/g, (_, k: string) => {
      const v = replacements[k.trim()];
      return v?.trim() ? v.trim() : `{${k.trim()}}`;
    });
  }, [mode, selected, replacements, freePrompt]);

  const pickCase = (c: StudioCase) => {
    setSelected(c);
    setReplacements({});
  };

  const generate = async () => {
    setBusy(true);
    setMsg(null);
    setResultPath(null);
    try {
      const body =
        mode === "case" && selected
          ? { caseId: selected.id, replacements }
          : { freePrompt };
      const res = await fetch("/api/studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ text: data.error ?? "生成失败", ok: false });
        if (data.balanceAfter !== undefined) setBalance(data.balanceAfter);
        return;
      }
      setResultPath("/" + data.generation.imagePath);
      setBalance(data.balanceAfter);
      setMsg({ text: "生成成功,已存入我的作品", ok: true });
    } catch {
      setMsg({ text: "服务开小差了,请稍后重试", ok: false });
    } finally {
      setBusy(false);
    }
  };

  const canSubmit =
    !busy && (mode === "free" ? freePrompt.trim().length >= 8 : !!selected);
  // 有缺失占位符也允许生成(占位符原样保留),与后端语义一致

  const filtered = useMemo(() => {
    if (!cases) return [];
    const q = search.trim().toLowerCase();
    if (!q) return cases.slice(0, 30);
    return cases.filter((c) => c.title.toLowerCase().includes(q)).slice(0, 30);
  }, [cases, search]);

  return (
    <div className="site-shell py-10">
      <div className="flex items-center justify-between mb-2">
        <p className="eyebrow text-[10px]">AI STUDIO</p>
        {balance !== null && (
          <span className="text-xs text-ink-soft">
            积分余额 <b className="text-ink">{balance}</b> · 每张 1 积分
          </span>
        )}
      </div>
      <h1 className="serif-title text-2xl mb-6">AI 工作台</h1>

      <div className="grid md:grid-cols-2 gap-8">
        {/* 左栏:输入区 */}
        <div>
          <div className="grid grid-cols-2 border border-line rounded-sm mb-5 text-sm">
            {(["case", "free"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`py-2.5 transition-colors ${mode === m ? "bg-ink text-paper" : "hover:bg-ink/5"}`}
              >
                {m === "case" ? "从案例生成" : "自由创作"}
              </button>
            ))}
          </div>

          {mode === "case" && (
            <>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索案例标题…"
                className={inputCls + " mb-3"}
              />
              <div className="border border-line rounded-sm divide-y divide-line max-h-56 overflow-y-auto mb-4">
                {cases === null ? (
                  <p className="text-sm text-ink-mute px-3 py-3">加载中…</p>
                ) : filtered.length === 0 ? (
                  <p className="text-sm text-ink-mute px-3 py-3">没有匹配的案例</p>
                ) : (
                  filtered.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => pickCase(c)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-ink/5 transition-colors ${
                        selected?.id === c.id ? "bg-ink/10" : ""
                      }`}
                    >
                      <span className="text-ink-mute mr-2">#{c.num}</span>
                      {c.title}
                    </button>
                  ))
                )}
              </div>

              {selected && placeholders.length > 0 && (
                <div className="space-y-3 mb-4">
                  <p className="text-xs text-ink-mute">填写占位符(留空则保留原样):</p>
                  {placeholders.map((k) => (
                    <div key={k}>
                      <label className="block text-xs text-ink-mute mb-1">{k}</label>
                      <input
                        value={replacements[k] ?? ""}
                        onChange={(e) => setReplacements((r) => ({ ...r, [k]: e.target.value }))}
                        className={inputCls}
                        placeholder={`{${k}}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {mode === "free" && (
            <div className="mb-4">
              <label className="block text-xs text-ink-mute mb-1.5">提示词(至少 8 个字符)</label>
              <textarea
                value={freePrompt}
                onChange={(e) => setFreePrompt(e.target.value)}
                rows={8}
                placeholder="描述你想生成的画面,例如:A clean product poster for a ceramic coffee cup, soft morning light…"
                className={inputCls + " leading-6"}
              />
            </div>
          )}

          <button
            onClick={generate}
            disabled={!canSubmit}
            className="w-full bg-ink text-paper text-sm py-3 rounded-sm hover:opacity-85 transition-opacity disabled:opacity-40"
          >
            {busy ? "生成中…" : `生成(消耗 1 积分)`}
          </button>
          {msg && <p className={`text-xs mt-3 ${msg.ok ? "text-moss" : "text-red-700"}`}>{msg.text}</p>}
        </div>

        {/* 右栏:预览与结果 */}
        <div>
          {resultPath ? (
            <div className="border border-line rounded-sm overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resultPath} alt="生成结果" className="w-full" />
            </div>
          ) : (
            <div className="border border-dashed border-line rounded-sm min-h-64 flex items-center justify-center">
              <p className="text-sm text-ink-mute px-6 text-center">
                生成结果将显示在这里。
                <br />
                已有作品见 <Link href="/me/generations" className="underline hover:text-ink">我的作品</Link>
              </p>
            </div>
          )}

          {previewPrompt && (
            <details className="mt-4">
              <summary className="text-xs text-ink-mute cursor-pointer hover:text-ink">查看将发送的提示词</summary>
              <pre className="mt-2 text-xs text-ink-soft whitespace-pre-wrap border border-line rounded-sm p-3 max-h-64 overflow-y-auto bg-white/40">
                {previewPrompt}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
