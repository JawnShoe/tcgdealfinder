import { notFound } from "next/navigation";

import { AdminAlertsClient } from "../../../components/AdminAlertsClient";
import { query } from "../../../lib/db";

const ADMIN_SECRET = "V6DU6T^P9fSx";

type SearchParams = Record<string, string | string[] | undefined>;

type WatchRow = {
  id: number;
  card_id: number;
  card_name: string;
  set_name: string;
  card_number: string | null;
  condition: string | null;
  threshold_type: string;
  threshold_value: string | number;
  active: boolean;
  note: string | null;
  created_at: string;
  last_checked_at: string | null;
  last_triggered_at: string | null;
};

type AlertRow = {
  id: number;
  watch_id: number;
  card_id: number;
  card_name: string;
  set_name: string;
  card_number: string | null;
  condition: string | null;
  total_price_cad: string | null;
  median_price_cad: string | null;
  discount_percent: string | null;
  created_at: string;
};

export default async function AdminAlertsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const secretParam = searchParams?.secret;
  const providedSecret = Array.isArray(secretParam)
    ? secretParam[0]
    : secretParam ?? "";

  if (providedSecret !== ADMIN_SECRET) {
    notFound();
  }

  const watchRes = await query<WatchRow>(
    `
      SELECT
        w.id,
        w.card_id,
        c.name AS card_name,
        c.set_name,
        c.card_number,
        w.condition,
        w.threshold_type,
        w.threshold_value,
        w.active,
        w.note,
        w.created_at,
        w.last_checked_at,
        w.last_triggered_at
      FROM alerts_watchlist w
      JOIN cards c ON c.id = w.card_id
      ORDER BY w.created_at DESC;
    `,
  );
  const watches = watchRes.rows.map((row: WatchRow) => ({
    id: row.id,
    cardId: row.card_id,
    cardName: row.card_name,
    setName: row.set_name,
    cardNumber: row.card_number,
    condition: row.condition,
    thresholdType: row.threshold_type,
    thresholdValue:
      typeof row.threshold_value === "number"
        ? row.threshold_value
        : Number(row.threshold_value),
    active: row.active,
    note: row.note,
    createdAt: row.created_at,
    lastCheckedAt: row.last_checked_at,
    lastTriggeredAt: row.last_triggered_at,
  }));

  const alertsRes = await query<AlertRow>(
    `
      SELECT
        l.id,
        l.watch_id,
        l.card_id,
        c.name AS card_name,
        c.set_name,
        c.card_number,
        l.condition,
        l.total_price_cad,
        l.median_price_cad,
        l.discount_percent,
        l.created_at
      FROM alerts_log l
      JOIN cards c ON c.id = l.card_id
      ORDER BY l.created_at DESC
      LIMIT 50;
    `,
  );

  const alerts = alertsRes.rows.map((row: AlertRow) => ({
    id: row.id,
    watchId: row.watch_id,
    cardId: row.card_id,
    cardName: row.card_name,
    setName: row.set_name,
    cardNumber: row.card_number,
    condition: row.condition,
    totalPriceCad:
      row.total_price_cad != null ? Number(row.total_price_cad) : null,
    medianPriceCad:
      row.median_price_cad != null ? Number(row.median_price_cad) : null,
    discountPercent:
      row.discount_percent != null ? Number(row.discount_percent) : null,
    createdAt: row.created_at,
  }));

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <AdminAlertsClient
        watches={watches}
        alerts={alerts}
        adminSecret={ADMIN_SECRET}
      />
    </main>
  );
}
