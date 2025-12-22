import type { MarketFilterKey } from "./filters";

export async function persistMarketPreference(
  market: MarketFilterKey,
): Promise<void> {
  try {
    await fetch("/api/market", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ market }),
    });
  } catch (error) {
    console.warn("Failed to persist market preference", error);
  }
}
