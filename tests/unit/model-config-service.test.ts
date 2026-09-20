// 模型注册服务单测：内存假 Provider，覆盖筛选/默认模型/分类映射/缓存
import { describe, it, expect, vi } from "vitest";
import {
  createModelConfigService,
  type ModelRow,
  type CategoryRow,
} from "@/server/services/model-config-service";

const models: ModelRow[] = [
  { id: "gpt-image-2", name: "GPT-Image-2", active: true, isDefault: true, sortOrder: 1 },
  { id: "nano-banana", name: "Nano Banana Pro", active: false, isDefault: false, sortOrder: 2 },
  { id: "doubao-seedream", name: "豆包 Seedream", active: true, isDefault: false, sortOrder: 0 },
];

const categories: CategoryRow[] = [
  { modelId: "gpt-image-2", name: "人像", rawAliases: ["📷 摄影与写实"], sortOrder: 2 },
  { modelId: "gpt-image-2", name: "产品静物", rawAliases: ["🛍️ 商品与电商", "🏷️ 品牌与标志"], sortOrder: 1 },
  { modelId: "gpt-image-2", name: "更多", rawAliases: ["未分类"], sortOrder: 6 },
  { modelId: "nano-banana", name: "别家的分类", rawAliases: [], sortOrder: 1 },
];

function fakeProvider(calls: { models: number; categories: number }) {
  return {
    calls,
    async findModels() {
      calls.models += 1;
      return models.map((m) => ({ ...m }));
    },
    async findCategories(modelId: string) {
      calls.categories += 1;
      return categories.filter((c) => c.modelId === modelId).map((c) => ({ ...c }));
    },
  };
}

describe("model-config-service", () => {
  it("getActiveModels 只返回 active 并按 sortOrder 升序", async () => {
    const calls = { models: 0, categories: 0 };
    const svc = createModelConfigService(fakeProvider(calls));
    const list = await svc.getActiveModels();
    expect(list.map((m) => m.id)).toEqual(["doubao-seedream", "gpt-image-2"]);
  });

  it("注册行缺字段时快速失败（zod 校验）", async () => {
    const bad = [{ id: "x", name: "", active: true, isDefault: false, sortOrder: 1 }];
    const svc = createModelConfigService({
      async findModels() {
        return bad;
      },
      async findCategories() {
        return [];
      },
    });
    await expect(svc.getActiveModels()).rejects.toThrow(/name/i);
  });

  it("getDefaultModelId 优先 isDefault；无 isDefault 取第一个 active；空表回退常量", async () => {
    const svc = createModelConfigService(fakeProvider({ models: 0, categories: 0 }));
    await expect(svc.getDefaultModelId()).resolves.toBe("gpt-image-2");

    const noDefault = createModelConfigService({
      async findModels() {
        return models.map((m) => ({ ...m, isDefault: false }));
      },
      async findCategories() {
        return [];
      },
    });
    await expect(noDefault.getDefaultModelId()).resolves.toBe("doubao-seedream");

    const empty = createModelConfigService({
      async findModels() {
        return [];
      },
      async findCategories() {
        return [];
      },
    });
    await expect(empty.getDefaultModelId()).resolves.toBe("gpt-image-2"); // fallbackModelId 常量
  });

  it("getCategories 只返回该模型并按 sortOrder 升序", async () => {
    const svc = createModelConfigService(fakeProvider({ models: 0, categories: 0 }));
    const list = await svc.getCategories("gpt-image-2");
    expect(list.map((c) => c.name)).toEqual(["产品静物", "人像", "更多"]);
    expect(list[0].rawAliases).toContain("🛍️ 商品与电商");
  });

  it("resolveModelId：合法入参原样返回，非法入参回默认模型", async () => {
    const svc = createModelConfigService(fakeProvider({ models: 0, categories: 0 }));
    await expect(svc.resolveModelId("gpt-image-2")).resolves.toBe("gpt-image-2");
    await expect(svc.resolveModelId("nano-banana")).resolves.not.toBe("nano-banana"); // inactive → 默认
    await expect(svc.resolveModelId(undefined)).resolves.toBe("gpt-image-2");
    await expect(svc.resolveModelId("hack")).resolves.toBe("gpt-image-2");
  });

  it("TTL 内 provider 只调用一次；invalidate 后重新拉取", async () => {
    const calls = { models: 0, categories: 0 };
    const svc = createModelConfigService(fakeProvider(calls), { ttlMs: 60_000 });
    await svc.getActiveModels();
    await svc.getActiveModels();
    await svc.getCategories("gpt-image-2");
    await svc.getCategories("gpt-image-2");
    expect(calls.models).toBe(1);
    expect(calls.categories).toBe(1);

    svc.invalidate();
    await svc.getActiveModels();
    expect(calls.models).toBe(2);
  });
});
