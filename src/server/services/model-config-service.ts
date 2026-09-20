// 模型注册服务：读 Model/Category 注册表，供导航/分类 Tab/案例查询解析模型维度
// 依赖通过参数注入（Provider），便于单测替换；注册行经 zod 校验，坏数据启动即暴露
import { z } from "zod";

// ---- 行结构（zod 校验，SQLite 中 rawAliases 为 JSON 字符串，仓储层负责反序列化） ----

export const modelRowSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  active: z.boolean(),
  isDefault: z.boolean(),
  sortOrder: z.number().int(),
});

export const categoryRowSchema = z.object({
  modelId: z.string().min(1),
  name: z.string().min(1),
  rawAliases: z.array(z.string()),
  sortOrder: z.number().int(),
});

export type ModelRow = z.infer<typeof modelRowSchema>;
export type CategoryRow = z.infer<typeof categoryRowSchema>;

// ---- 仓储接口（repositories 层实现，单测用内存假实现） ----

export interface ModelConfigProvider {
  findModels(): Promise<unknown[]>;
  findCategories(modelId: string): Promise<unknown[]>;
}

export interface ModelConfigService {
  /** active 模型，按 sortOrder 升序（导航/筛选 Tab 数据源） */
  getActiveModels(): Promise<ModelRow[]>;
  /** 默认模型 id：isDefault 优先，其次第一个 active；注册表为空时回退 fallbackModelId */
  getDefaultModelId(): Promise<string>;
  /** 某模型的展示分类（分类 Tab），按 sortOrder 升序 */
  getCategories(modelId: string): Promise<CategoryRow[]>;
  /** URL 的 model 参数 → 合法模型 id；非法/未提供时回默认模型 */
  resolveModelId(input?: string): Promise<string>;
  /** 清空缓存（测试用） */
  invalidate(): void;
}

function parseRows<T>(schema: z.ZodType<T>, rows: unknown[], what: string): T[] {
  return rows.map((row, i) => {
    const result = schema.safeParse(row);
    if (!result.success) {
      const issue = result.error.issues[0];
      throw new Error(`模型注册数据不合法（${what}[${i}].${issue.path.join(".")}）：${issue.message}`);
    }
    return result.data;
  });
}

export function createModelConfigService(
  provider: ModelConfigProvider,
  opts: { ttlMs?: number; fallbackModelId?: string } = {},
): ModelConfigService {
  const ttlMs = opts.ttlMs ?? 60_000;
  const fallbackModelId = opts.fallbackModelId ?? "gpt-image-2";

  const cache = new Map<string, { data: unknown; expiresAt: number }>();

  async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    const hit = cache.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.data as T;
    const data = await load();
    cache.set(key, { data, expiresAt: Date.now() + ttlMs });
    return data;
  }

  const loadModels = () =>
    cached("models", async () => parseRows(modelRowSchema, await provider.findModels(), "Model"));
  const loadCategories = (modelId: string) =>
    cached(`cats:${modelId}`, async () =>
      parseRows(categoryRowSchema, await provider.findCategories(modelId), `Category(${modelId})`),
    );

  return {
    async getActiveModels() {
      const models = await loadModels();
      return models.filter((m) => m.active).sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
    },

    async getDefaultModelId() {
      const active = await this.getActiveModels();
      return active.find((m) => m.isDefault)?.id ?? active[0]?.id ?? fallbackModelId;
    },

    async getCategories(modelId) {
      const list = await loadCategories(modelId);
      return [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    },

    async resolveModelId(input) {
      if (input) {
        const active = await this.getActiveModels();
        if (active.some((m) => m.id === input)) return input;
      }
      return this.getDefaultModelId();
    },

    invalidate() {
      cache.clear();
    },
  };
}
