import type { NextConfig } from "next";

// 构建期自检:生产构建必须显式声明对外地址。
// 放在这里而不是 src/lib/site.ts —— 后者会进入服务器运行时,抛错会导致线上整站不可用。
// 该值在构建期被内联,改后必须重新 build 才生效。
if (!process.env.NEXT_PUBLIC_SITE_URL) {
  throw new Error(
    "[seo] 缺少 NEXT_PUBLIC_SITE_URL。请在 .env 中设置为用户真实访问的绝对地址(含协议、不带尾斜杠),否则 canonical / sitemap 会指向错误地址。",
  );
}

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  compress: true,
  experimental: {
    cpus: 1,
  },
};

export default nextConfig;
