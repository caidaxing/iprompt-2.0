import { CaseCard } from "@/components/CaseCard";
import type { CuratedGroup } from "@/lib/curated-recommendations";

export function CuratedRecommendations({ groups }: { groups: CuratedGroup[] }) {
  const backupCount = groups.reduce((count, group) => count + group.backup.length, 0);

  return (
    <section className="mb-16" aria-labelledby="curated-heading">
      <div className="paper-panel p-6 md:p-8 mb-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div>
            <p className="eyebrow text-[10px] mb-3">CURATED REGENERATION · 48 CASES</p>
            <h2 id="curated-heading" className="serif-title text-3xl md:text-4xl mb-3">
              改造推荐
            </h2>
            <p className="text-sm text-ink-soft leading-relaxed max-w-xl">
              从常用到实验性的 12 个视觉场景，先看每类的 3 张主推案例。提示词已做原创化调整，备用案例统一收在下方备用池。
            </p>
          </div>
          <div className="text-xs text-ink-mute md:text-right">
            <p>{groups.length} SCENES</p>
            <p>{groups.reduce((count, group) => count + group.main.length, 0)} MAIN · {backupCount} BACKUP</p>
          </div>
        </div>
      </div>

      <div className="space-y-12">
        {groups.map((group, index) => (
          <section key={group.sceneType} aria-labelledby={`curated-${index}`}>
            <div className="flex items-end justify-between gap-4 border-b border-line pb-3 mb-5">
              <div className="flex items-baseline gap-3">
                <p className="eyebrow text-[10px]">{String(index + 1).padStart(2, "0")}</p>
                <h3 id={`curated-${index}`} className="serif-title text-xl">
                  {group.sceneType}
                </h3>
              </div>
              <p className="text-[10px] text-ink-mute tracking-[0.16em]">
                {group.main.length} MAIN · {group.backup.length} BACKUP
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-5 gap-y-8">
              {group.main.map((c) => (
                <CaseCard key={c.num} c={c} />
              ))}
            </div>

            <div className="mt-5 flex items-center gap-3 text-xs text-ink-mute">
              <span className="h-px w-8 bg-line" />
              <span>备用案例 · {group.backup[0]?.title ?? "待补充"}</span>
              {group.backup[0] && <span className="eyebrow text-[9px]">No.{String(group.backup[0].num).padStart(3, "0")}</span>}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
