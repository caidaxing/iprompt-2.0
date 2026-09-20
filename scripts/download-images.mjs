// 一次性脚本：把 541 案例的出图从 GitHub raw 下载到 public/images/cases/
// 幂等：已存在且非空的文件跳过；并发 8，失败重试 3 次
import { readFile, writeFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "public", "images", "cases");

const data = JSON.parse(await readFile(path.join(ROOT, "data", "cases.json"), "utf-8"));
const cases = data.cases.filter((c) => c.image);

const failures = [];
let done = 0;
let skipped = 0;

async function fetchOne(url, attempt = 1) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1024) throw new Error(`too small: ${buf.length}B`);
    return buf;
  } catch (e) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 1500 * attempt));
      return fetchOne(url, attempt + 1);
    }
    throw e;
  }
}

async function worker(queue) {
  while (queue.length) {
    const c = queue.shift();
    const ext = (c.image.match(/\.(jpg|png)(\?|$)/i)?.[1] ?? "jpg").toLowerCase();
    const local = `case${c.num}.${ext}`;
    const dest = path.join(OUT_DIR, local);
    if (existsSync(dest)) {
      const s = await stat(dest);
      if (s.size > 1024) {
        skipped++;
        done++;
        continue;
      }
    }
    try {
      const buf = await fetchOne(c.image);
      await writeFile(dest, buf);
      c._local = `/images/cases/${local}`;
    } catch (e) {
      failures.push({ num: c.num, url: c.image, err: String(e).slice(0, 120) });
    }
    done++;
    if (done % 50 === 0) console.log(`progress ${done}/${cases.length}`);
  }
}

const queue = [...cases];
await Promise.all(Array.from({ length: 8 }, () => worker(queue)));

await writeFile(path.join(ROOT, "img-local-map.json"), JSON.stringify(
  Object.fromEntries(cases.filter((c) => c._local).map((c) => [c.num, c._local])),
  null, 2
));
if (failures.length) {
  await writeFile(path.join(ROOT, "img-failures.json"), JSON.stringify(failures, null, 2));
}
console.log(`DONE total=${cases.length} ok=${cases.length - failures.length} skipped=${skipped} failed=${failures.length}`);
