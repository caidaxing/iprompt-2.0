import { redirect } from "next/navigation";
import { getSessionPayload } from "@/lib/session";
import { prisma } from "@/server/lib/prisma";
import { favoriteCount } from "@/server/services/favorite-service";
import { maskEmail } from "@/lib/categories";
import { NicknameEditor } from "@/components/NicknameEditor";

export const metadata = { title: "我的", robots: { index: false, follow: false } };

export default async function MePage() {
  const session = await getSessionPayload();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!user) redirect("/login");

  const count = await favoriteCount(user.id);

  return (
    <div className="max-w-md mx-auto py-12">
      <p className="eyebrow text-[10px] mb-3 text-center">PROFILE</p>
      <h1 className="serif-title text-2xl text-center mb-10">我的</h1>

      <div className="border border-line rounded-sm p-8 bg-white/40 space-y-6">
        <div className="flex items-center gap-4">
          <span className="w-14 h-14 rounded-full bg-ink text-paper flex items-center justify-center text-xl serif-title">
            {(user.nickname ?? user.email[0]).toUpperCase()}
          </span>
          <div>
            <p className="serif-title text-lg">{user.nickname ?? `用户${user.id.slice(-4)}`}</p>
            <p className="text-sm text-ink-mute">{maskEmail(user.email)}</p>
          </div>
        </div>

        {/* 昵称仅可修改一次（PRD F4） */}
        <NicknameEditor initial={user.nickname} canEdit={!user.nicknameEdited} />

        <div className="flex items-center justify-between text-sm border-t border-line pt-4">
          <span className="text-ink-soft">收藏案例</span>
          <span className="serif-title">{count} 个</span>
        </div>
      </div>
    </div>
  );
}
