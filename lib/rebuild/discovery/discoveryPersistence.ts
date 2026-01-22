import { parsePreset, type Preset } from "@/lib/rebuild/prefs/rebuildPrefs";
import {
  ALLOWED_CONDITIONS,
  ALLOWED_CONFIDENCE_THRESHOLDS,
  ALLOWED_LANGUAGES,
  ALLOWED_MARKETS,
  DEFAULT_DISCOVERY_FILTERS,
  DEFAULT_DISCOVERY_PAGINATION,
  type ConfidenceThreshold,
  type Condition,
  type DiscoveryFilters,
  type Language,
  type Market,
} from "@/lib/rebuild/discovery/discoveryQuery";

export const DISCOVERY_PERSISTENCE_KEY = "rebuild.discovery.v1" as const;

const PERSISTENCE_VERSION = 1 as const;

const ALLOWED_PAGE_SIZES = [25, 50, 100] as const;
type PageSize = (typeof ALLOWED_PAGE_SIZES)[number];

type PersistedDiscoveryStateV1 = {
  v: typeof PERSISTENCE_VERSION;
  preset: Preset;
  filters: DiscoveryFilters;
  pageSize: number;
};

export type PersistedDiscoveryState = {
  preset: Preset;
  filters: DiscoveryFilters;
  pageSize: PageSize;
};

export type DiscoveryPersistenceWriteInput = {
  preset: Preset;
  filters: DiscoveryFilters;
  pageSize: number;
};

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function normalizeNullableNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value !== "number") return null;
  if (!Number.isFinite(value)) return null;
  return value;
}

function normalizeOptionalString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeEnum<T extends readonly string[]>(
  allowed: T,
  value: unknown
): T[number] | null {
  if (typeof value !== "string") return null;
  return allowed.includes(value) ? (value as T[number]) : null;
}

function normalizePreset(value: unknown): Preset | null {
  if (typeof value !== "string") return null;
  const parsed = parsePreset(value);
  return typeof parsed === "string" ? parsed : null;
}

function normalizePageSize(value: unknown): PageSize {
  if (typeof value === "number" && Number.isFinite(value)) {
    const candidate = Math.trunc(value);
    if (ALLOWED_PAGE_SIZES.includes(candidate as PageSize)) {
      return candidate as PageSize;
    }
  }
  return DEFAULT_DISCOVERY_PAGINATION.pageSize as PageSize;
}

function normalizeFilters(value: unknown): DiscoveryFilters {
  if (value == null || typeof value !== "object") {
    return { ...DEFAULT_DISCOVERY_FILTERS };
  }

  const record = value as Record<string, unknown>;
  const condition = normalizeEnum(
    ALLOWED_CONDITIONS,
    record.condition
  ) as Condition | null;
  const language = normalizeEnum(
    ALLOWED_LANGUAGES,
    record.language
  ) as Language | null;
  const market = normalizeEnum(ALLOWED_MARKETS, record.market) as Market | null;
  const minConfidence = normalizeEnum(
    ALLOWED_CONFIDENCE_THRESHOLDS,
    record.minConfidence
  ) as ConfidenceThreshold | null;

  return {
    ...DEFAULT_DISCOVERY_FILTERS,
    priceMinCad: normalizeNullableNumber(record.priceMinCad),
    priceMaxCad: normalizeNullableNumber(record.priceMaxCad),
    condition,
    language,
    market,
    minConfidence: minConfidence ?? DEFAULT_DISCOVERY_FILTERS.minConfidence,
    seller: normalizeOptionalString(record.seller),
  };
}

export function readDiscoveryPersistence(): PersistedDiscoveryState | null {
  const storage = getLocalStorage();
  if (!storage) return null;

  let raw: string | null = null;
  try {
    raw = storage.getItem(DISCOVERY_PERSISTENCE_KEY);
  } catch {
    return null;
  }

  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }

  if (parsed == null || typeof parsed !== "object") return null;
  const record = parsed as Record<string, unknown>;

  if (record.v !== PERSISTENCE_VERSION) return null;

  const preset = normalizePreset(record.preset);
  if (!preset) return null;

  return {
    preset,
    filters: normalizeFilters(record.filters),
    pageSize: normalizePageSize(record.pageSize),
  };
}

export function writeDiscoveryPersistence(
  state: DiscoveryPersistenceWriteInput
): void {
  const storage = getLocalStorage();
  if (!storage) return;

  const pageSize = normalizePageSize(state.pageSize);

  const payload: PersistedDiscoveryStateV1 = {
    v: PERSISTENCE_VERSION,
    preset: state.preset,
    filters: state.filters,
    pageSize,
  };

  try {
    storage.setItem(DISCOVERY_PERSISTENCE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export function clearDiscoveryPersistence(): void {
  const storage = getLocalStorage();
  if (!storage) return;

  try {
    storage.removeItem(DISCOVERY_PERSISTENCE_KEY);
  } catch {
    // ignore
  }
}
