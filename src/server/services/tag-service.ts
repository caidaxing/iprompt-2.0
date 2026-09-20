// 标签服务：标签列表（附案例计数）与多选参数解析
// 依赖通过参数注入（Provider），便于单测替换；进程内缓存与模型注册服务同模式
import { z } from "zod";

export const tagRowSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  kind: z.string().min(1),
  sortOrder: z.number().int(),
});

export type TagRow = z.infer<typeof tagRowSchema>;

export interface TagWithCount extends TagRow {
  count: number;
}

export interface TagProvider {
  findTags(kind?: string): Promise<unknown[]>;
  /** tagSlug → 案例数（可按 kind 过滤） */
  countCasesByTag(kind?: string): Promise<Record<string, number>>;
}

export interface TagService {
  /** 某类标签 + 案例计数；minCount 过滤零计数标签 */
  listTags(kind?: string, opts?: { minCount?: number }): Promise<TagWithCount[]>;
  /** 多选参数解析："a,b" → 合法 slug 数组（未知 slug 静默剔除，避免脏 URL 清空结果） */
  resolveTagSlugs(input?: string): Promise<string[]>;
  invalidate(): void;
}

function parseRows(rows: unknown[], what: string): TagRow[] {
  return rows.map((row, i) => {
    const result = tagRowSchema.safeParse(row);
    if (!result.success) {
      const issue = result.error.issues[0];
      throw new Error(`标签数据不合法（${what}[${i}].${issue.path.join(".")}）：${issue.message}`);
    }
    return result.data;
  });
}

export function createTagService(
  provider: TagProvider,
  opts: { ttlMs?: number } = {},
): TagService {
  const ttlMs = opts.ttlMs ?? 60_000;
  const cache = new Map<string, { data: unknown; expiresAt: number }>();

  async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    const hit = cache.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.data as T;
    const data = await load();
    cache.set(key, { data, expiresAt: Date.now() + ttlMs });
    return data;
  }

  const loadTags = (kind?: string) =>
    cached(`tags:${kind ?? "*"}`, async () => parseRows(await provider.findTags(kind), `Tag(${kind ?? "*"})`));
  const loadCounts = (kind?: string) =>
    cached(`counts:${kind ?? "*"}`, async () => provider.countCasesByTag(kind));

  return {
    async listTags(kind, opts) {
      const [rows, counts] = await Promise.all([loadTags(kind), loadCounts(kind)]);
      const list = rows
        .map((t) => ({ ...t, count: counts[t.slug] ?? 0 }))
        .sort((a, b) => a.sortOrder - b.sortOrder || b.count - a.count || a.name.localeCompare(b.name));
      const minCount = opts?.minCount ?? 0;
      return minCount > 0 ? list.filter((t) => t.count >= minCount) : list;
    },

    async resolveTagSlugs(input) {
      const wanted = (input ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (wanted.length === 0) return [];
      const known = new Set((await loadTags()).map((t) => t.slug));
      return [...new Set(wanted)].filter((slug) => known.has(slug));
    },

    invalidate() {
      cache.clear();
    },
  };
}
