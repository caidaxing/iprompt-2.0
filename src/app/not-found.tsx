import Link from "next/link";

/** 404：案例不存在等（PRD F2） */
export default function NotFound() {
  return (
    <div className="text-center py-24">
      <p className="eyebrow text-xs mb-4">404</p>
      <p className="serif-title text-2xl mb-2">页面去远了</p>
      <p className="text-sm text-ink-soft mb-6">你要找的案例可能不存在，或者已被移走</p>
      <Link href="/explore" className="text-sm underline underline-offset-4 hover:text-ink-soft">
        返回案例浏览
      </Link>
    </div>
  );
}
