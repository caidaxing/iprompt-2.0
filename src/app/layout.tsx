import type { Metadata } from "next";
import "./globals.css";
import { SiteNav } from "@/components/SiteNav";
import { absoluteUrl, siteName, siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "iPrompt Studio · AI 图像提示词案例库", template: "%s · iPrompt Studio" },
  description:
    "500+ 真实 AI 出图案例的中文提示词库，覆盖 GPT-Image-2、Nano Banana、Seedream 等模型。按分类与关键词找到可复制的结构化提示词，查看出图效果，一键复制直接使用。",
  applicationName: siteName,
  keywords: [
    "AI 提示词",
    "AI 图像提示词",
    "GPT-Image-2 提示词",
    "Nano Banana 提示词",
    "Seedream 提示词",
    "AI 绘画提示词",
    "提示词案例",
    "图像生成 Prompt",
  ],
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  category: "AI 图像创作",
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  openGraph: {
    type: "website", locale: "zh_CN", url: absoluteUrl("/"), siteName,
    title: "iPrompt Studio · AI 图像提示词案例库",
    description: "浏览 500+ 真实出图案例，把灵感沉淀为可复制的结构化 AI 图像提示词。",
    images: [{ url: absoluteUrl("/images/og-default.png"), width: 1200, height: 630, alt: "iPrompt Studio · AI 图像提示词案例库" }],
  },
  twitter: {
    card: "summary_large_image", title: "iPrompt Studio · AI 图像提示词案例库",
    description: "浏览 500+ 真实出图案例，把灵感沉淀为可复制的结构化 AI 图像提示词。",
    images: [absoluteUrl("/images/og-default.png")],
  },
};

const siteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": siteUrl + "/#website",
      name: siteName,
      url: siteUrl,
      inLanguage: "zh-CN",
      description: "面向 AI 图像创作的可检索提示词案例库，提供模型、分类、案例说明与完整提示词。",
      publisher: { "@id": siteUrl + "/#organization" },
      potentialAction: {
        "@type": "SearchAction",
        target: siteUrl + "/explore?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": siteUrl + "/#organization",
      name: siteName,
      url: siteUrl,
      description: "整理与结构化 AI 图像生成案例提示词的中文内容站点。",
    },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd).replace(/</g, "\u003c") }} />
        <SiteNav />
        <main className="flex-1 w-full site-shell py-8 md:py-12">{children}</main>
        <footer className="border-t border-line mt-16">
          <div className="site-shell py-7 flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
            <span className="eyebrow text-[10px]">A quiet space for prompts</span>
            <span className="text-xs text-ink-mute">iPrompt Studio · 2026</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
