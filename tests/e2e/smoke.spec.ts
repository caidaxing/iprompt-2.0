import { test, expect } from "@playwright/test";
import { E2E_ADMIN_EMAIL } from "./constants";

// 冒烟：服务可达
test("GET /api/health 返回 ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.ok).toBe(true);
});

// F5 落地页：两个入口按钮
test("落地页渲染且入口跳转正确", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("把灵感变成")).toBeVisible();
  await expect(page.getByRole("link", { name: /探索案例/ })).toHaveAttribute("href", "/explore");
  await expect(page.getByRole("link", { name: /开始 AI 匹配/ })).toHaveAttribute("href", "/match");
});

// 标签体系：模型/类型 chips 行 + 多选筛选（同 kind OR 语义）
test("模型与类型标签行渲染并带计数", async ({ page }) => {
  await page.goto("/explore");
  await expect(page.locator('a[href="/explore?model=gpt-image-2"]')).toBeVisible();
  await expect(page.locator('a[href="/explore?tags=portrait-photography"]')).toBeVisible();
  await expect(page.locator('a[href="/explore?tags=poster-illustration"]')).toBeVisible();
});

test("类型标签筛选：单选与多选（同 kind 并集）", async ({ page }) => {
  await page.goto("/explore?tags=portrait-photography");
  await expect(page.getByText(/共 144 个案例/)).toBeVisible(); // 原有 78 + 生态 66
  await page.goto("/explore?tags=portrait-photography,interior-design");
  await expect(page.getByText(/共 155 个案例/)).toBeVisible(); // 144 + 11
});

test("标签计数 API 返回各类型案例数", async ({ request }) => {
  const res = await request.get("/api/tags?kind=type");
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const portrait = body.tags.find((t: { slug: string }) => t.slug === "portrait-photography");
  expect(portrait.count).toBe(144);
});

// F1 案例列表：18 卡 / 焦点区 / 分页
test("案例列表页显示 18 个案例与分页", async ({ page }) => {
  await page.goto("/explore");
  await expect(page.getByText(/共 835 个案例/)).toBeVisible(); // 541 原有 + 294 生态
  const cards = page.locator("main a[href^='/case/']");
  // 焦点区链接 + 17 张网格卡
  const count = await cards.count();
  expect(count).toBeGreaterThanOrEqual(18);
  await expect(page.getByText("/ 47")).toBeVisible(); // 835/18 = 47 页
});

// F1 视图拆分：默认案例库视图不混入改造推荐
test("案例库默认视图不混入改造推荐", async ({ page }) => {
  await page.goto("/explore");
  await expect(page.getByRole("heading", { name: "改造推荐" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "改造推荐" })).toBeVisible();
});

// F1 改造推荐独立视图
test("改造推荐视图展示 12 个场景且与案例库分离", async ({ page }) => {
  await page.goto("/explore?view=curated");
  await expect(page.getByRole("heading", { level: 1, name: "改造推荐" })).toBeVisible();
  await expect(page.getByText("12 SCENES")).toBeVisible();
  await expect(page.getByText("36 MAIN · 12 BACKUP")).toBeVisible();
  await expect(page.getByText("/ 31")).toHaveCount(0); // 推荐视图无分页
});

// F1 搜索
test("搜索「香水」能过滤案例", async ({ page }) => {
  await page.goto("/explore");
  await page.getByPlaceholder("搜索风格、场景或关键词").fill("香水");
  await page.getByRole("button", { name: "搜索" }).click();
  await page.waitForURL(/q=/);
  await expect(page.getByText(/没有找到相关案例|共 \d+ 个案例/)).toBeVisible();
});

// F2 案例详情
test("案例详情页展示提示词全文", async ({ page }) => {
  await page.goto("/case/1");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("提示词全文")).toBeVisible();
  await expect(page.getByRole("button", { name: /复制提示词/ })).toBeVisible();
  await expect(page.getByText("查看原图")).toBeVisible();
});

// F2 404
test("不存在的案例返回 404 页", async ({ page }) => {
  await page.goto("/case/99999");
  await expect(page.getByText("页面去远了")).toBeVisible();
  await expect(page.getByText("返回案例浏览")).toBeVisible();
});

// A1 + F3 + F4：登录 → 收藏 → 我的
test("注册待审：超管通过后可登录并收藏", async ({ page, request }) => {
  const email = `e2e-${Date.now()}@test.local`;
  const password = "password123";

  // 注册 → 进入待审
  const reg = await request.post("/api/auth/register", { data: { email, password } });
  expect(reg.ok()).toBeTruthy();
  expect((await reg.json()).message).toContain("审核");

  // 待审账号登录被拒
  const early = await request.post("/api/auth/login", { data: { email, password } });
  expect(early.status()).toBe(403);
  expect((await early.json()).code).toBe("AUTH_PENDING");

  // 超管（ADMIN_EMAIL 引导，注册即激活）登录并审核通过该用户
  // 首跑需先注册超管账号；重复注册对响应无影响（防枚举设计）
  await request.post("/api/auth/register", { data: { email: E2E_ADMIN_EMAIL, password: "password123" } });
  const adminLogin = await request.post("/api/auth/login", {
    data: { email: E2E_ADMIN_EMAIL, password: "password123" },
  });
  expect(adminLogin.ok()).toBeTruthy();
  const pending = await request.get("/api/admin/users?status=pending");
  const list = (await pending.json()).users as { id: string; email: string }[];
  const target = list.find((u) => u.email === email);
  expect(target).toBeTruthy();
  const approve = await request.patch(`/api/admin/users/${target!.id}`, {
    data: { action: "approve" },
  });
  expect(approve.ok()).toBeTruthy();

  // UI 登录：注册过的邮箱 + 密码
  await page.goto("/login");
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("输入密码").fill(password);
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await page.waitForURL(/explore/);

  // 导航栏出现脱敏邮箱
  await expect(page.getByText(/e\*+\@test\.local/)).toBeVisible();

  // 收藏案例 1
  await page.goto("/case/1");
  await page.getByLabel("收藏").first().click();
  await expect(page.getByLabel("取消收藏").first()).toBeVisible();

  // 收藏列表出现
  await page.goto("/favorites");
  await expect(page.getByText("我的收藏")).toBeVisible();
  await expect(page.locator("a[href='/case/1']").first()).toBeVisible();

  // 我的页：收藏数为 1
  await page.goto("/me");
  await expect(page.getByText("1 个")).toBeVisible();

  // A2 退出
  await page.getByRole("button", { name: "退出" }).click();
  await page.waitForURL("/");
  await expect(page.getByRole("link", { name: "登录" })).toBeVisible();
});

// F6 订阅
test("订阅邮箱：首次成功，重复提示已留过", async ({ request }) => {
  const email = `sub-${Date.now()}@test.local`;
  const r1 = await request.post("/api/subscribe", { data: { email } });
  expect((await r1.json()).message).toBe("已收到，上线时通知你");
  const r2 = await request.post("/api/subscribe", { data: { email } });
  expect((await r2.json()).message).toBe("这个邮箱已经留过了");
});

// A1 错误密码
test("错误密码提示且不产生登录态", async ({ request }) => {
  const email = `e2e-wrong-${Date.now()}@test.local`;
  await request.post("/api/auth/register", { data: { email, password: "password123" } });
  const login = await request.post("/api/auth/login", {
    data: { email, password: "wrong-password" },
  });
  expect(login.status()).toBe(401);
  expect((await login.json()).error).toContain("邮箱或密码错误");
});
