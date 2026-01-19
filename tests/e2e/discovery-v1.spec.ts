import { expect, test } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";

test("discovery v1: renders newest preset", async ({ page }) => {
  await page.goto(`${baseURL}/discovery?sort=newest`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("heading", { name: "Discovery" })).toBeVisible();
  await expect(page.getByLabel("Sort")).toHaveValue("newest");
});

test("discovery v1: renders biggest-discount preset", async ({ page }) => {
  await page.goto(`${baseURL}/discovery?sort=biggest-discount`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByLabel("Sort")).toHaveValue("biggest-discount");
});

test("discovery v1: renders endingSoon preset", async ({ page }) => {
  await page.goto(`${baseURL}/discovery?sort=endingSoon`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByLabel("Sort")).toHaveValue("endingSoon");
});

test("discovery v1: invalid preset returns 404", async ({ request }) => {
  const response = await request.get(`${baseURL}/discovery?sort=not-a-preset`);
  expect(response.status()).toBe(404);
});
