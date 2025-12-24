import * as Sentry from "@sentry/nextjs";

// Optional Sentry DSN - gracefully degrades if not set
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    replaysOnErrorSampleRate: 0.0,
    replaysSessionSampleRate: 0.0,
    beforeSend(event, hint) {
      // Scrub sensitive data from error messages
      if (event.message) {
        event.message = event.message
          .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "[EMAIL]")
          .replace(/\b[A-Za-z0-9]{32,}\b/g, "[TOKEN]");
      }
      if (event.exception?.values) {
        event.exception.values.forEach((exception) => {
          if (exception.value) {
            exception.value = exception.value
              .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "[EMAIL]")
              .replace(/\b[A-Za-z0-9]{32,}\b/g, "[TOKEN]");
          }
        });
      }
      return event;
    },
  });
}
