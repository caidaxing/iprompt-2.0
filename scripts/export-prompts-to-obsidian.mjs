// 把 data/cases.json 的 541 条提示词按分类导出为 Obsidian 笔记
// 用法：node scripts/export-prompts-to-obsidian.mjs <vault目标目录>
// 输出：<目标目录>/NN-分类名.md × 14 + 提示词库索引.md
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const outDir = process.argv[2];
if (!outDir) {
  console.error("用法：node scripts/export-prompts-to-obsidian.mjs <vault目标目录>");
  process.exit(1);
}

const source = JSON.parse(fs.readFileSync(path.join(root, "data", "cases-gpt-image-2.json"), "utf8"));
const today = new Date().toISOString().slice(0, 10);

// 去掉分类名的 emoji 前缀（如 "🧩 UI与界面" → "UI与界面"），未分类固定排最后
const stripEmoji = (name) => name.replace(/^[^\p{L}\p{N}]+/u, "").trim();
const orderedCats = [
  ...source.categories.map(stripEmoji).filter((c) => c !== "未分类"),
  "未分类",
];

const byCat = new Map(orderedCats.map((c) => [c, []]));
for (const c of source.cases) {
  const cat = stripEmoji(c.category);
  if (!byCat.has(cat)) throw new Error(`未知分类：${c.category}`);
  byCat.get(cat).push(c);
}
for (const list of byCat.values()) list.sort((a, b) => a.num - b.num);

const total = source.cases.length;
if (total !== 541) throw new Error(`预期 541 条，实际 ${total}`);

fs.mkdirSync(outDir, { recursive: true });

const pad = (n) => String(n).padStart(3, "0");
const fence = (text) => (text.includes("```") ? "````text" : "```text");

const noteFiles = [];
orderedCats.forEach((cat, i) => {
  const cases = byCat.get(cat);
  const fileNum = String(i + 1).padStart(2, "0");
  const fileName = `${fileNum}-${cat}.md`;

  const body = cases
    .map((c) => {
      const close = c.prompt.includes("```") ? "````" : "```";
      return [
        `## No.${pad(c.num)} ${c.title.replace(/\n/g, " ")}`,
        ...(c.source ? [`来源：${c.source}`] : []),
        ...(c.image ? [`[原始出图](${c.image})`] : []),
        "",
        fence(c.prompt),
        c.prompt,
        close,
        "",
        "---",
        "",
      ].join("\n");
    })
    .join("\n");

  const note = [
    "---",
    `分类: ${cat}`,
    `案例数: ${cases.length}`,
    `更新: ${today}`,
    "数据源: freestylefly/awesome-gpt-image-2（MIT）",
    "---",
    "",
    `# ${cat} · ${cases.length} 条提示词`,
    "",
    `> [[提示词库索引]] · 共 ${total} 条`,
    "",
    body,
  ].join("\n");

  fs.writeFileSync(path.join(outDir, fileName), note, "utf8");
  noteFiles.push({ fileName, cat, count: cases.length });
  console.log(`✓ ${fileName}（${cases.length} 条）`);
});

const rows = noteFiles
  .map(({ fileName, cat, count }) => {
    const link = fileName.replace(/\.md$/, "");
    return `| [[${link}\\|${cat}]] | ${count} |`;
  })
  .join("\n");

const index = [
  "---",
  `更新: ${today}`,
  `总数: ${total}`,
  "数据源: freestylefly/awesome-gpt-image-2（MIT）",
  "---",
  "",
  "# 提示词库索引",
  "",
  `> 共 **${total}** 条完整提示词 / ${noteFiles.length} 个分类，对应 iPrompt Studio 线上案例编号（No.001–544，上游缺号除外）。`,
  "> 提示词均为英文原文，可直接粘贴到 GPT-Image-2 使用；`{argument name=...}` 是可替换的模板变量。",
  "",
  "| 分类 | 条数 |",
  "|---|---|",
  rows,
  "",
  "---",
  "",
  "相关：[[iPrompt Studio 项目目录]]",
  "",
].join("\n");

fs.writeFileSync(path.join(outDir, "提示词库索引.md"), index, "utf8");
console.log(`✓ 提示词库索引.md（共 ${total} 条）`);
