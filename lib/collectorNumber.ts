export type CollectorNumberConfidence = "NONE" | "LOW" | "MED" | "HIGH";

export type CollectorNumberResult = {
  raw: string | null;
  norm: string | null;
  confidence: CollectorNumberConfidence;
  signals: string[];
};

type CollectorNumberSource = {
  title?: string | null;
  aspects?: Array<{ name?: string; value?: string }> | null;
};

const CONFIDENCE_ORDER: Record<CollectorNumberConfidence, number> = {
  NONE: 0,
  LOW: 1,
  MED: 2,
  HIGH: 3,
};

const ASPECT_NAMES = new Set(
  ["card number", "collector number", "card #", "number"].map((value) =>
    value.toLowerCase(),
  ),
);

const PROMO_PREFIXES = ["SWSH", "SV", "SVP", "SM", "XY", "BW", "DP", "HGSS", "GG"];
const NEGATIVE_CONTEXT = /\b(PSA|BGS|BECKETT|CGC|BVG|BGA|PGS|1\/1|X\d+|LOT)\b/i;
export const MAX_PLAIN_COLLECTOR_NUMBER = 999;

export function normalizeCollectorNumber(
  input: string | null | undefined,
): string | null {
  if (!input) return null;
  const cleaned = input
    .toUpperCase()
    .replace(/[^A-Z0-9/]/g, "")
    .replace(/\/+/g, "/");
  return cleaned || null;
}

export function extractCollectorNumber(
  source: CollectorNumberSource,
): CollectorNumberResult {
  const signals: string[] = [];

  const candidates: CollectorNumberResult[] = [];

  const addCandidate = (
    raw: string,
    confidence: CollectorNumberConfidence,
    signal: string,
  ) => {
    const norm = normalizeCollectorNumber(raw);
    if (!norm) return;
    candidates.push({ raw, norm, confidence, signals: [signal] });
    signals.push(signal);
  };

  const fromAspects = extractFromAspects(source.aspects ?? []);
  if (fromAspects) {
    addCandidate(
      fromAspects.raw,
      fromAspects.confidence,
      `aspect:${fromAspects.signal}`,
    );
  }

  const fromTitle = extractFromTitle(source.title ?? "");
  if (fromTitle) {
    addCandidate(
      fromTitle.raw,
      fromTitle.confidence,
      `title:${fromTitle.signal}`,
    );
  }

  if (candidates.length === 0) {
    return { raw: null, norm: null, confidence: "NONE", signals };
  }

  candidates.sort(
    (a, b) =>
      CONFIDENCE_ORDER[b.confidence] - CONFIDENCE_ORDER[a.confidence],
  );
  const best = candidates[0];
  return {
    raw: best.raw,
    norm: best.norm,
    confidence: best.confidence,
    signals,
  };
}

function extractFromAspects(
  aspects: Array<{ name?: string; value?: string }>,
): { raw: string; confidence: CollectorNumberConfidence; signal: string } | null {
  for (const aspect of aspects) {
    const name = aspect.name?.trim();
    if (!name || !aspect.value) continue;
    if (!ASPECT_NAMES.has(name.toLowerCase())) continue;
    const raw = aspect.value.trim();
    if (!raw) continue;
    const confidence = classifyValue(raw, true);
    return {
      raw,
      confidence,
      signal: `${name}=${raw}`,
    };
  }
  return null;
}

function extractFromTitle(
  rawTitle: string,
): { raw: string; confidence: CollectorNumberConfidence; signal: string } | null {
  if (!rawTitle) return null;
  const normalized = rawTitle.toUpperCase();
  const signals: Array<{ raw: string; confidence: CollectorNumberConfidence; signal: string }> =
    [];

  for (const match of normalized.matchAll(
    /([A-Z]{0,3}\d{1,3}[A-Z]?)\s*\/\s*([A-Z]{0,3}\d{1,3}[A-Z]?)/g,
  )) {
    const left = match[1];
    const right = match[2];
    if (!left || !right) continue;
    const fraction = `${left}/${right}`;
    if (/^1\/1$/.test(fraction)) {
      continue;
    }
    signals.push({
      raw: fraction,
      confidence: "HIGH",
      signal: `fraction=${fraction}`,
    });
  }

  for (const prefix of PROMO_PREFIXES) {
    const promoPattern = new RegExp(`\\b${prefix}\\s*-?\\s*\\d{2,4}[A-Z]?\\b`, "i");
    const promoMatch = normalized.match(promoPattern);
    if (promoMatch) {
      const raw = promoMatch[0].replace(/\s|-/g, "");
      signals.push({
        raw,
        confidence: "HIGH",
        signal: `promo:${raw}`,
      });
    }
  }

  const suffixMatch = normalized.match(/\b\d{1,3}[A-Z]\b/);
  if (suffixMatch) {
    signals.push({
      raw: suffixMatch[0],
      confidence: "MED",
      signal: `suffix=${suffixMatch[0]}`,
    });
  }

  const digitMatches = [...normalized.matchAll(/\b\d{1,3}\b/g)];
  for (const match of digitMatches) {
    const raw = match[0] ?? "";
    if (!raw) continue;
    const value = Number(raw);
    if (Number.isNaN(value)) continue;
    if (value > MAX_PLAIN_COLLECTOR_NUMBER) continue;
    const vicinity = normalized.slice(
      Math.max(0, (match.index ?? 0) - 6),
      Math.min(normalized.length, (match.index ?? 0) + raw.length + 6),
    );
    if (NEGATIVE_CONTEXT.test(vicinity)) continue;
    signals.push({
      raw,
      confidence: value >= 10 ? "MED" : "LOW",
      signal: `digits=${raw}`,
    });
  }

  if (signals.length === 0) {
    return null;
  }
  signals.sort(
    (a, b) =>
      CONFIDENCE_ORDER[b.confidence] - CONFIDENCE_ORDER[a.confidence],
  );
  return signals[0];
}

function classifyValue(
  raw: string,
  structured: boolean,
): CollectorNumberConfidence {
  const normalized = raw.toUpperCase();
  if (/\d+\s*\/\s*\d+/.test(normalized)) {
    return structured ? "HIGH" : "MED";
  }
  for (const prefix of PROMO_PREFIXES) {
    const promoPattern = new RegExp(`^${prefix}`, "i");
    if (promoPattern.test(normalized)) {
      return "HIGH";
    }
  }
  if (/\d{1,3}[A-Z]$/.test(normalized)) {
    return structured ? "MED" : "LOW";
  }
  return structured ? "MED" : "LOW";
}

export function shouldRejectCollectorNumber(
  card: CollectorNumberResult,
  listing: CollectorNumberResult,
): { reject: boolean; detail?: string } {
  const cardRank = CONFIDENCE_ORDER[card.confidence];
  const listingRank = CONFIDENCE_ORDER[listing.confidence];
  if (cardRank < CONFIDENCE_ORDER.MED) return { reject: false };
  if (listingRank < CONFIDENCE_ORDER.MED) return { reject: false };
  if (!card.norm || !listing.norm) return { reject: false };
  if (card.norm === listing.norm) return { reject: false };

  const cardIsHigh = cardRank >= CONFIDENCE_ORDER.HIGH;
  const listingIsHigh = listingRank >= CONFIDENCE_ORDER.HIGH;

  if (
    (cardIsHigh && listingRank >= CONFIDENCE_ORDER.MED) ||
    (listingIsHigh && cardRank >= CONFIDENCE_ORDER.MED)
  ) {
    return {
      reject: true,
      detail: `cardCN=${card.norm} listingCN=${listing.norm}`,
    };
  }
  return { reject: false };
}
