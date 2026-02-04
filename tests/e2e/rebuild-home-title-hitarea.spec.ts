import { expect, test } from "@playwright/test";

const databaseUrl = process.env.DATABASE_URL;

test.skip(!databaseUrl, "DATABASE_URL not set for rebuild E2E.");

test("home row whitespace expands, title link opens outbound", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const rows = page.getByTestId("rebuild-deal-row");
  await expect(rows.first()).toBeVisible();

  const firstRow = rows.first();
  const titleLink = firstRow.getByTestId("rebuild-deal-row-title");
  await expect(titleLink).toBeVisible();

  const rowBox = await firstRow.boundingBox();
  if (!rowBox) {
    throw new Error("Expected a visible row bounding box.");
  }

  const whitespacePopupPromise = page
    .waitForEvent("popup", { timeout: 1000 })
    .catch(() => null);

  await firstRow.click({
    position: {
      x: Math.max(8, Math.floor(rowBox.width * 0.92)),
      y: Math.max(8, Math.floor(rowBox.height * 0.5)),
    },
  });

  await expect(firstRow).toHaveAttribute("aria-expanded", "true");
  const whitespacePopup = await whitespacePopupPromise;
  expect(whitespacePopup).toBeNull();
  await expect(page).toHaveURL(/\/$/);

  await firstRow.click({
    position: {
      x: Math.max(8, Math.floor(rowBox.width * 0.92)),
      y: Math.max(8, Math.floor(rowBox.height * 0.5)),
    },
  });
  await expect(firstRow).toHaveAttribute("aria-expanded", "false");

  const popupPromise = page.waitForEvent("popup");
  await titleLink.click();
  const popup = await popupPromise;

  await popup.waitForLoadState("domcontentloaded");
  await expect(popup).toHaveURL(/ebay\./i);
  await popup.close();

  await expect(firstRow).toHaveAttribute("aria-expanded", "false");
});
