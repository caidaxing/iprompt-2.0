// 平台签名邀请码:生成/验签/归一化 单测
import { describe, it, expect } from "vitest";
import {
  generateInviteCode,
  verifyInviteSignature,
  normalizeInviteInput,
  isValidPrefix,
  getInviteSecret,
} from "@/server/lib/invite-code";

const SECRET = "unit-test-secret-0123456789abcdef";

describe("签名码生成与验签", () => {
  it("生成 → 验签通过,三段式格式", () => {
    const gen = generateInviteCode("IP", SECRET);
    const parts = gen.display.split("-");
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe("IP");
    expect(parts[1]).toHaveLength(10);
    expect(parts[2]).toHaveLength(8);
    const v = verifyInviteSignature(gen.display, SECRET);
    expect(v).toMatchObject({ normalized: gen.normalized, prefix: "IP", payload: gen.payload });
  });

  it("同一前缀多次生成,载荷不重复", () => {
    const a = generateInviteCode("IP", SECRET);
    const b = generateInviteCode("IP", SECRET);
    expect(a.normalized).not.toBe(b.normalized);
  });

  it("篡改载荷 → 验签失败", () => {
    const gen = generateInviteCode("IP", SECRET);
    const tampered = gen.display.replace(/-/g, "").split("");
    // 翻转载荷第一位(避开分隔结构)
    const idx = 3;
    tampered[idx] = tampered[idx] === "A" ? "B" : "A";
    expect(verifyInviteSignature(tampered.join(""), SECRET)).toBeNull();
  });

  it("篡改签名 → 验签失败", () => {
    const gen = generateInviteCode("IP", SECRET);
    const tampered = gen.normalized.split("");
    const last = tampered.length - 1;
    tampered[last] = tampered[last] === "A" ? "B" : "A";
    expect(verifyInviteSignature(tampered.join(""), SECRET)).toBeNull();
  });

  it("错误密钥签发的码 → 验签失败(跨系统不可用)", () => {
    const gen = generateInviteCode("IP", "another-secret-0123456789");
    expect(verifyInviteSignature(gen.display, SECRET)).toBeNull();
  });

  it("输入容错:小写/空格/连字符混排 → 归一化后验签通过", () => {
    const gen = generateInviteCode("ZS", SECRET);
    const messy = ` ${gen.display.toLowerCase().replace(/-/g, " ")} `;
    const v = verifyInviteSignature(messy, SECRET);
    expect(v?.normalized).toBe(gen.normalized);
  });

  it("随机编的码(格式碰巧对)→ 签名对不上,拒绝", () => {
    // 前缀1 + 载荷10 + 签名8 = 19 位,全是合法字符集字符但签名是编的
    expect(verifyInviteSignature("I2AAAAAAAAABBBBBBBBB", SECRET)).toBeNull();
  });
});

describe("前缀与归一化", () => {
  it("前缀合法性与边界", () => {
    expect(isValidPrefix("IP")).toBe(true);
    expect(isValidPrefix("Z")).toBe(true);
    expect(isValidPrefix("ABCD")).toBe(true);
    expect(isValidPrefix("")).toBe(false);
    expect(isValidPrefix("ABCDE")).toBe(false);
    expect(isValidPrefix("I0")).toBe(true); // 前缀人读,放开全字母数字
  });

  it("归一化:去空格连字符、转大写", () => {
    expect(normalizeInviteInput(" ip-7k2m 9p4q xd-f83k ")).toBe("IP7K2M9P4QXDF83K");
  });

  it("签名密钥:自定义优先,缺省由 JWT 密钥派生且稳定", () => {
    expect(getInviteSecret("jwt-key", "custom-key-16")).toBe("custom-key-16");
    expect(getInviteSecret("jwt-key")).toBe(getInviteSecret("jwt-key"));
    expect(getInviteSecret("jwt-key")).not.toBe(getInviteSecret("jwt-key-2"));
  });
});
