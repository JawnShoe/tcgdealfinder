import test from "node:test";
import assert from "node:assert/strict";

import { getClientIp, RATE_LIMIT_CONFIG } from "../../rateLimit";

test("getClientIp extracts from x-forwarded-for (first IP)", () => {
  const request = new Request("http://localhost/test", {
    headers: {
      "x-forwarded-for": "192.168.1.100, 10.0.0.1, 172.16.0.1",
    },
  });
  const ip = getClientIp(request);
  assert.equal(ip, "192.168.1.100");
});

test("getClientIp extracts from x-real-ip", () => {
  const request = new Request("http://localhost/test", {
    headers: {
      "x-real-ip": "203.0.113.50",
    },
  });
  const ip = getClientIp(request);
  assert.equal(ip, "203.0.113.50");
});

test("getClientIp extracts from x-vercel-forwarded-for", () => {
  const request = new Request("http://localhost/test", {
    headers: {
      "x-vercel-forwarded-for": "198.51.100.25",
    },
  });
  const ip = getClientIp(request);
  assert.equal(ip, "198.51.100.25");
});

test("getClientIp returns unknown when no IP headers present", () => {
  const request = new Request("http://localhost/test");
  const ip = getClientIp(request);
  assert.equal(ip, "unknown");
});

test("getClientIp prioritizes x-forwarded-for over x-real-ip", () => {
  const request = new Request("http://localhost/test", {
    headers: {
      "x-forwarded-for": "10.0.0.1",
      "x-real-ip": "192.168.1.1",
    },
  });
  const ip = getClientIp(request);
  assert.equal(ip, "10.0.0.1");
});

test("getClientIp trims whitespace from IP", () => {
  const request = new Request("http://localhost/test", {
    headers: {
      "x-forwarded-for": "  192.168.1.100  , 10.0.0.1",
    },
  });
  const ip = getClientIp(request);
  assert.equal(ip, "192.168.1.100");
});

test("RATE_LIMIT_CONFIG exports expected values", () => {
  assert.equal(RATE_LIMIT_CONFIG.maxRequests, 5);
  assert.equal(RATE_LIMIT_CONFIG.windowSeconds, 300);
});
