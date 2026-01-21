import { expect, test } from "@playwright/test";

test("rebuild alerts: subscription form submits and shows success state", async ({
  page,
}) => {
  let lastPayload: unknown = null;

  await page.route("**/api/rebuild/alerts/subscribe", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }

    try {
      lastPayload = route.request().postDataJSON();
    } catch {
      lastPayload = null;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.goto("/rebuild/alerts", { waitUntil: "domcontentloaded" });

  const form = page.getByTestId("rebuild-alerts-subscribe-form");
  await expect(form).toBeVisible({ timeout: 15000 });

  await page.getByTestId("rebuild-alerts-card-id").fill("1");
  await page.getByTestId("rebuild-alerts-email").fill("test@example.com");
  await expect(page.getByTestId("rebuild-alerts-min-discount")).toHaveValue(
    /\d+/
  );

  await page.getByTestId("rebuild-alerts-submit").click();

  await expect(page.getByTestId("rebuild-alerts-success")).toBeVisible();
  await expect(page.getByTestId("rebuild-alerts-success")).toContainText(
    "You'll only be emailed when a deal meets these conditions."
  );

  expect(lastPayload).toEqual({
    cardId: 1,
    email: "test@example.com",
    minDiscountPercent: 10,
  });
});
