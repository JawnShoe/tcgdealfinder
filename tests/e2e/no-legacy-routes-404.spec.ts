import { expect, test } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";

test("no-legacy gate: /cards/[id] returns 404", async ({ request }) => {
  const response = await request.get(`${baseURL}/cards/123`);
  expect(response.status()).toBe(404);
});

test("no-legacy gate: /sets returns 404", async ({ request }) => {
  const response = await request.get(`${baseURL}/sets`);
  expect(response.status()).toBe(404);
});

test("no-legacy gate: /sets/[id] returns 404", async ({ request }) => {
  const response = await request.get(`${baseURL}/sets/1`);
  expect(response.status()).toBe(404);
});
