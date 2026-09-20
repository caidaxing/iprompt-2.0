import Link from "next/link";
import { redirect } from "next/navigation";
import { CaseCard } from "@/components/CaseCard";
import { getSessionUser } from "@/lib/session";
import { listFavorites } from "@/server/services/favorite-service";

export const metadata = { title: "我的收藏", robots: { index: false, follow: false } };

export default async function FavoritesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login"); // 登录才可用（PRD F3）

  const items = await listFavorites(user.id);

  return (
    <div>
      <p className="eyebrow text-[10px] mb-3">COLLECTION</p>
      <h1 className="serif-title text-2xl mb-8">我的收藏</h1>

      {items.length === 0 ? (
        /* 空态引导（PRD F3） */
        <div className="text-center py-24">
          <p className="eyebrow text-xs mb-4">EMPTY</p>
          <p className="serif-title text-2xl mb-2">还没有收藏任何案例</p>
          <p className="text-sm text-ink-soft mb-6">浏览案例时点击 ♥，把喜欢的灵感存进来</p>
          <Link
            href="/explore"
            className="inline-block bg-ink text-paper text-sm px-6 py-2.5 rounded-sm hover:opacity-85 transition-opacity"
          >
            去逛逛案例 →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {items.map(({ case: c }) => (
            <CaseCard key={c.num} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}
