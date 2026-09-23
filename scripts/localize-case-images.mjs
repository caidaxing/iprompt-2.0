// 案例图本地化下载器:远程图 → public/images/cases/localized/<modelId>/<num><ext>
// 可断点续传(跳过已存在且 >1KB 的文件);并发 8;单张重试 2 次;失败记录清单
import { mkdirSync, writeFileSync, existsSync, statSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";

// 用法:node scripts/localize-case-images.mjs <rows.json>
// rows.json 由 sqlite3 -json 导出:[{modelId, num, image}, ...]
const ROWS_FILE = process.argv[2];
if (!ROWS_FILE) throw new Error("用法:node scripts/localize-case-images.mjs <rows.json>");
const OUT_ROOT = "public/images/cases/localized";
const MANIFEST = ".backup/image-localization-manifest.json";
const CONCURRENCY = 8;
const TIMEOUT_MS = 30000;
const RETRIES = 2;

const rows = JSON.parse(readFileSync(ROWS_FILE, "utf8"));

const ext = (url) => {
  const m = url.split("?")[0].match(/\.(jpe?g|png|webp|gif)$/i);
  return m ? m[1].toLowerCase() : "jpg";
};

// 去重:同一 URL 只下载一次,其余案例复用首张路径
const urlMap = new Map(); // url → { path, cases: [] }
const tasks = [];
for (const r of rows) {
  const rel = `cases/localized/${r.modelId}/${r.num}.${ext(r.image)}`;
  if (urlMap.has(r.image)) {
    urlMap.get(r.image).cases.push(rel);
    continue;
  }
  const entry = { url: r.image, path: rel, cases: [rel] };
  urlMap.set(r.image, entry);
  tasks.push(entry);
}

mkdirSync(OUT_ROOT, { recursive: true });
mkdirSync(dirname(MANIFEST), { recursive: true });

let ok = 0,
  skip = 0,
  fail = 0,
  done = 0;
const failures = [];
const urlToPath = new Map(); // 下载成功/已存在的 url → 落盘相对路径

async function fetchOne(url, dest) {
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1000) throw new Error("too small " + buf.length);
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, buf);
      return buf.length;
    } catch (e) {
      if (attempt === RETRIES) throw e;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
}

async function worker(queue) {
  while (queue.length) {
    const entry = queue.shift();
    const dest = join(OUT_ROOT, entry.path.replace("cases/localized/", ""));
    done++;
    try {
      if (existsSync(dest) && statSync(dest).size > 1000) {
        skip++;
        ok++;
        urlToPath.set(entry.url, entry.path);
      } else {
        const size = await fetchOne(entry.url, dest);
        ok++;
        urlToPath.set(entry.url, entry.path);
        if (done % 50 === 0)
          console.log(`进度 ${done}/${tasks.length} ok=${ok} skip=${skip} fail=${fail} 最新=${(size / 1024).toFixed(0)}KB`);
      }
    } catch (e) {
      fail++;
      failures.push({ url: entry.url, err: String(e.message || e).slice(0, 120) });
    }
  }
}

const queue = [...tasks];
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)));

// 主案例路径映射(URL → 首个案例的落盘路径),供后续 DB 更新
const mapping = rows
  .map((r) => ({ modelId: r.modelId, num: r.num, url: r.image, path: urlToPath.get(r.image) || null }))
  .filter((m) => m.path);

writeFileSync(MANIFEST, JSON.stringify({ total: tasks.length, ok, skip, fail, failures, mapping }, null, 1));
console.log(`完成:任务 ${tasks.length},成功 ${ok}(含跳过 ${skip}),失败 ${fail}`);
console.log(`清单: ${MANIFEST}`);
