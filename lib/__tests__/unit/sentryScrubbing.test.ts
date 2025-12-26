import test from "node:test";
import assert from "node:assert/strict";

/**
 * Tests for Sentry PII scrubbing patterns used in edge runtime beforeSend.
 * These patterns match the implementation in instrumentation.ts.
 */

const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const tokenRegex = /\b[A-Za-z0-9]{32,}\b/g;

function scrubMessage(message: string): string {
  return message.replace(emailRegex, "[EMAIL]").replace(tokenRegex, "[TOKEN]");
}

function scrubUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = parsed.search ? "[QUERY_REDACTED]" : "";
    return parsed.toString();
  } catch {
    return url.replace(/\?.*$/, "?[QUERY_REDACTED]");
  }
}

test("scrubs email addresses from messages", () => {
  const input = "User john.doe@example.com failed to authenticate";
  const output = scrubMessage(input);
  assert.equal(output, "User [EMAIL] failed to authenticate");
});

test("scrubs multiple email addresses", () => {
  const input = "Sent from admin@company.org to user+test@gmail.com";
  const output = scrubMessage(input);
  assert.equal(output, "Sent from [EMAIL] to [EMAIL]");
});

test("scrubs 32+ character tokens", () => {
  const input = "API key: abcdef1234567890abcdef1234567890 is invalid";
  const output = scrubMessage(input);
  assert.equal(output, "API key: [TOKEN] is invalid");
});

test("scrubs Authorization header tokens", () => {
  const input =
    "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9eyJzdWIiOiIxMjM0NTY3ODkwIn0";
  const output = scrubMessage(input);
  assert.equal(output, "Authorization: Bearer [TOKEN]");
});

test("scrubs combined email and token in same message", () => {
  const input =
    "User test@example.com with token abcdefghijklmnopqrstuvwxyz123456 failed";
  const output = scrubMessage(input);
  assert.equal(output, "User [EMAIL] with token [TOKEN] failed");
});

test("preserves short alphanumeric strings (not tokens)", () => {
  const input = "Product SKU: ABC123 is out of stock";
  const output = scrubMessage(input);
  assert.equal(output, "Product SKU: ABC123 is out of stock");
});

test("scrubs query params from URL", () => {
  const input =
    "https://example.com/api/users?email=test@test.com&token=secret";
  const output = scrubUrl(input);
  assert.equal(output, "https://example.com/api/users?[QUERY_REDACTED]");
});

test("preserves URL without query params", () => {
  const input = "https://example.com/api/users";
  const output = scrubUrl(input);
  assert.equal(output, "https://example.com/api/users");
});

test("handles malformed URL with query params", () => {
  const input = "not-a-valid-url?secret=password";
  const output = scrubUrl(input);
  assert.equal(output, "not-a-valid-url?[QUERY_REDACTED]");
});

// Simulate full event scrubbing as done in beforeSend
interface MockSentryEvent {
  message?: string;
  exception?: { values?: { value?: string }[] };
  request?: {
    url?: string;
    query_string?: string;
    headers?: Record<string, string>;
  };
  user?: { email?: string; username?: string; ip_address?: string };
  extra?: Record<string, unknown>;
  tags?: Record<string, string>;
}

function scrubEvent(event: MockSentryEvent): MockSentryEvent {
  if (event.message) {
    event.message = scrubMessage(event.message);
  }

  if (event.exception?.values) {
    event.exception.values.forEach((exception) => {
      if (exception.value) {
        exception.value = scrubMessage(exception.value);
      }
    });
  }

  if (event.request?.url) {
    event.request.url = scrubUrl(event.request.url);
  }

  if (event.request?.query_string) {
    event.request.query_string = "[REDACTED]";
  }

  const sensitiveHeaders = [
    "authorization",
    "cookie",
    "set-cookie",
    "x-api-key",
    "x-auth-token",
    "x-admin-secret",
  ];
  if (event.request?.headers) {
    for (const header of sensitiveHeaders) {
      if (header in event.request.headers) {
        event.request.headers[header] = "[REDACTED]";
      }
    }
  }

  if (event.user) {
    if (event.user.email) event.user.email = "[EMAIL]";
    if (event.user.username) event.user.username = "[REDACTED]";
    if (event.user.ip_address) event.user.ip_address = "[REDACTED]";
  }

  if (event.extra) {
    const extraStr = JSON.stringify(event.extra);
    const scrubbedStr = extraStr
      .replace(emailRegex, "[EMAIL]")
      .replace(tokenRegex, "[TOKEN]");
    event.extra = JSON.parse(scrubbedStr);
  }

  if (event.tags) {
    for (const key of Object.keys(event.tags)) {
      const value = event.tags[key];
      if (typeof value === "string") {
        event.tags[key] = scrubMessage(value);
      }
    }
  }

  return event;
}

test("full event scrubbing: message with email and token", () => {
  const event: MockSentryEvent = {
    message:
      "Error for user@example.com token=abcdefghijklmnopqrstuvwxyz123456",
  };
  const scrubbed = scrubEvent(event);
  assert.equal(scrubbed.message, "Error for [EMAIL] token=[TOKEN]");
});

test("full event scrubbing: exception values", () => {
  const event: MockSentryEvent = {
    exception: {
      values: [{ value: "Failed for admin@company.org" }],
    },
  };
  const scrubbed = scrubEvent(event);
  assert.equal(scrubbed.exception?.values?.[0]?.value, "Failed for [EMAIL]");
});

test("full event scrubbing: request URL and headers", () => {
  const event: MockSentryEvent = {
    request: {
      url: "https://api.example.com/users?email=secret@test.com",
      headers: {
        authorization: "Bearer supersecrettoken123",
        cookie: "session=abc123",
        "content-type": "application/json",
      },
    },
  };
  const scrubbed = scrubEvent(event);
  assert.equal(
    scrubbed.request?.url,
    "https://api.example.com/users?[QUERY_REDACTED]"
  );
  assert.equal(scrubbed.request?.headers?.authorization, "[REDACTED]");
  assert.equal(scrubbed.request?.headers?.cookie, "[REDACTED]");
  assert.equal(scrubbed.request?.headers?.["content-type"], "application/json");
});

test("full event scrubbing: user PII fields", () => {
  const event: MockSentryEvent = {
    user: {
      email: "user@example.com",
      username: "john_doe",
      ip_address: "192.168.1.1",
    },
  };
  const scrubbed = scrubEvent(event);
  assert.equal(scrubbed.user?.email, "[EMAIL]");
  assert.equal(scrubbed.user?.username, "[REDACTED]");
  assert.equal(scrubbed.user?.ip_address, "[REDACTED]");
});

test("full event scrubbing: extra and tags", () => {
  const event: MockSentryEvent = {
    extra: {
      userEmail: "debug@test.org",
      apiKey: "aaaabbbbccccddddeeeeffffgggghhhhiiii",
    },
    tags: {
      user_email: "tagged@example.com",
      environment: "production",
    },
  };
  const scrubbed = scrubEvent(event);
  assert.deepEqual(scrubbed.extra, {
    userEmail: "[EMAIL]",
    apiKey: "[TOKEN]",
  });
  // The email regex matches the full email, so "tagged@example.com" becomes "[EMAIL]"
  assert.equal(scrubbed.tags?.user_email, "[EMAIL]");
  assert.equal(scrubbed.tags?.environment, "production");
});

test("full event scrubbing: query_string field", () => {
  const event: MockSentryEvent = {
    request: {
      query_string: "email=secret@test.com&token=abc123",
    },
  };
  const scrubbed = scrubEvent(event);
  assert.equal(scrubbed.request?.query_string, "[REDACTED]");
});
