export const USD_BASELINE_COOKIE_NAME = "usd_baseline";

export function parseUsdBaselineCookie(
  value: string | null | undefined
): boolean {
  if (value === "0") return false;
  if (value === "1") return true;
  return true;
}

export function getUsdBaselineCookieValue(showUsdBaseline: boolean): "1" | "0" {
  return showUsdBaseline ? "1" : "0";
}

export function buildUsdBaselineCookieString(showUsdBaseline: boolean): string {
  return `${USD_BASELINE_COOKIE_NAME}=${getUsdBaselineCookieValue(
    showUsdBaseline
  )}; Path=/; Max-Age=31536000; SameSite=Lax`;
}
