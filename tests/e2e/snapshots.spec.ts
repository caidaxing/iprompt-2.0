import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";

// 一次性视觉核对截图（不参与常规回归）；走 playwright.config 的 baseURL/webServer
const base = process.env.SHOT_BASE ?? "";

test("snapshots", async ({ page }) => {
  mkdirSync("shots", { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${base}/`);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "shots/landing.png" });
  await page.goto(`${base}/explore`);
  await page.waitForTimeout(4000);
  await page.screenshot({ path: "shots/explore.png" });
  await page.goto(`${base}/case/12`);
  await page.waitForTimeout(4000);
  await page.screenshot({ path: "shots/case.png" });
  await page.goto(`${base}/case/1`);
  await page.waitForTimeout(4000);
  await page.screenshot({ path: "shots/case1.png" });
  await page.goto(`${base}/login`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "shots/login.png" });
  await page.goto(`${base}/match`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "shots/match.png" });
});
