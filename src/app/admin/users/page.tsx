import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { AdminUsers } from "@/components/AdminUsers";

export const metadata = {
  title: "用户审核",
  robots: { index: false, follow: false },
};

/** 超管用户管理：服务端守卫，非 admin 直接跳登录 */
export default async function AdminUsersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/");

  return <AdminUsers />;
}
