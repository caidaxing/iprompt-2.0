import { SubscribeForm } from "@/components/SubscribeForm";

export const metadata = { title: "AI 匹配 · 即将上线", robots: { index: false, follow: false } };

/** AI 匹配占位页（PRD F6 / §3.3）：视觉延续 + 邮箱订阅收集 */
export default function MatchPage() {
  return (
    <div className="max-w-3xl mx-auto py-8 md:py-14">
      <div className="text-center mb-10">
      <p className="eyebrow text-[11px] mb-6">AI MATCHING / COMING SOON</p>
      <h1 className="serif-title text-4xl md:text-5xl leading-snug mb-5">从一句想法开始</h1>
      <p className="text-sm text-ink-soft leading-relaxed mb-6">
        描述你想要的画面，AI 将自动匹配相近案例、
        <br />
        生成结构化的中英双语提示词。
      </p>
      <span className="inline-block text-xs px-4 py-1 border border-line rounded-full text-ink-mute mb-10">
        即将上线
      </span>
      </div>

      {/* 输入框置灰示意（一期不做全流程） */}
      <div className="paper-panel p-3 mb-6">
        <textarea
          disabled
          placeholder="例：一只放在雨窗边的青花瓷瓶，自然光，胶片质感…"
          className="w-full h-28 bg-transparent border border-line px-4 py-3 text-sm placeholder:text-ink-mute resize-none cursor-not-allowed"
        />
        <div className="flex flex-wrap gap-2 px-2 pt-3">
          {['产品静物', '东方美学', '电影感'].map((tag) => <span key={tag} className="text-[11px] border border-line px-3 py-1 text-ink-soft">{tag}</span>)}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 md:gap-5 mb-12 text-center">
        {['解析需求', '提取元素', '匹配案例', '生成提示词'].map((step, i) => <div key={step} className="relative"><span className={`mx-auto mb-3 w-8 h-8 flex items-center justify-center border text-xs ${i === 0 ? 'bg-moss text-paper border-moss' : 'border-line'}`}>0{i + 1}</span><p className="serif-title text-sm">{step}</p>{i < 3 && <span className="hidden md:block absolute top-4 left-[60%] w-[80%] h-px bg-line" />}</div>)}
      </div>

      <p className="text-sm text-ink-soft mb-3">上线前先留个邮箱，第一时间通知你：</p>
      <div className="flex justify-center">
        <SubscribeForm />
      </div>
    </div>
  );
}
