import { queryRebuild } from "../db";
import { isRebuildDbConfigured } from "./dataAvailability";

export type RebuildFreshnessSnapshot = {
  status: "ok" | "stale" | "unknown" | "unavailable";
  latestUpdatedAtISO: string | null;
  ageHours: number | null;
  count24h: number | null;
};

const STALE_HOURS = 6;

export async function getRebuildFreshnessSnapshot(): Promise<RebuildFreshnessSnapshot> {
  if (!isRebuildDbConfigured()) {
    return {
      status: "unavailable",
      latestUpdatedAtISO: null,
      ageHours: null,
      count24h: null,
    };
  }

  const result = await queryRebuild<{
    latest_updated_at: Date | string | null;
    count_24h: number | string | null;
  }>(
    `
      SELECT
        MAX(updated_at) AS latest_updated_at,
        COUNT(*) FILTER (WHERE updated_at >= NOW() - INTERVAL '24 hours') AS count_24h
      FROM listings;
    `
  );

  const row = result.rows[0];
  const latestRaw = row?.latest_updated_at ?? null;
  const latestDate = latestRaw ? new Date(latestRaw) : null;
  const count24h = row?.count_24h != null ? Number(row.count_24h) : null;

  if (!latestDate || Number.isNaN(latestDate.getTime())) {
    return {
      status: "unknown",
      latestUpdatedAtISO: null,
      ageHours: null,
      count24h,
    };
  }

  const ageHours = (Date.now() - latestDate.getTime()) / 36e5;
  const status = ageHours > STALE_HOURS ? "stale" : "ok";

  return {
    status,
    latestUpdatedAtISO: latestDate.toISOString(),
    ageHours: Math.round(ageHours * 10) / 10,
    count24h,
  };
}
