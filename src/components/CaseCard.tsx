import Link from "next/link";
import { CaseImage } from "@/components/CaseImage";
import type { CaseSummary } from "@/server/services/case-service";

/** 案例缩略卡（网格用） */
export function CaseCard({ c }: { c: CaseSummary }) {
  return (
    <Link href={`/case/${c.num}?model=${encodeURIComponent(c.modelId)}`} className="group block border-b border-line pb-4 hover:border-ink transition-colors">
      <div className="image-frame aspect-[4/3] mb-3">
        <CaseImage src={c.image} alt={c.title} num={c.num} className="w-full h-full" />
      </div>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <p className="eyebrow text-[9px]">No.{String(c.num).padStart(3, "0")}</p>
        <p className="text-[10px] text-ink-mute truncate">
          {c.sourceRepo ? `${c.sourceRepo.split("/").pop()} · ` : ""}
          {c.displayCategory}
        </p>
      </div>
      <div>
        <p className="text-sm serif-title leading-snug line-clamp-2 group-hover:underline underline-offset-2">
          {c.title}
        </p>
      </div>
    </Link>
  );
}
