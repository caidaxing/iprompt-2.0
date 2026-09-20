import type { Metadata } from "next";
import { CompareWorkspace } from "@/components/CompareWorkspace";

export const metadata: Metadata = {
  title: "GPT-Image 2.5 对比专区 · 同提示词对比",
  description:
    "同一提示词下,GPT-Image 2 图库原图与 GPT-Image 2.5 生成结果的并排/滑动对比。完整 Prompt 公开,支持一键复制,实测结果持续更新。",
};

/** 2.5 对比专区(参照上游 awesome-gpt-image-2 的 gpt-image-2-5 专区思路) */
export default function ComparePage() {
  return <CompareWorkspace />;
}
