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
        beforeSend(event) {
          // PII scrubbing patterns
          const emailRegex =
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
          const tokenRegex = /\b[A-Za-z0-9]{32,}\b/g;

          // Scrub sensitive data from error messages
          if (event.message) {
            event.message = event.message
              .replace(emailRegex, "[EMAIL]")
              .replace(tokenRegex, "[TOKEN]");
          }

          // Scrub exception values
          if (event.exception?.values) {
            event.exception.values.forEach((exception) => {
              if (exception.value) {
                exception.value = exception.value
                  .replace(emailRegex, "[EMAIL]")
                  .replace(tokenRegex, "[TOKEN]");
              }
            });
          }

          // Scrub request URL query params
          if (event.request?.url) {
            try {
              const url = new URL(event.request.url);
              url.search = url.search ? "[QUERY_REDACTED]" : "";
              event.request.url = url.toString();
            } catch {
              // If URL parsing fails, redact the whole thing after ?
              event.request.url = event.request.url.replace(
                /\?.*$/,
                "?[QUERY_REDACTED]"
              );
            }
          }

          // Scrub request query_string
          if (event.request?.query_string) {
            event.request.query_string = "[REDACTED]";
          }

          // Scrub sensitive headers
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

          // Scrub user PII fields
          if (event.user) {
            if (event.user.email) event.user.email = "[EMAIL]";
            if (event.user.username) event.user.username = "[REDACTED]";
            if (event.user.ip_address) event.user.ip_address = "[REDACTED]";
          }

          // Scrub extra fields that may contain PII
          if (event.extra) {
            const extraStr = JSON.stringify(event.extra);
            const scrubbedStr = extraStr
              .replace(emailRegex, "[EMAIL]")
              .replace(tokenRegex, "[TOKEN]");
            event.extra = JSON.parse(scrubbedStr);
          }

          // Scrub tags that may contain PII
          if (event.tags) {
            for (const key of Object.keys(event.tags)) {
              const value = event.tags[key];
              if (typeof value === "string") {
                event.tags[key] = value
                  .replace(emailRegex, "[EMAIL]")
                  .replace(tokenRegex, "[TOKEN]");
              }
            }
          }

          return event;
        },
      });
    }
  }
}
