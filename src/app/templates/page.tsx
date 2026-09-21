import type { Metadata } from "next";
import { TemplatesLibrary } from "@/components/TemplatesLibrary";

export const metadata: Metadata = {
  title: "工业级提示词模板库",
  description:
    "13 个分类、21+ 套工业级 GPT-Image 提示词模板:文本填空开箱即用,JSON 进阶模板供 Agent 调用,附防坑指南,开箱即用。",
};

/** 模板库(参照上游 docs/templates.md 的双轨模板体系) */
export default function TemplatesPage() {
  return <TemplatesLibrary />;
}
