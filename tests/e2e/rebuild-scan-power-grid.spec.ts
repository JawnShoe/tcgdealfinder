import { expect, test } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const databaseUrl = process.env.DATABASE_URL;

test.use({ viewport: { width: 1280, height: 800 } });
test.skip(!databaseUrl, "DATABASE_URL not set for rebuild E2E.");

test("rebuild discovery: scan grid columns + inspect expand remain deterministic", async ({
  page,
}) => {
  await page.goto(`${baseURL}/discovery`, {
    waitUntil: "domcontentloaded",
  });

  const firstRow = page.getByTestId("rebuild-deal-row").first();
  await expect(firstRow).toBeVisible({ timeout: 15000 });

  await expect(firstRow.getByTestId("rebuild-deal-col-identity")).toBeVisible();
  await expect(firstRow.getByTestId("rebuild-deal-col-price")).toBeVisible();
  await expect(firstRow.getByTestId("rebuild-deal-col-discount")).toBeVisible();
  await expect(firstRow.getByTestId("rebuild-deal-col-seller")).toBeVisible();

  await expect
    .poll(
      async () =>
        firstRow.evaluate(
          (element) => window.getComputedStyle(element).display
        ),
      { timeout: 15000 }
    )
    .toBe("grid");

  await expect
    .poll(
      async () =>
        firstRow.evaluate(
          (element) => window.getComputedStyle(element).gridTemplateColumns
        ),
      { timeout: 15000 }
    )
    .not.toBe("none");

  const templateColumns = await firstRow.evaluate(
    (element) => window.getComputedStyle(element).gridTemplateColumns
  );
  expect(templateColumns.split(" ").length).toBeGreaterThanOrEqual(4);

  await firstRow.focus();
  await page.keyboard.press("Enter");
  await expect(firstRow.getByTestId("rebuild-deal-row-expanded")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(firstRow.getByTestId("rebuild-deal-row-expanded")).toHaveCount(
    0
  );
});
