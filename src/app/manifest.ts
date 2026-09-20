import type { MetadataRoute } from "next";
import { siteName } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteName} · AI 提示词案例库`,
    short_name: siteName,
    description: "可检索、可复用的 AI 图像提示词案例库。",
    start_url: "/",
    display: "browser",
    background_color: "#f7f4ee",
    theme_color: "#1c1b19",
    lang: "zh-CN",
  };
}
