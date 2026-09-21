import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { NavAuth } from "@/components/NavAuth";

/** 全站导航（PRD §4）：Logo | 案例浏览 / AI 匹配 / ♥ 收藏 / 登录或头像 */
export async function SiteNav() {
  const user = await getSessionUser();
  return (
    <header className="border-b border-line/80 bg-paper/85 backdrop-blur-md sticky top-0 z-40">
      <nav className="site-shell h-[4.5rem] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <span className="w-7 h-7 border border-ink flex items-center justify-center text-[9px] leading-none group-hover:bg-ink group-hover:text-paper transition-colors">印<br/>象</span>
          <span className="serif-title text-[17px] tracking-wide">iPrompt Studio</span>
        </Link>
        <div className="flex items-center gap-4 md:gap-7 text-[13px]">
          <Link href="/explore" className="relative py-2 hover:text-sage-deep transition-colors after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-px after:bg-ink after:scale-x-0 hover:after:scale-x-100 after:transition-transform">
            案例库
          </Link>
          <Link href="/studio" className="relative py-2 hover:text-sage-deep transition-colors after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-px after:bg-ink after:scale-x-0 hover:after:scale-x-100 after:transition-transform">
            AI 工作台
          </Link>
          <Link href="/compare" className="relative py-2 hover:text-sage-deep transition-colors after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-px after:bg-ink after:scale-x-0 hover:after:scale-x-100 after:transition-transform">
            2.5 对比
          </Link>
          <Link href="/templates" className="relative py-2 hover:text-sage-deep transition-colors after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-px after:bg-ink after:scale-x-0 hover:after:scale-x-100 after:transition-transform">
            模板库
          </Link>
          <Link href="/skills" className="hidden sm:block relative py-2 hover:text-sage-deep transition-colors after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-px after:bg-ink after:scale-x-0 hover:after:scale-x-100 after:transition-transform">
            技能
          </Link>
          <Link href="/favorites" className="hidden sm:block relative py-2 hover:text-sage-deep transition-colors after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-px after:bg-ink after:scale-x-0 hover:after:scale-x-100 after:transition-transform">
            ♡ 收藏
          </Link>
          <NavAuth user={user} />
        </div>
      </nav>
    </header>
  );
}
