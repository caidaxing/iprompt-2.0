import type { Metadata } from "next";
import { CompareWorkspace } from "@/components/CompareWorkspace";

export const metadata: Metadata = {
  title: "模型比对 · 同一提示词,不同模型",
  description:
    "同一提示词,不同模型的并排/滑动效果对比。完整 Prompt 公开,支持一键复制,实测结果持续更新。",
};

/** 模型比对(参照上游对比专区思路,定位:同一提示词 × 不同模型) */
export default function ComparePage() {
  return <CompareWorkspace />;
}
