import type { Metadata } from "next";

/** 登录页是客户端组件，无法直接导出 metadata，用布局层统一注入 noindex */
export const metadata: Metadata = {
  title: "登录",
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
