import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  // title 交给页面级 metadata（案例浏览），由根模板追加站点名，避免重复
  description: "按模型、类型标签和关键词浏览可复用的 AI 图像提示词案例，获取清晰的画面结构与创作灵感。",
  alternates: { canonical: absoluteUrl("/explore") },
  openGraph: {
    title: "案例浏览 · AI 图像提示词案例库",
    description: "按模型、标签和关键词浏览可复用的图像提示词案例。",
    url: absoluteUrl("/explore"),
  },
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
