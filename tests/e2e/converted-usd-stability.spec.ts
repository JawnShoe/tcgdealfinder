import { expect, test, type Locator, type Page } from "@playwright/test";

function trackHydrationWarnings(page: Page): string[] {
  const warnings: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() !== "warning" && msg.type() !== "error") {
      return;
    }
    const text = msg.text();
    if (!text) return;
    if (/hydration/i.test(text) || /Text content does not match/i.test(text)) {
      warnings.push(`${msg.type()}: ${text}`);
    }
  });

  return warnings;
}

async function expectConvertedUsdStable(page: Page, locator: Locator) {
  await expect(locator).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(locator).toBeVisible();
}

test("Homepage: converted USD line is stable + toggle persists", async ({
  page,
}, testInfo) => {
  const hydrationWarnings = trackHydrationWarnings(page);
  const baseURL = testInfo.project.use.baseURL as string | undefined;
  if (!baseURL) {
    throw new Error("Playwright baseURL is not configured.");
  }

  await page.context().addCookies([
    { name: "market", value: "ALL", url: baseURL },
    { name: "usd_baseline", value: "1", url: baseURL },
  ]);

  await page.goto("/");

  const convertedUsd = page.getByTestId("converted-usd").first();
  await expectConvertedUsdStable(page, convertedUsd);

  const toggle = page.getByTestId("usd-baseline-toggle");
  await expect(toggle).toBeChecked();
  await toggle.click();
  await expect(toggle).not.toBeChecked();

  await expect(page.getByTestId("converted-usd")).toHaveCount(0);

  await page.reload();
  await expect(page.getByTestId("converted-usd")).toHaveCount(0);
  await expect(page.getByTestId("usd-baseline-toggle")).not.toBeChecked();

  await page.getByTestId("usd-baseline-toggle").click();
  await expect(page.getByTestId("usd-baseline-toggle")).toBeChecked();
  await expect(page.getByTestId("converted-usd").first()).toBeVisible();

  expect(
    hydrationWarnings,
    `Hydration warnings:\n${hydrationWarnings.join("\n")}`
  ).toEqual([]);
});

test("Homepage: usd_baseline=0 hides converted USD line", async ({
  page,
}, testInfo) => {
  const hydrationWarnings = trackHydrationWarnings(page);
  const baseURL = testInfo.project.use.baseURL as string | undefined;
  if (!baseURL) {
    throw new Error("Playwright baseURL is not configured.");
  }

  await page.context().addCookies([
    { name: "market", value: "ALL", url: baseURL },
    { name: "usd_baseline", value: "0", url: baseURL },
  ]);

  await page.goto("/");

  await expect(page.getByTestId("converted-usd")).toHaveCount(0);

  expect(
    hydrationWarnings,
    `Hydration warnings:\n${hydrationWarnings.join("\n")}`
  ).toEqual([]);
});

test("Card details: converted USD line is stable", async ({
  page,
}, testInfo) => {
  const hydrationWarnings = trackHydrationWarnings(page);
  const baseURL = testInfo.project.use.baseURL as string | undefined;
  if (!baseURL) {
    throw new Error("Playwright baseURL is not configured.");
  }

  await page.context().addCookies([
    { name: "market", value: "ALL", url: baseURL },
    { name: "usd_baseline", value: "1", url: baseURL },
  ]);

  const cardId = process.env.E2E_CARD_ID ?? "1";
  await page.goto(`/cards/${cardId}`);

  const bestDeal = page.getByTestId("best-trusted-deal");
  const convertedUsd = bestDeal.getByTestId("converted-usd");
  await expectConvertedUsdStable(page, convertedUsd);

  expect(
    hydrationWarnings,
    `Hydration warnings:\n${hydrationWarnings.join("\n")}`
  ).toEqual([]);
});
