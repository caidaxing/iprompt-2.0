import { describe, it, expect, beforeEach } from "vitest";
import { parseEnv, resetEnvCache } from "@/server/config/env";
import { getMailer, resetMailerCache } from "@/server/lib/mailer";

const base = {
  DATABASE_URL: "file:./test.db",
  AUTH_JWT_SECRET: "x".repeat(32),
};

describe("env 邮件配置", () => {
  it("默认 MAIL_PROVIDER=console", () => {
    const env = parseEnv(base);
    expect(env.MAIL_PROVIDER).toBe("console");
  });

  it("smtp 缺少必填项时启动即失败", () => {
    expect(() => parseEnv({ ...base, MAIL_PROVIDER: "smtp", SMTP_HOST: "smtp.test.com" }))
      .toThrow(/缺少环境变量/);
  });

  it("smtp 配置完整时通过", () => {
    const env = parseEnv({
      ...base,
      MAIL_PROVIDER: "smtp",
      SMTP_HOST: "smtp.test.com",
      SMTP_USER: "a@b.c",
      SMTP_PASS: "secret",
      MAIL_FROM: "iPrompt <no-reply@b.c>",
    });
    expect(env.SMTP_PORT).toBe(465);
  });
});

describe("mailer 工厂", () => {
  beforeEach(() => {
    resetMailerCache();
    resetEnvCache();
    process.env.DATABASE_URL = base.DATABASE_URL;
    process.env.AUTH_JWT_SECRET = base.AUTH_JWT_SECRET;
    process.env.MAIL_PROVIDER = "console";
  });

  it("console 模式返回带 sendLoginCode 的 provider", async () => {
    process.env.MAIL_PROVIDER = "console";
    const mailer = getMailer();
    // 不抛异常即视为发送成功（console 只打日志）
    await expect(mailer.sendLoginCode("t@t.com", "123456")).resolves.toBeUndefined();
  });
});
