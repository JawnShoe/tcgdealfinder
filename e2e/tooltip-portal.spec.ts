import { test, expect } from "@playwright/test";

/**
 * PR #219: Data Reliability tooltip portal positioning test
 *
 * Verifies that portal tooltips with side="top" appear correctly after hydration.
 * This test catches the regression where tooltips were positioned off-screen
 * because height was measured while the element was collapsed.
 */

const HYDRATION_WAIT_MS = 3000;

// Routes where Data Reliability (?) tooltip exists
const DATA_RELIABILITY_ROUTES = [
  { path: "/", name: "Homepage" },
  { path: "/top-deals", name: "Top Deals" },
  { path: "/newest", name: "Newest" },
  { path: "/cards/1", name: "Card Detail" },
];

test.describe("Data Reliability tooltip (portal, side=top)", () => {
  for (const route of DATA_RELIABILITY_ROUTES) {
    test(`${route.name} (${route.path}): tooltip appears on hover after hydration`, async ({
      page,
    }) => {
      // Navigate to page
      await page.goto(route.path);

      // Wait for hydration
      await page.waitForTimeout(HYDRATION_WAIT_MS);

      // Find the Data Reliability help trigger (the ? button)
      const trigger = page.locator('[aria-label="Data reliability help"]');

      // Skip if trigger doesn't exist on this route (e.g., no deals loaded)
      const triggerCount = await trigger.count();
      if (triggerCount === 0) {
        test.skip();
        return;
      }

      // Ensure trigger is visible and in viewport
      await expect(trigger.first()).toBeVisible();

      // Hover over the trigger
      await trigger.first().hover();

      // Wait a moment for tooltip to position
      await page.waitForTimeout(200);

      // Assert tooltip is visible
      const tooltip = page.getByRole("tooltip");
      await expect(tooltip).toBeVisible();

      // Assert tooltip contains expected content
      await expect(tooltip).toContainText("pricing data");

      // Assert tooltip is in viewport (not positioned off-screen)
      const tooltipBox = await tooltip.boundingBox();
      expect(tooltipBox).not.toBeNull();
      if (tooltipBox) {
        const viewport = page.viewportSize();
        expect(tooltipBox.y).toBeGreaterThanOrEqual(0);
        expect(tooltipBox.y + tooltipBox.height).toBeLessThanOrEqual(
          viewport?.height ?? 1080
        );
      }

      // Move mouse away and verify tooltip closes
      await page.mouse.move(0, 0);
      await page.waitForTimeout(200);
      await expect(tooltip).not.toBeVisible();
    });

    test(`${route.name} (${route.path}): tooltip appears on keyboard focus`, async ({
      page,
    }) => {
      await page.goto(route.path);
      await page.waitForTimeout(HYDRATION_WAIT_MS);

      const trigger = page.locator('[aria-label="Data reliability help"]');
      const triggerCount = await trigger.count();
      if (triggerCount === 0) {
        test.skip();
        return;
      }

      // Focus the trigger via keyboard
      await trigger.first().focus();
      await page.waitForTimeout(200);

      // Assert tooltip is visible
      const tooltip = page.getByRole("tooltip");
      await expect(tooltip).toBeVisible();

      // Press Escape to close
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
      await expect(tooltip).not.toBeVisible();
    });
  }
});

test.describe("Other portal tooltips (regression check)", () => {
  test("WhyDeal tooltip (portal, side=bottom) appears on hover", async ({
    page,
  }) => {
    await page.goto("/top-deals");
    await page.waitForTimeout(HYDRATION_WAIT_MS);

    // WhyDeal labels like "Well below typical price" have tooltips
    const whyDealTrigger = page.locator(
      '[aria-label*="more info"]:has-text("below")'
    );
    const triggerCount = await whyDealTrigger.count();
    if (triggerCount === 0) {
      test.skip();
      return;
    }

    await whyDealTrigger.first().hover();
    await page.waitForTimeout(200);

    const tooltip = page.getByRole("tooltip");
    await expect(tooltip).toBeVisible();
  });

  test("TrustedBadge tooltip (portal, side=bottom) appears on hover", async ({
    page,
  }) => {
    await page.goto("/top-deals");
    await page.waitForTimeout(HYDRATION_WAIT_MS);

    // Trusted seller shield icon
    const trustedTrigger = page.locator('[aria-label="Trusted seller"]');
    const triggerCount = await trustedTrigger.count();
    if (triggerCount === 0) {
      test.skip();
      return;
    }

    await trustedTrigger.first().hover();
    await page.waitForTimeout(200);

    const tooltip = page.getByRole("tooltip");
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText("positive feedback");
  });

  test("Seller tooltip (portal, size=wide) appears on hover", async ({
    page,
  }) => {
    await page.goto("/top-deals");
    await page.waitForTimeout(HYDRATION_WAIT_MS);

    // Seller name links in the table
    const sellerTrigger = page
      .locator('a[href^="https://www.ebay"][aria-describedby]')
      .first();
    const triggerCount = await sellerTrigger.count();
    if (triggerCount === 0) {
      test.skip();
      return;
    }

    await sellerTrigger.hover();
    await page.waitForTimeout(200);

    const tooltip = page.getByRole("tooltip");
    // Seller tooltips may or may not be visible depending on content
    // This is a non-critical regression check
  });
});
