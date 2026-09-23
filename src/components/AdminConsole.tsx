"use client";

// 管理后台外壳:用户审核 / 邀请码 双 Tab
import { useState } from "react";
import { AdminUsers } from "@/components/AdminUsers";
import { AdminInvites } from "@/components/AdminInvites";

type Tab = "users" | "invites";

export function AdminConsole() {
  const [tab, setTab] = useState<Tab>("users");

  return (
    <div className="site-shell py-10">
      <p className="eyebrow text-[10px] mb-2">ADMIN</p>
      <h1 className="serif-title text-2xl mb-6">管理后台</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 border border-line rounded-sm mb-8 text-sm">
        {(
          [
            ["users", "用户审核"],
            ["invites", "邀请码"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`py-2.5 transition-colors ${tab === key ? "bg-ink text-paper" : "hover:bg-ink/5"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "users" ? <AdminUsers /> : <AdminInvites />}
    </div>
  );
}
