import type { MetadataRoute } from "next";
import { prisma } from "@/server/lib/prisma";
import { absoluteUrl } from "@/lib/site";

const hiddenPromptWhere = {
  NOT: {
    OR: [
      { prompt: { contains: "**作者**:" } },
      { prompt: { contains: "**来源**:" } },
    ],
  },
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cases = await prisma.case.findMany({
    where: { image: { not: "" }, ...hiddenPromptWhere },
    select: { modelId: true, num: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  return [
    { url: absoluteUrl("/"), lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/explore"), lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/templates"), lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    ...cases.map((item) => ({
      url: absoluteUrl(`/case/${item.num}?model=${encodeURIComponent(item.modelId)}`),
      lastModified: item.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
