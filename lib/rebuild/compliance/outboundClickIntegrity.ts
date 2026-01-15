import { getMarketplaceCompliance } from "./marketplaceCompliance";

const DUPLICATE_CLICK_TTL_MS = 750;

const OBVIOUS_BOT_UA_PATTERN =
  /\b(curl|wget|python-requests|scrapy|httpclient|postmanruntime)\b/i;

export type OutboundUrlNormalization =
  | { ok: true; value: string }
  | { ok: false; error: "invalid_url" | "invalid_scheme" };

export function normalizeOutboundUrlForStorage(
  rawUrl: string
): OutboundUrlNormalization {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, error: "invalid_url" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "invalid_scheme" };
  }

  parsed.hash = "";
  parsed.username = "";
  parsed.password = "";
  parsed.search = "";

  return { ok: true, value: parsed.toString() };
}

export function isObviousAutomationUserAgent(
  userAgent: string | null
): boolean {
  if (!userAgent) return false;
  return OBVIOUS_BOT_UA_PATTERN.test(userAgent);
}

export function shouldSuppressDuplicateClick(params: {
  nowMs: number;
  previousClickAtMs: number | null;
  ttlMs?: number;
}): boolean {
  const ttlMs = params.ttlMs ?? DUPLICATE_CLICK_TTL_MS;
  if (!params.previousClickAtMs) return false;
  return params.nowMs - params.previousClickAtMs < ttlMs;
}

export type OutboundTargetValidationResult =
  | {
      ok: true;
      normalizedUrl: string;
      marketplace: string;
    }
  | {
      ok: false;
      error: "invalid_payload" | "url_mismatch" | "unsupported_market";
    };

export function validateOutboundClickTarget(params: {
  rawUrl: string;
  expectedListingUrl: string | null;
  listingMarket: string | null;
}): OutboundTargetValidationResult {
  const normalized = normalizeOutboundUrlForStorage(params.rawUrl);
  if (!normalized.ok) {
    return { ok: false, error: "invalid_payload" };
  }

  if (params.expectedListingUrl) {
    const expected = normalizeOutboundUrlForStorage(params.expectedListingUrl);
    if (expected.ok && expected.value !== normalized.value) {
      return { ok: false, error: "url_mismatch" };
    }
  }

  const compliance = getMarketplaceCompliance(params.listingMarket);
  if (!compliance) {
    return { ok: false, error: "unsupported_market" };
  }

  return {
    ok: true,
    normalizedUrl: normalized.value,
    marketplace: compliance.marketplace,
  };
}
