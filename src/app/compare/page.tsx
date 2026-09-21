import type { Metadata } from "next";
import { CompareWorkspace } from "@/components/CompareWorkspace";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "模型比对 · 同一提示词,不同模型",
  description:
    "同一提示词,不同模型的并排/滑动效果对比。完整 Prompt 公开,支持一键复制,实测结果持续更新。",
  // 页面仍被「敬请期待」蒙层覆盖,内容未上线:先不收权到索引,上线后改回 index 并加入 sitemap
  robots: { index: false, follow: true },
  alternates: { canonical: absoluteUrl("/compare") },
};

/** 模型比对(参照上游对比专区思路,定位:同一提示词 × 不同模型) */
export default function ComparePage() {
  return <CompareWorkspace />;
}
