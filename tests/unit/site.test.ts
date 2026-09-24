import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";

// site.ts 在模块作用域读取 NEXT_PUBLIC_SITE_URL,因此每个用例需重置模块缓存后重新导入
describe("site url 基准", () => {
  const original = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = original;
    vi.resetModules();
  });

  it("未配置时回退到线上真实入口(https,无端口)", async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const { siteUrl } = await import("@/lib/site");
    expect(siteUrl).toBe("https://116.62.64.108");
  });

  it("配置后以配置为准,并去掉尾斜杠", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://prompt.example.com/";
    const { siteUrl } = await import("@/lib/site");
    expect(siteUrl).toBe("https://prompt.example.com");
  });

  it("absoluteUrl 生成正确绝对地址,已绝对地址原样返回", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://prompt.example.com";
    const { absoluteUrl } = await import("@/lib/site");
    expect(absoluteUrl("/explore")).toBe("https://prompt.example.com/explore");
    expect(absoluteUrl("/templates")).toBe("https://prompt.example.com/templates");
    expect(absoluteUrl("/")).toBe("https://prompt.example.com/");
    expect(absoluteUrl("https://cdn.example.com/a.png")).toBe("https://cdn.example.com/a.png");
  });
});
