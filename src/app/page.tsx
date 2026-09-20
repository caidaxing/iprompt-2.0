import Link from "next/link";
import { CaseImage } from "@/components/CaseImage";
import { prisma } from "@/server/lib/prisma";

export default async function LandingPage() {
  // 首页精选：一张主视觉 + 三张小型索引卡，避免首屏只剩一张孤立图片
  const featured = await prisma.case.findMany({
    where: {
      modelId: "gpt-image-2",
      num: { in: [2, 21, 24] },
      image: { not: "" },
      NOT: {
        OR: [
          { prompt: { contains: "**作者**:" } },
          { prompt: { contains: "**来源**:" } },
        ],
      },
    },
    orderBy: { num: "asc" },
    take: 3,
    select: { modelId: true, num: true, title: true, image: true, category: true },
  });
  const supporting = featured.slice(0, 3);

  return (
    <div className="py-3 md:py-6">
      <div className="flex items-center justify-between border-b border-line pb-4 mb-8 text-[10px] tracking-[.16em] text-ink-mute">
        <span>01 / 06 · PROMPT ARCHIVE</span>
        <span className="hidden sm:block">COLLECT · STRUCTURE · CREATE</span>
      </div>

      <section className="grid md:grid-cols-[.82fr_1.18fr] gap-10 lg:gap-16 items-start mb-16">
        <div className="relative pt-5 md:pt-12">
          <p className="eyebrow text-[11px] mb-7">A QUIET SPACE FOR PROMPTS</p>
          <h1 className="serif-title text-[2.55rem] md:text-[4rem] leading-[1.2] tracking-[-.045em] mb-7">
            把灵感变成
            <br />
            可复用的结构化提示词
          </h1>
          <div className="flex items-center gap-4 mb-6"><span className="h-px w-14 bg-vermilion" /><span className="text-[11px] text-ink-mute">541 REAL CASES</span></div>
          <p className="text-sm text-ink-soft leading-[1.9] mb-9 max-w-md">
            从一个想法开始，按分类与关键词找到方向。每一个案例都保留完整提示词，让灵感可以被理解、收藏和再次使用。
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/explore" className="editorial-button editorial-button-dark">探索案例 <span>↗</span></Link>
            <Link href="/match" className="editorial-button editorial-button-light">开始 AI 匹配 <span>→</span></Link>
          </div>
          <p className="hidden md:block absolute -left-8 top-[22rem] text-[10px] tracking-[.25em] text-ink-mute [writing-mode:vertical-rl]">IDEAS · STRUCTURE · IMAGE</p>
        </div>

        <div className="block paper-panel p-3" aria-label="iPrompt Studio 宣传海报">
          <div className="image-frame relative">
            <img
              src="/images/hero-poster-v1.png"
              alt="iPrompt Studio 灵感与结构化提示词宣传海报"
              className="w-full aspect-[16/10] object-cover"
            />
            <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3 text-paper">
              <span className="text-[10px] tracking-[.2em] bg-ink/80 px-2 py-1">iPROMPT STUDIO</span>
              <span className="text-[10px] tracking-[.18em] bg-ink/80 px-2 py-1">VISUAL NOTES</span>
            </div>
          </div>
          <div className="px-1 pt-4">
            <p className="eyebrow text-[10px] mb-1">DEMO POSTER · NOT A CASE</p>
            <p className="serif-title text-lg">让灵感，先有一个安静的起点</p>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center gap-4 mb-5"><h2 className="serif-title text-xl">精选案例</h2><span className="h-px flex-1 bg-line" /><Link href="/explore" className="text-xs text-ink-soft hover:text-ink">查看全部 →</Link></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {supporting.map((item, index) => (
            <Link key={item.num} href={`/case/${item.num}?model=${encodeURIComponent(item.modelId)}`} className="group grid grid-cols-[5rem_1fr] sm:block border-b border-line pb-4">
              <div className="image-frame sm:mb-3"><CaseImage src={item.image} alt={item.title} num={item.num} className="w-full aspect-square sm:aspect-[4/3]" /></div>
              <div className="pl-4 sm:pl-0"><div className="flex items-baseline justify-between gap-2 mb-1"><span className="eyebrow text-[9px]">0{index + 2} / CASE</span><span className="text-[10px] text-ink-mute">{item.category}</span></div><p className="serif-title text-sm leading-snug group-hover:underline underline-offset-2">{item.title}</p></div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
