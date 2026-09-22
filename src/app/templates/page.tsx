import type { Metadata } from "next";
import { TemplatesLibrary } from "@/components/TemplatesLibrary";
import { absoluteUrl, siteName } from "@/lib/site";

export const metadata: Metadata = {
  title: "工业级提示词模板库",
  description:
    "13 个分类、22 套工业级 GPT-Image 提示词模板:文本填空开箱即用,JSON 进阶模板供 Agent 调用,附防坑指南,开箱即用。",
  alternates: { canonical: absoluteUrl("/templates") },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName,
    title: "工业级提示词模板库 · iPrompt Studio",
    description: "13 个分类、22 套工业级 GPT-Image 提示词模板,文本填空即用,附 JSON 进阶模板与防坑指南。",
    url: absoluteUrl("/templates"),
    images: [
      {
        url: absoluteUrl("/images/og-default.png"),
        width: 1200,
        height: 630,
        alt: "iPrompt Studio · 工业级提示词模板库",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "工业级提示词模板库 · iPrompt Studio",
    description: "13 个分类、22 套工业级 GPT-Image 提示词模板,文本填空即用,附 JSON 进阶模板与防坑指南。",
    images: [absoluteUrl("/images/og-default.png")],
  },
};

/** 模板库(参照上游 docs/templates.md 的双轨模板体系) */
export default function TemplatesPage() {
  return <TemplatesLibrary />;
}
