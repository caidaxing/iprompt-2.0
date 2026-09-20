import manifest from "../../data/cases-prompt-revisions-48.json";
import type { CaseSummary } from "@/server/services/case-service";

export type CuratedRole = "main" | "backup";

export interface CuratedGroup {
  sceneType: string;
  main: CaseSummary[];
  backup: CaseSummary[];
}

export function getCuratedCaseNumbers(): number[] {
  return manifest.cases.map((item) => item.num);
}

export function groupCuratedCases(cases: readonly CaseSummary[]): CuratedGroup[] {
  const byNum = new Map(cases.map((item) => [item.num, item]));
  const resolve = (num: number) => byNum.get(num);
  const present = (item: CaseSummary | undefined): item is CaseSummary => Boolean(item);

  return manifest.groups
    .map((group) => ({
      sceneType: group.sceneType,
      main: group.main.map(resolve).filter(present),
      backup: group.backup.map(resolve).filter(present),
    }))
    .filter((group) => group.main.length > 0 || group.backup.length > 0);
}
