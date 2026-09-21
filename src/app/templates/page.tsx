import type { Metadata } from "next";
import { TemplatesLibrary } from "@/components/TemplatesLibrary";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "工业级提示词模板库",
  description:
    "13 个分类、22 套工业级 GPT-Image 提示词模板:文本填空开箱即用,JSON 进阶模板供 Agent 调用,附防坑指南,开箱即用。",
  alternates: { canonical: absoluteUrl("/templates") },
  openGraph: {
    title: "工业级提示词模板库 · iPrompt Studio",
    description: "13 个分类、22 套工业级 GPT-Image 提示词模板,文本填空即用,附 JSON 进阶模板与防坑指南。",
    url: absoluteUrl("/templates"),
  },
};

/** 模板库(参照上游 docs/templates.md 的双轨模板体系) */
export default function TemplatesPage() {
  return <TemplatesLibrary />;
}
