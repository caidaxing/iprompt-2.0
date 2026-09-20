// 模型注册仓储层：Prisma 实现 + 进程内服务单例（开发热重载复用）
import { prisma } from "@/server/lib/prisma";
import { createModelConfigService, type ModelConfigProvider } from "@/server/services/model-config-service";

export const prismaModelConfigProvider: ModelConfigProvider = {
  async findModels() {
    const rows = await prisma.model.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });
    return rows.map((m) => ({
      id: m.id,
      name: m.name,
      active: m.active,
      isDefault: m.isDefault,
      sortOrder: m.sortOrder,
    }));
  },

  async findCategories(modelId) {
    const rows = await prisma.category.findMany({
      where: { modelId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return rows.map((c) => ({
      modelId: c.modelId,
      name: c.name,
      rawAliases: JSON.parse(c.rawAliases) as string[],
      sortOrder: c.sortOrder,
    }));
  },
};

const globalForModelConfig = globalThis as unknown as {
  modelConfigService?: ReturnType<typeof createModelConfigService>;
};

/** 模型注册服务进程内单例（60s 缓存在服务内） */
export function getModelConfigService() {
  if (!globalForModelConfig.modelConfigService) {
    globalForModelConfig.modelConfigService = createModelConfigService(prismaModelConfigProvider);
  }
  return globalForModelConfig.modelConfigService;
}
