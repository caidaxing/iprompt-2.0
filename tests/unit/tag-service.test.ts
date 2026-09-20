// 标签服务单测：内存假 Provider，覆盖标签列表/计数/多选解析/缓存
import { describe, it, expect } from "vitest";
import { createTagService, type TagRow } from "@/server/services/tag-service";

const tags: TagRow[] = [
  { slug: "portrait-photography", name: "人像摄影", kind: "type", sortOrder: 1 },
  { slug: "ecommerce-ads", name: "电商广告", kind: "type", sortOrder: 2 },
  { slug: "poster-illustration", name: "海报插画", kind: "type", sortOrder: 3 },
  { slug: "video-prompt", name: "视频提示词", kind: "type", sortOrder: 11 },
  { slug: "cinematic", name: "电影感", kind: "style", sortOrder: 1 },
];

const counts: Record<string, number> = {
  "portrait-photography": 78,
  "ecommerce-ads": 66,
  "poster-illustration": 185,
  "cinematic": 12,
};

function fakeProvider(calls: { tags: number; counts: number }) {
  return {
    calls,
    async findTags(kind?: string) {
      calls.tags += 1;
      return tags.filter((t) => !kind || t.kind === kind).map((t) => ({ ...t }));
    },
    async countCasesByTag(kind?: string) {
      calls.counts += 1;
      const kindSlugs = new Set(tags.filter((t) => !kind || t.kind === kind).map((t) => t.slug));
      return Object.fromEntries(Object.entries(counts).filter(([slug]) => kindSlugs.has(slug)));
    },
  };
}

describe("tag-service", () => {
  it("listTags 按 kind 过滤并附带案例计数，零计数标签可通过 minCount 过滤", async () => {
    const calls = { tags: 0, counts: 0 };
    const svc = createTagService(fakeProvider(calls));

    const all = await svc.listTags("type");
    expect(all.map((t) => t.slug)).toEqual([
      "portrait-photography",
      "ecommerce-ads",
      "poster-illustration",
      "video-prompt",
    ]);
    expect(all.find((t) => t.slug === "poster-illustration")?.count).toBe(185);

    const visible = await svc.listTags("type", { minCount: 1 });
    expect(visible.map((t) => t.slug)).toEqual(["portrait-photography", "ecommerce-ads", "poster-illustration"]);

    const styles = await svc.listTags("style");
    expect(styles.map((t) => t.slug)).toEqual(["cinematic"]);
  });

  it("解析多选 tags 参数：逗号分隔、剔除未知 slug", async () => {
    const svc = createTagService(fakeProvider({ tags: 0, counts: 0 }));
    await expect(svc.resolveTagSlugs("portrait-photography,interior-design")).resolves.toEqual([
      "portrait-photography",
    ]);
    await expect(svc.resolveTagSlugs(undefined)).resolves.toEqual([]);
    await expect(svc.resolveTagSlugs("")).resolves.toEqual([]);
  });

  it("TTL 内 provider 只调用一次；invalidate 后重新拉取", async () => {
    const calls = { tags: 0, counts: 0 };
    const svc = createTagService(fakeProvider(calls), { ttlMs: 60_000 });
    await svc.listTags("type");
    await svc.listTags("type");
    expect(calls.tags).toBe(1);
    expect(calls.counts).toBe(1);

    svc.invalidate();
    await svc.listTags("type");
    expect(calls.tags).toBe(2);
  });
});
