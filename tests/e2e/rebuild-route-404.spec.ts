import { test, expect } from "@playwright/test";

test("rebuild route returns hard 404 without homepage markers", async ({
  request,
  baseURL,
}) => {
  const response = await request.get(`${baseURL}/rebuild`);
  expect(response.status()).toBe(404);
  const body = await response.text();
  expect(body).not.toContain('data-testid="rebuild-home-deferred-content"');
  expect(body).not.toContain('data-testid="rebuild-home-deferred-skeleton"');
});
