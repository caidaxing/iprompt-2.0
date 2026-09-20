// 案例数据导入脚本（幂等：按 modelId+num upsert，可重复执行）
// 配置驱动：遍历 Model 注册表 active 模型 → 读各自 dataSource → 按 Category.rawAliases 映射展示分类
// 用法：node scripts/import-cases.mjs [dataSource 路径，可选：只导入 dataSource 匹配的模型]
import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const only = process.argv[2];

// LLM 生成的人工描述（num → 描述文案）；存在时覆盖 descriptionTpl 模板
const descriptionsPath = resolve(__dirname, "..", "data", "case-descriptions.json");
const manualDescriptions = existsSync(descriptionsPath)
  ? JSON.parse(readFileSync(descriptionsPath, "utf-8"))
  : {};

const prisma = new PrismaClient();
const models = await prisma.model.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
if (models.length === 0) throw new Error("Model 注册表为空，请先运行 node scripts/seed-model-config.mjs");

let grandTotal = 0;

for (const model of models) {
  if (only && model.dataSource !== only) continue;
  if (!model.dataSource) {
    console.warn(`跳过 ${model.id}：未配置 dataSource`);
    continue;
  }

  const raw = JSON.parse(readFileSync(resolve(__dirname, "..", model.dataSource), "utf-8"));
  const cases = raw.cases ?? raw;

  // 生态语料目录：data/sources/<modelId>/*.json（适配器产出的统一中间格式，字段可含 typeTag 直给类型标签）
  const sourcesDir = resolve(__dirname, "..", "data", "sources", model.id);
  if (existsSync(sourcesDir)) {
    for (const f of readdirSync(sourcesDir).filter((f) => f.endsWith(".json") && !f.includes("-prompts"))) {
      const part = JSON.parse(readFileSync(resolve(sourcesDir, f), "utf-8"));
      cases.push(...(Array.isArray(part) ? part : (part.cases ?? [])));
    }
  }

  // rawAliases → { 原始分类: 展示分类 }；不在映射里的归到 sortOrder 最大的分类（兜底"更多"位）
  const cats = await prisma.category.findMany({
    where: { modelId: model.id },
    orderBy: { sortOrder: "asc" },
  });
  const rawToDisplay = new Map();
  for (const c of cats) {
    for (const alias of JSON.parse(c.rawAliases || "[]")) rawToDisplay.set(alias, c.name);
  }
  const fallbackDisplay = cats.length ? cats[cats.length - 1].name : "更多";

  // 类型标签（Tag kind=type）：displayCategory 即标签名，导入时同步挂标签
  const tagRows = await prisma.tag.findMany({ where: { kind: "type" }, select: { id: true, name: true } });
  const tagIdByName = new Map(tagRows.map((t) => [t.name, t.id]));

  let upserted = 0;
  let withManualDesc = 0;
  for (const c of cases) {
    // typeTag 直给（生态语料自带 12 类标签）优先；否则走 rawAliases 映射
    const displayCategory = c.typeTag ?? rawToDisplay.get(c.category) ?? fallbackDisplay;
    const manualDesc = manualDescriptions[c.num];
    if (manualDesc) withManualDesc++;
    const description =
      manualDesc ??
      (model.descriptionTpl ?? "「{title}」——{category}方向的高质量 {modelName} 出图案例。")
        .replaceAll("{title}", c.title)
        .replaceAll("{category}", displayCategory)
        .replaceAll("{modelName}", model.name);

    const data = {
      title: c.title,
      category: c.category,
      displayCategory,
      source: c.source ?? "",
      sourceRepo: c.sourceRepo ?? null,
      image: c.image ?? "",
      prompt: c.prompt ?? "",
      description,
    };
    const saved = await prisma.case.upsert({
      where: { modelId_num: { modelId: model.id, num: c.num } },
      update: data,
      create: { modelId: model.id, num: c.num, ...data },
    });

    // 同步类型标签（整棵替换，保证与映射配置一致）
    await prisma.caseTag.deleteMany({ where: { caseId: saved.id, tag: { kind: "type" } } });
    const tagId = tagIdByName.get(displayCategory);
    if (tagId) {
      await prisma.caseTag.create({ data: { caseId: saved.id, tagId } });
    }
    upserted++;
  }

  console.log(`✓ ${model.id}（${model.name}）：upsert ${upserted} 条（人工描述 ${withManualDesc} 条）`);
  grandTotal += upserted;
}

const total = await prisma.case.count();
console.log(`导入完成：本次 upsert ${grandTotal} 条，库内共 ${total} 条案例。`);
await prisma.$disconnect();
