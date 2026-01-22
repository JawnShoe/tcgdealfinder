import { permanentRedirect } from "next/navigation";

/**
 * /alerts/unsubscribe — Stage 1 Legacy Decommission
 *
 * This page route now redirects to the rebuild unsubscribe API endpoint.
 * The API handles all unsubscribe logic (token validation, idempotent unsubscribe).
 *
 * Redirect: /alerts/unsubscribe?token=<token> -> /api/rebuild/alerts/unsubscribe?token=<token>
 *
 * Uses 308 Permanent Redirect to signal permanence and preserve GET method.
 */

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AlertsUnsubscribePage({
  searchParams,
}: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const tokenParam = sp.token;
  const token = typeof tokenParam === "string" ? tokenParam.trim() : "";

  // Build target URL with token if present
  const targetUrl = token
    ? `/api/rebuild/alerts/unsubscribe?token=${encodeURIComponent(token)}`
    : "/api/rebuild/alerts/unsubscribe";

  permanentRedirect(targetUrl);
}
