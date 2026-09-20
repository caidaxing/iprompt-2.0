// 模型注册种子脚本（幂等 + 同步清理）
// Model 注册行 + Category 映射（原始分类 → 类型标签）+ Tag 种子（12 大类型）
// 用法：node scripts/seed-model-config.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const GPT_IMAGE_2 = {
  id: "gpt-image-2",
  name: "GPT-Image-2",
  active: true,
  isDefault: true,
  sortOrder: 1,
  dataSource: "data/cases-gpt-image-2.json",
  imageDir: "/images/cases",
  descriptionTpl: "「{title}」——{category}方向的高质量 {modelName} 出图案例，附完整可复用提示词与出图效果。",
};

// 十二大类型标签（Tag kind=type，全站统一；来源：docs/plans 生态调研的类型体系）
const TYPE_TAGS = [
  { slug: "portrait-photography", name: "人像摄影", sortOrder: 1 },
  { slug: "ecommerce-ads", name: "电商广告", sortOrder: 2 },
  { slug: "poster-illustration", name: "海报插画", sortOrder: 3 },
  { slug: "character-design", name: "角色手办", sortOrder: 4 },
  { slug: "ui-social", name: "UI与社媒", sortOrder: 5 },
  { slug: "photo-editing", name: "编辑修复", sortOrder: 6 },
  { slug: "style-transfer", name: "风格迁移", sortOrder: 7 },
  { slug: "interior-design", name: "室内设计", sortOrder: 8 },
  { slug: "education-infographic", name: "教育信息图", sortOrder: 9 },
  { slug: "workplace", name: "职场生产力", sortOrder: 10 },
  { slug: "video-prompt", name: "视频提示词", sortOrder: 11 },
  { slug: "fun-social", name: "日常趣味", sortOrder: 12 },
];

// gpt-image-2 的原始分类 → 类型标签映射（Category 表，rawAliases 即映射配置）
const CATEGORIES = [
  { name: "人像摄影", sortOrder: 1, rawAliases: ["📷 摄影与写实"] },
  { name: "电商广告", sortOrder: 2, rawAliases: ["🛍️ 商品与电商", "🏷️ 品牌与标志"] },
  { name: "海报插画", sortOrder: 3, rawAliases: ["📰 海报与排版", "🎨 插画与艺术", "🏮 历史与古风题材", "🎬 场景与叙事"] },
  { name: "角色手办", sortOrder: 4, rawAliases: ["🧍 人物与角色"] },
  { name: "UI与社媒", sortOrder: 5, rawAliases: ["🧩 UI与界面"] },
  { name: "室内设计", sortOrder: 8, rawAliases: ["🏛️ 建筑与空间"] },
  { name: "教育信息图", sortOrder: 9, rawAliases: ["📊 图表与信息可视化", "📚 文档与出版物"] },
  { name: "日常趣味", sortOrder: 12, rawAliases: ["🧪 其他应用场景", "未分类"] },
];

// ---- Tag：12 大类型 ----
for (const t of TYPE_TAGS) {
  await prisma.tag.upsert({
    where: { slug: t.slug },
    update: { name: t.name, kind: "type", sortOrder: t.sortOrder },
    create: { slug: t.slug, name: t.name, kind: "type", sortOrder: t.sortOrder },
  });
}
console.log(`✓ Tag：${TYPE_TAGS.length} 个类型标签`);

// ---- Model：gpt-image-2 ----
await prisma.model.upsert({
  where: { id: GPT_IMAGE_2.id },
  update: { ...GPT_IMAGE_2 },
  create: { ...GPT_IMAGE_2 },
});
console.log(`✓ Model：${GPT_IMAGE_2.id}`);

// ---- Category：映射配置（按 name upsert）----
for (const c of CATEGORIES) {
  await prisma.category.upsert({
    where: { modelId_name: { modelId: GPT_IMAGE_2.id, name: c.name } },
    update: { sortOrder: c.sortOrder, rawAliases: JSON.stringify(c.rawAliases) },
    create: { modelId: GPT_IMAGE_2.id, name: c.name, sortOrder: c.sortOrder, rawAliases: JSON.stringify(c.rawAliases) },
  });
}
console.log(`✓ Category：${CATEGORIES.length} 条映射`);

// ---- 同步清理：删除配置中已不存在的 Category 行（防改名/拆分后残留空 Tab）----
const keepNames = new Set(CATEGORIES.map((c) => c.name));
const stale = await prisma.category.findMany({
  where: { modelId: GPT_IMAGE_2.id, name: { notIn: [...keepNames] } },
  select: { id: true, name: true },
});
if (stale.length) {
  await prisma.category.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
  console.log(`✓ 清理过期映射：${stale.map((s) => s.name).join("、")}`);
}

// ---- 一致性校验 ----
const aliases = CATEGORIES.flatMap((c) => c.rawAliases);
if (new Set(aliases).size !== aliases.length) throw new Error("rawAliases 存在重复，映射会互相覆盖！");
const tagNameSet = new Set(TYPE_TAGS.map((t) => t.name));
const unmatched = CATEGORIES.filter((c) => !tagNameSet.has(c.name));
if (unmatched.length) throw new Error(`Category.name 未匹配到类型标签：${unmatched.map((c) => c.name).join("、")}`);
console.log("✓ rawAliases 无重复；Category 映射目标均在类型标签内");
await prisma.$disconnect();
