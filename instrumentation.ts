import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Server-side Sentry initialization
    const dsn = process.env.SENTRY_DSN;

    if (dsn) {
      Sentry.init({
        dsn,
        tracesSampleRate: 0.1,
        beforeSend(event, hint) {
          // Scrub sensitive data from error messages
          if (event.message) {
            event.message = event.message
              .replace(
                /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
                "[EMAIL]"
              )
              .replace(/\b[A-Za-z0-9]{32,}\b/g, "[TOKEN]");
          }
          if (event.exception?.values) {
            event.exception.values.forEach((exception) => {
              if (exception.value) {
                exception.value = exception.value
                  .replace(
                    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
                    "[EMAIL]"
                  )
                  .replace(/\b[A-Za-z0-9]{32,}\b/g, "[TOKEN]");
              }
            });
          }
          return event;
        },
      });
    }
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    // Edge runtime Sentry initialization
    const dsn = process.env.SENTRY_DSN;

    if (dsn) {
      Sentry.init({
        dsn,
        tracesSampleRate: 0.1,
      });
    }
  }
}
