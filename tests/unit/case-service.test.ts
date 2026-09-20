import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, resolveModelId } = vi.hoisted(() => ({
  prismaMock: {
    case: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      groupBy: vi.fn(),
    },
    tag: { findMany: vi.fn() },
  },
  resolveModelId: vi.fn(),
}));

vi.mock("@/server/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/server/repositories/model-config-repo", () => ({
  getModelConfigService: () => ({ resolveModelId }),
}));

import {
  categoryCounts,
  getCase,
  getNeighbors,
  listCases,
  modelCounts,
} from "@/server/services/case-service";

const hiddenPromptFilter = {
  NOT: {
    OR: [
      { prompt: { contains: "**作者**:" } },
      { prompt: { contains: "**来源**:" } },
    ],
  },
};

describe("case-service hidden prompt metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveModelId.mockResolvedValue("gpt-image-2");
    prismaMock.case.count.mockResolvedValue(1);
    prismaMock.case.findMany.mockResolvedValue([]);
    prismaMock.case.findUnique.mockResolvedValue(null);
    prismaMock.case.findFirst.mockResolvedValue(null);
    prismaMock.case.groupBy.mockResolvedValue([]);
    prismaMock.tag.findMany.mockResolvedValue([]);
  });

  it("列表、详情、邻居与计数都排除含作者或来源标记的提示词", async () => {
    await listCases({});
    await getCase(1);
    await getNeighbors(1);
    await modelCounts();
    await categoryCounts();

    expect(prismaMock.case.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining(hiddenPromptFilter) }),
    );
    expect(prismaMock.case.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining(hiddenPromptFilter) }),
    );
    expect(prismaMock.case.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining(hiddenPromptFilter) }),
    );
    expect(prismaMock.case.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining(hiddenPromptFilter) }),
    );
  });
});
