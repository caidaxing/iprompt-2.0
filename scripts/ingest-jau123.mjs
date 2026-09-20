// 生态语料适配器：jau123/nanobanana-trending-prompts → gpt-image-2 附加案例
// 输入：data/sources/gpt-image-2/jau123-prompts.json（原样抓取）+ .ingest-work 分类（LLM 打标）
// 输出：data/sources/gpt-image-2/jau123-gptimage.json（统一中间格式，num = 1000 + rank）
// 用法：node scripts/ingest-jau123.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const SOURCE_REPO = "jau123/nanobanana-trending-prompts";

const raw = JSON.parse(fs.readFileSync(path.join(root, "data", "sources", "gpt-image-2", "jau123-prompts.json"), "utf8"));
const gptimage = raw.filter((x) => x.model === "gptimage");

// LLM 分类结果（rank → [中文标题, 类型标签 slug]）
const clsDir = path.join(root, "data", "sources", "gpt-image-2");
const cls = {};
for (const f of fs.readdirSync(clsDir).filter((f) => /^jau123-classification.json$/.test(f))) {
  Object.assign(cls, JSON.parse(fs.readFileSync(path.join(clsDir, f), "utf8")));
}

// 类型 slug → 显示名（与 Tag 种子一致）
const TYPE_NAMES = {
  "portrait-photography": "人像摄影",
  "ecommerce-ads": "电商广告",
  "poster-illustration": "海报插画",
  "character-design": "角色手办",
  "ui-social": "UI与社媒",
  "photo-editing": "编辑修复",
  "style-transfer": "风格迁移",
  "interior-design": "室内设计",
  "education-infographic": "教育信息图",
  workplace: "职场生产力",
  "video-prompt": "视频提示词",
  "fun-social": "日常趣味",
};

// 去重：与现有库 + 批内
const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
const existing = JSON.parse(fs.readFileSync(path.join(root, "data", "cases-gpt-image-2.json"), "utf8")).cases;
const existHashes = new Set(existing.map((c) => norm(c.prompt)));

const seen = new Set();
const out = [];
const skipped = { noTitle: [], dupExisting: 0, dupSelf: 0 };

for (const item of gptimage.sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))) {
  const c = cls[item.rank];
  if (!c) {
    skipped.noTitle.push(item.rank);
    continue;
  }
  const [title, typeSlug] = c;
  const typeName = TYPE_NAMES[typeSlug];
  if (!typeName) throw new Error(`未知类型 slug：${typeSlug}（rank ${item.rank}）`);

  const h = norm(item.prompt);
  if (existHashes.has(h)) {
    skipped.dupExisting++;
    continue;
  }
  if (seen.has(h)) {
    skipped.dupSelf++;
    continue;
  }
  seen.add(h);

  out.push({
    num: 1000 + item.rank,
    title,
    category: typeName,
    source: item.author_name ? `@${item.author_name}` : item.author || "",
    sourceRepo: SOURCE_REPO,
    image: item.image || "",
    prompt: item.prompt,
    typeTag: typeName,
    // 热度数据暂存备注字段之外：likes/views 不入 Case，未来需要再加列
    meta: { likes: item.likes ?? null, views: item.views ?? null, rank: item.rank ?? null },
  });
}

if (out.length === 0) throw new Error("没有可入库的语料");
const outPath = path.join(root, "data", "sources", "gpt-image-2", "jau123-gptimage.json");
fs.writeFileSync(
  outPath,
  JSON.stringify(
    {
      meta: { source: SOURCE_REPO, generatedAt: new Date().toISOString().slice(0, 10), total: out.length, numRange: [1000, 1000 + itemMaxRank(out)] },
      cases: out,
    },
    null,
    2,
  ) + "\n",
);

function itemMaxRank(cases) {
  return Math.max(...cases.map((c) => c.num - 1000));
}

console.log(`✓ 输出 ${out.length} 条 → ${path.relative(root, outPath)}`);
console.log(`  跳过：无分类 ${skipped.noTitle.join(",") || "无"} | 与现有库重复 ${skipped.dupExisting} | 批内重复 ${skipped.dupSelf}`);
