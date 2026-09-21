import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/session";
import { StudioWorkspace } from "@/components/StudioWorkspace";

export const metadata: Metadata = {
  title: "AI 工作台",
  robots: { index: false, follow: false },
};

/** AI 工作台:登录守卫,未登录直接进登录页(消灭未登录坏空态) */
export default async function StudioPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return <StudioWorkspace />;
}
