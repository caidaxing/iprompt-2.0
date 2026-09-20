import { describe, expect, test } from "vitest";
import {
  getCuratedCaseNumbers,
  groupCuratedCases,
} from "@/lib/curated-recommendations";

const summaries = getCuratedCaseNumbers().map((num) => ({
  id: `case-${num}`,
  modelId: "gpt-image-2",
  num,
  title: `案例 ${num}`,
  displayCategory: "更多",
  sourceRepo: null,
  image: `/images/cases/case${num}.jpg`,
  description: "测试案例",
}));

describe("curated recommendations", () => {
  test("groups 48 selected cases into 12 scenes with three mains and one backup", () => {
    const groups = groupCuratedCases(summaries);

    expect(groups).toHaveLength(12);
    expect(groups.every((group) => group.main.length === 3)).toBe(true);
    expect(groups.every((group) => group.backup.length === 1)).toBe(true);
    expect(groups.flatMap((group) => [...group.main, ...group.backup])).toHaveLength(48);
  });

  test("omits a curated case when its image is unavailable", () => {
    const groups = groupCuratedCases(summaries.slice(0, -1));

    expect(groups.flatMap((group) => [...group.main, ...group.backup])).toHaveLength(47);
  });
});
