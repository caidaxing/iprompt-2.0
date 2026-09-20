// 前端工具：邮箱脱敏
// （分类体系已迁移至数据库 Model/Category 注册表，见 server/repositories/model-config-repo.ts）

export function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  const head = name.slice(0, 1);
  return `${head}${"*".repeat(Math.max(3, name.length - 1))}@${domain}`;
}
