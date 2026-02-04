import { expect, test } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";

test("canonical home cutover: /rebuild is hard 404 and does not render home markers", async ({
  page,
  request,
}) => {
  const url = `${baseURL}/rebuild`;
  const response = await request.get(url, { maxRedirects: 0 });

  expect(response.status()).toBe(404);
  expect(response.headers().location ?? "").toBe("");

  const pageResponse = await page.goto(url, { waitUntil: "domcontentloaded" });
  expect(pageResponse?.status()).toBe(404);
  await expect(page.getByTestId("rebuild-home-deferred-skeleton")).toHaveCount(
    0
  );
  await expect(page.getByTestId("rebuild-home-deferred-content")).toHaveCount(
    0
  );
});
