// 图片路径本地化：扫描 public 下的案例图目录，把 DB 中 GitHub raw URL 回写为本地路径
// 不再依赖一次性映射文件，直接按文件名 caseN.<ext> 匹配案例编号
// 用法：node scripts/localize-image-paths.mjs [public 下的图片目录，默认 public/images/cases]
import { readdirSync } from "node:fs";
import { relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const dirRel = process.argv[2] ?? "images/cases"; // 相对 public/
const dirAbs = resolve(root, "public", dirRel);
const dbPrefix = `/${dirRel.replace(/\\/g, "/")}`; // DB 存 /images/cases/caseN.ext

const prisma = new PrismaClient();

const files = readdirSync(dirAbs).filter((f) => /^case\d+\.(jpg|jpeg|png|webp|gif)$/i.test(f));
console.log(`扫描 ${dirRel}：${files.length} 个案例图文件`);

let updated = 0;
let missing = 0;
for (const file of files) {
  const num = Number(file.match(/^case(\d+)\./i)[1]);
  const local = `${dbPrefix}/${file}`;
  const res = await prisma.case.updateMany({
    where: { num, image: { contains: "raw.githubusercontent.com" } },
    data: { image: local },
  });
  updated += res.count;
}

const remain = await prisma.case.count({ where: { image: { contains: "raw.githubusercontent.com" } } });
const caseCount = await prisma.case.count();

// 核对：库内仍有远程 URL 且本地无对应文件的案例
for (const c of await prisma.case.findMany({ where: { image: { contains: "raw.githubusercontent.com" } }, select: { num: true } })) {
  console.error(`MISSING：case${c.num} 无本地文件`);
  missing++;
}

console.log(`updated=${updated} remain-remote=${remain} / 共 ${caseCount} 条案例${missing ? `（缺图 ${missing} 条）` : ""}`);
await prisma.$disconnect();
