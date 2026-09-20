import { describe, it, expect } from "vitest";
import { parseEnv } from "@/server/config/env";

const base = {
  NODE_ENV: "test",
  DATABASE_URL: "file:./dev.db",
  AUTH_JWT_SECRET: "dev-secret-0123456789abcdef",
};

describe("parseEnv", () => {
  it("合法配置解析通过，默认值生效", () => {
    const env = parseEnv(base);
    expect(env.DATABASE_URL).toBe("file:./dev.db");
    expect(env.ACCESS_TOKEN_TTL_MIN).toBe(15);
    expect(env.REFRESH_TOKEN_TTL_DAYS).toBe(30);
    expect(env.CODE_TTL_MIN).toBe(5);
  });

  it("缺少 DATABASE_URL 时快速失败并列出问题", () => {
    expect(() => parseEnv({ ...base, DATABASE_URL: undefined })).toThrow(/DATABASE_URL/);
  });

  it("JWT 密钥过短时快速失败", () => {
    expect(() => parseEnv({ ...base, AUTH_JWT_SECRET: "short" })).toThrow(/至少 16 位/);
  });
});
