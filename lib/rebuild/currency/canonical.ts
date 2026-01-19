export const CANONICAL_CURRENCY = "USD" as const;

declare const __usdCentsBrand: unique symbol;
export type UsdCents = number & { readonly [__usdCentsBrand]: "UsdCents" };

export function toUsdCentsFromUsdDollars(amountUsd: number): UsdCents {
  if (!Number.isFinite(amountUsd)) {
    throw new Error(`Invalid USD amount: ${amountUsd}`);
  }
  return Math.round((amountUsd + Number.EPSILON) * 100) as UsdCents;
}

export function toUsdDollarsFromUsdCents(amountUsdCents: UsdCents): number {
  return Number(amountUsdCents) / 100;
}
