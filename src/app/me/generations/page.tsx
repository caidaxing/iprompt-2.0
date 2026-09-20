import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/session";
import { MyGenerations } from "@/components/MyGenerations";

export const metadata: Metadata = {
  title: "我的作品",
  robots: { index: false, follow: false },
};

/** 我的作品:仅登录用户可见,数据接口按会话隔离 */
export default async function MyGenerationsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return <MyGenerations />;
}
