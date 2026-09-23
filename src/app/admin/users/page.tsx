import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/session";
import { AdminConsole } from "@/components/AdminConsole";

export const metadata: Metadata = {
  title: "管理后台",
  robots: { index: false, follow: false },
};

/** 管理后台:用户审核 + 邀请码;仅 admin */
export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/");

  return <AdminConsole />;
}
