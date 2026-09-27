// gpt-image-2 原创案例(编号 ≤ 541)分类整理:
// 上游 gallery 的分类本身错乱(界面图被标品牌/电商),因此以「标题关键词规则」优先、「上游分类」兜底
// 产出 SQL:更新 displayCategory + 重建 type 标签关联(幂等)
import { readFileSync, writeFileSync } from "node:fs";

const UPSTREAM = JSON.parse(readFileSync(process.argv[2], "utf8"));
const DB_EXPORT = JSON.parse(readFileSync(process.argv[3], "utf8"));
const TAG_EXPORT = JSON.parse(readFileSync(process.argv[4], "utf8"));
const OUT = process.argv[5];

const upstream = UPSTREAM.cases || Object.values(UPSTREAM)[0];
const byId = new Map(upstream.map((c) => [c.id, c]));

// 展示分类 → type 标签 slug
const nameToSlug = new Map(TAG_EXPORT.map((t) => [t.name, t.slug]));

// 标题关键词规则(顺序即优先级):关键词命中的中文展示分类
const RULES = [
  [/界面|交互|样机|UI|App|网页|截图|仪表盘|社媒|直播|小程序/, "UI与社媒"],
  [/角色|人物设定|手办|玩偶|盲盒|娃娃/, "角色手办"],
  [/建筑|空间|室内|户型|客厅/, "室内设计"],
  [/信息图|图表|科普|图解|知识|拆解|文档|出版|手册/, "教育信息图"],
  [/摄影|写实|写真|人像|肖像/, "人像摄影"],
  [/编辑|修复|替换|去除|消除|改背景/, "编辑修复"],
  [/风格迁移|风格转换|变成|转成|改成.*风格/, "风格迁移"],
  [/电商|商品|带货|详情页|产品图|好物/, "电商广告"],
  [/视频|分镜|口播/, "视频提示词"],
  [/海报|排版|字体|插画|艺术|古风|历史|叙事|漫画|贴纸|品牌|标志|logo|LOGO|VI|徽章|名片/, "海报插画"],
];

// 上游英文分类 → 中文展示分类(兜底)
const UPSTREAM_FALLBACK = {
  "UI & Interfaces": "UI与社媒",
  "Charts & Infographics": "教育信息图",
  "Documents & Publishing": "教育信息图",
  "Posters & Typography": "海报插画",
  "Illustration & Art": "海报插画",
  "History & Classical Themes": "海报插画",
  "Scenes & Storytelling": "海报插画",
  "Brand & Logos": "海报插画",
  "Products & E-commerce": "电商广告",
  "Photography & Realism": "人像摄影",
  "Characters & People": "角色手办",
  "Architecture & Spaces": "室内设计",
  "Other Use Cases": "日常趣味",
};
const FALLBACK_NAME = UPSTREAM_FALLBACK["Other Use Cases"];

function classify(title, upstreamCat) {
  for (const [re, tab] of RULES) {
    if (re.test(title)) return { tab, by: "title-rule" };
  }
  const fb = UPSTREAM_FALLBACK[upstreamCat];
  if (fb) return { tab: fb, by: "upstream-fallback" };
  return { tab: FALLBACK_NAME, by: "default" };
}

const sql = [];
const report = [];
let unmatched = 0;

for (const row of DB_EXPORT) {
  const up = byId.get(row.num);
  if (!up) {
    unmatched += 1;
    continue;
  }
  const { tab, by } = classify(row.title, up.category);
  const slug = nameToSlug.get(tab);
  if (!slug) {
    console.error(`无对应标签 slug: ${tab}`);
    continue;
  }
  sql.push(`UPDATE [Case] SET displayCategory='${tab.replace(/'/g, "''")}' WHERE modelId='gpt-image-2' AND num=${row.num};`);
  sql.push(`DELETE FROM CaseTag WHERE caseId=(SELECT id FROM [Case] WHERE modelId='gpt-image-2' AND num=${row.num}) AND tagId IN (SELECT id FROM Tag WHERE kind='type');`);
  sql.push(`INSERT INTO CaseTag (caseId, tagId) SELECT id, '${slug}' FROM [Case] WHERE modelId='gpt-image-2' AND num=${row.num} AND NOT EXISTS (SELECT 1 FROM CaseTag WHERE caseId=[Case].id AND tagId='${slug}');`);
  report.push({ num: row.num, title: row.title, old: row.displayCategory, new: tab, by });
}

writeFileSync(OUT, sql.join("\n") + "\n");
writeFileSync(OUT.replace(/\.sql$/, ".report.json"), JSON.stringify(report, null, 1));
const tabCount = {};
report.forEach((r) => (tabCount[r.new] = (tabCount[r.new] || 0) + 1));
console.log(`整理 ${report.length} 条,未匹配 ${unmatched} 条`);
console.log("新分类分布:", JSON.stringify(tabCount, null, 1));
console.log("SQL 已写入", OUT);
