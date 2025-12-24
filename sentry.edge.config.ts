import * as Sentry from "@sentry/nextjs";

// Optional Sentry DSN - gracefully degrades if not set
const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
  });
}
