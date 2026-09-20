import { defineConfig, devices } from "@playwright/test";
import { E2E_ADMIN_EMAIL } from "./tests/e2e/constants";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  // CI 下失败即停，本地全量跑
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://127.0.0.1:3000",
    channel: "msedge", // 复用本机 Edge，免去浏览器内核下载
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run start", // 生产模式跑 E2E：dev 模式 Turbopack 按需编译太慢且 hydration 抖动
    url: "http://127.0.0.1:3000/api/health",
    reuseExistingServer: true,
    timeout: 90_000,
    env: { ...process.env, ADMIN_EMAIL: E2E_ADMIN_EMAIL }, // 超管引导：该邮箱注册即激活
  },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }],
});
