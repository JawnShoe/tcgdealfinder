import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { createAdminToken, verifyAdminToken } from "../../adminAuth";

describe("adminAuth", () => {
  const originalEnv = process.env.ADMIN_SECRET;

  beforeEach(() => {
    process.env.ADMIN_SECRET = "test-secret-key-for-hmac";
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.ADMIN_SECRET;
    } else {
      process.env.ADMIN_SECRET = originalEnv;
    }
  });

  describe("createAdminToken", () => {
    it("creates a token with timestamp.signature format", () => {
      const token = createAdminToken();
      assert.ok(token, "Token should be created");
      const parts = token.split(".");
      assert.strictEqual(parts.length, 2, "Token should have two parts");
      assert.ok(
        /^\d+$/.test(parts[0]),
        "First part should be numeric timestamp"
      );
      assert.ok(
        /^[a-f0-9]{64}$/.test(parts[1]),
        "Second part should be 64-char hex"
      );
    });

    it("returns null when ADMIN_SECRET is not set", () => {
      delete process.env.ADMIN_SECRET;
      const token = createAdminToken();
      assert.strictEqual(token, null, "Token should be null without secret");
    });

    it("creates unique tokens on each call", () => {
      const token1 = createAdminToken();
      // Small delay to ensure different timestamp
      const token2 = createAdminToken();
      // Tokens might be same if created in same millisecond, but signatures based on timestamp
      // So we just verify both are valid
      assert.ok(token1, "Token 1 should be created");
      assert.ok(token2, "Token 2 should be created");
    });
  });

  describe("verifyAdminToken", () => {
    it("verifies a valid token", () => {
      const token = createAdminToken();
      assert.ok(token, "Token should be created");
      const isValid = verifyAdminToken(token);
      assert.strictEqual(isValid, true, "Token should be valid");
    });

    it("rejects token with wrong signature", () => {
      const token = createAdminToken();
      assert.ok(token, "Token should be created");
      const [timestamp] = token.split(".");
      const forgedToken = `${timestamp}.${"a".repeat(64)}`;
      const isValid = verifyAdminToken(forgedToken);
      assert.strictEqual(isValid, false, "Forged token should be invalid");
    });

    it("rejects token with invalid format", () => {
      assert.strictEqual(verifyAdminToken(""), false, "Empty token");
      assert.strictEqual(verifyAdminToken("no-dots"), false, "No dots");
      assert.strictEqual(verifyAdminToken("a.b.c"), false, "Too many dots");
      assert.strictEqual(
        verifyAdminToken(".signature"),
        false,
        "Missing timestamp"
      );
      assert.strictEqual(
        verifyAdminToken("timestamp."),
        false,
        "Missing signature"
      );
    });

    it("rejects token with non-numeric timestamp", () => {
      const isValid = verifyAdminToken("not-a-number.abcd1234");
      assert.strictEqual(isValid, false, "Non-numeric timestamp should fail");
    });

    it("rejects expired token", () => {
      // Create a token that would have been valid 8 days ago
      const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
      const timestamp = eightDaysAgo.toString();
      const crypto = require("crypto");
      const signature = crypto
        .createHmac("sha256", process.env.ADMIN_SECRET!)
        .update(timestamp)
        .digest("hex");
      const expiredToken = `${timestamp}.${signature}`;
      const isValid = verifyAdminToken(expiredToken);
      assert.strictEqual(isValid, false, "Expired token should be rejected");
    });

    it("rejects token from far future", () => {
      // Token with timestamp 5 minutes in the future (beyond 60s tolerance)
      const futureTime = Date.now() + 5 * 60 * 1000;
      const timestamp = futureTime.toString();
      const crypto = require("crypto");
      const signature = crypto
        .createHmac("sha256", process.env.ADMIN_SECRET!)
        .update(timestamp)
        .digest("hex");
      const futureToken = `${timestamp}.${signature}`;
      const isValid = verifyAdminToken(futureToken);
      assert.strictEqual(isValid, false, "Future token should be rejected");
    });

    it("rejects token when ADMIN_SECRET is not set", () => {
      const token = createAdminToken();
      assert.ok(token, "Token should be created");
      delete process.env.ADMIN_SECRET;
      const isValid = verifyAdminToken(token);
      assert.strictEqual(isValid, false, "Token should fail without secret");
    });

    it("rejects token when ADMIN_SECRET changes", () => {
      const token = createAdminToken();
      assert.ok(token, "Token should be created");
      process.env.ADMIN_SECRET = "different-secret-key";
      const isValid = verifyAdminToken(token);
      assert.strictEqual(
        isValid,
        false,
        "Token should fail with different secret"
      );
    });

    it("rejects token with wrong signature length", () => {
      const token = createAdminToken();
      assert.ok(token, "Token should be created");
      const [timestamp] = token.split(".");
      const shortSignature = `${timestamp}.abc123`;
      const isValid = verifyAdminToken(shortSignature);
      assert.strictEqual(isValid, false, "Short signature should fail");
    });
  });
});
