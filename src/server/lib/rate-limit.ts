// 进程内限流器（开发期足够；多实例部署时换 Redis）
interface Entry {
  count: number;
  resetAt: number;
  blockedUntil?: number;
}

const store = new Map<string, Entry>();

/** 窗口计数：windowMs 内最多 max 次 */
export function hit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= max;
}

/** 记录失败；连续 failLimit 次后封禁 blockMs */
export function recordFailure(key: string, failLimit: number, blockMs: number): void {
  const now = Date.now();
  const entry = store.get(key) ?? { count: 0, resetAt: now + blockMs };
  entry.count += 1;
  if (entry.count >= failLimit) {
    entry.blockedUntil = now + blockMs;
    entry.count = 0;
  }
  store.set(key, entry);
}

export function isBlocked(key: string): boolean {
  const entry = store.get(key);
  return !!entry?.blockedUntil && entry.blockedUntil > Date.now();
}

export function reset(key: string): void {
  store.delete(key);
}

/** 仅测试用 */
export function __clearAll(): void {
  store.clear();
}
