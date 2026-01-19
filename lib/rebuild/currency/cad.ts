import { FX_CAD_TO_USD } from "@/lib/money";
import { toUsdCentsFromUsdDollars, type UsdCents } from "./canonical";

export const cadCurrencyCode = "CAD" as const;

export function toUsdCentsFromCadDollars(amountCad: number): UsdCents {
  if (!Number.isFinite(amountCad)) {
    throw new Error(`Invalid ${cadCurrencyCode} amount: ${amountCad}`);
  }
  return toUsdCentsFromUsdDollars(amountCad * FX_CAD_TO_USD);
}
