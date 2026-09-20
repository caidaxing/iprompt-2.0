import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Agent Skills(即将上线)",
  description: "把 iPrompt Studio 的案例库与模板库打包成标准 Agent Skills,一键安装到你的 AI 助手。",
};

/** 技能中心:占位页,后续把案例库/模板库打包为标准 Agent Skills 分发 */
export default function SkillsPage() {
  return (
    <div className="site-shell py-16 max-w-2xl">
      <p className="eyebrow text-[10px] mb-3">AGENT SKILLS</p>
      <h1 className="serif-title text-2xl mb-4">技能中心 · 即将上线</h1>
      <p className="text-sm text-ink-soft leading-6 mb-8">
        我们正在把站内的案例库与工业级模板库打包成标准 Agent Skills——
        安装后,你的 AI 助手(Claude、Codex 等)可以直接按风格检索案例、按模板产出提示词,不用再翻网页。
      </p>

      <div className="grid sm:grid-cols-2 gap-4 mb-10">
        <div className="border border-line rounded-sm p-5">
          <p className="text-xs text-ink-mute mb-2">SKILL 01</p>
          <h2 className="serif-title text-base mb-2">案例风格库</h2>
          <p className="text-xs text-ink-soft leading-5">
            全站案例的风格索引与提示词原文,助手按「类型 / 风格 / 场景」直接调用。
          </p>
          <p className="text-[10px] text-ink-mute mt-3">状态:整理中</p>
        </div>
        <div className="border border-line rounded-sm p-5">
          <p className="text-xs text-ink-mute mb-2">SKILL 02</p>
          <h2 className="serif-title text-base mb-2">工业级模板包</h2>
          <p className="text-xs text-ink-soft leading-5">
            13 分类 21+ 套填空模板与 Agent JSON,助手按场景自动选择并填参。
          </p>
          <p className="text-[10px] text-ink-mute mt-3">状态:整理中</p>
        </div>
      </div>

      <div className="border border-dashed border-line rounded-sm p-5 text-xs text-ink-mute leading-5">
        <p>
          参考实现:上游项目 awesome-gpt-image-2 已开源同思路的{" "}
          <a
            href="https://github.com/freestylefly/awesome-gpt-image-2/tree/main/agents/skills"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-ink"
          >
            gpt-image-2-style-library 技能包
          </a>
          。上线后我们会提供中文案例版的一键安装命令。
        </p>
      </div>

      <Link href="/templates" className="inline-block mt-8 editorial-button editorial-button-dark min-h-9 px-4">
        先逛模板库
      </Link>
    </div>
  );
}
