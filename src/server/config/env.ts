// 环境变量集中定义 + 启动时校验（快速失败）
// 规则：任何模块不得直接读 process.env，一律从这里取
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL 未配置"),
  AUTH_JWT_SECRET: z.string().min(16, "AUTH_JWT_SECRET 至少 16 位"),
  ACCESS_TOKEN_TTL_MIN: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  // 超管引导：用该邮箱注册的账号自动置为 active + role=admin
  ADMIN_EMAIL: z.string().email().optional(),
  CODE_TTL_MIN: z.coerce.number().int().positive().default(5),
  // 邮件：console=仅日志（默认，本地开发），smtp=真实发信
  MAIL_PROVIDER: z.enum(["console", "smtp"]).default("console"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/** SMTP provider 启用的完整性校验（缺失即启动失败，不留运行时隐患） */
function assertMailEnv(env: Env): void {
  if (env.MAIL_PROVIDER !== "smtp") return;
  const missing = (["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "MAIL_FROM"] as const).filter(
    (k) => !env[k],
  );
  if (missing.length) {
    throw new Error(`MAIL_PROVIDER=smtp 但缺少环境变量：${missing.join(", ")}`);
  }
}

let cached: Env | null = null;

/** 解析并校验环境变量；失败抛出带明细的异常（启动即失败，不留隐患） */
export function parseEnv(source: Record<string, string | undefined> = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`环境变量校验失败：\n${issues}`);
  }
  assertMailEnv(result.data);
  return result.data;
}

/** 获取已校验的环境配置（进程内单例） */
export function getEnv(): Env {
  if (!cached) cached = parseEnv();
  return cached;
}

/** 仅测试用：清空缓存 */
export function resetEnvCache(): void {
  cached = null;
}
