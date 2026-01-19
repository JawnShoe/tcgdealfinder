import { cadCurrencyCode } from "@/lib/rebuild/currency/cad";

export type RebuildBudgetCurrency = typeof cadCurrencyCode | "USD" | "NATIVE";

export type RebuildBudgetPreference = {
  max: number | null;
  currency: RebuildBudgetCurrency | null;
};

export type RebuildConditionPreference =
  | "any"
  | "sealed"
  | "near-mint"
  | "played";

export type RebuildActionPrefs = {
  budget: RebuildBudgetPreference;
  condition: RebuildConditionPreference;
  trustMinConfidence: number | null;
};

const DEFAULT_CONDITION: RebuildConditionPreference = "any";

export function parseRebuildActionPrefs(searchParams: {
  [key: string]: string | string[] | undefined;
}): RebuildActionPrefs {
  const budgetMax = parseOptionalNumber(getFirst(searchParams.budgetMax));
  const budgetCurrency = parseCurrency(getFirst(searchParams.budgetCurrency));
  const condition = parseCondition(getFirst(searchParams.condition));
  const trustMinConfidence = parseConfidence(
    getFirst(searchParams.trustMinConfidence)
  );

  return {
    budget: {
      max: budgetMax,
      currency: budgetCurrency,
    },
    condition,
    trustMinConfidence,
  };
}

export function serializeRebuildActionPrefs(
  prefs: RebuildActionPrefs
): URLSearchParams {
  const params = new URLSearchParams();
  if (prefs.budget.max != null) {
    params.set("budgetMax", prefs.budget.max.toString());
  }
  if (prefs.budget.currency) {
    params.set("budgetCurrency", prefs.budget.currency);
  }
  if (prefs.condition !== DEFAULT_CONDITION) {
    params.set("condition", prefs.condition);
  }
  if (prefs.trustMinConfidence != null) {
    params.set("trustMinConfidence", prefs.trustMinConfidence.toString());
  }
  return params;
}

function getFirst(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function parseOptionalNumber(value: string | undefined): number | null {
  if (!value) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  return numeric;
}

function parseCurrency(
  value: string | undefined
): RebuildBudgetCurrency | null {
  if (!value) return null;
  const normalized = value.toUpperCase();
  if (normalized === cadCurrencyCode) return cadCurrencyCode;
  if (normalized === "USD") return "USD";
  if (normalized === "NATIVE") return "NATIVE";
  return null;
}

function parseCondition(value: string | undefined): RebuildConditionPreference {
  switch (value) {
    case "sealed":
      return "sealed";
    case "near-mint":
      return "near-mint";
    case "played":
      return "played";
    default:
      return DEFAULT_CONDITION;
  }
}

function parseConfidence(value: string | undefined): number | null {
  if (!value) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  if (numeric < 0 || numeric > 1) {
    return null;
  }
  return numeric;
}
