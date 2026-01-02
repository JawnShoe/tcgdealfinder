import type { Metadata } from "next";
import Link from "next/link";

import { isAlertsEnabled } from "../../lib/featureFlags";
import { AlertsSubscribeClient } from "../../components/AlertsSubscribeClient";
import { query } from "../../lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Email Alerts | TCG Deal Finder",
  description: "Get email alerts when cards hit your target discount.",
};

type CardRow = {
  id: number;
  name: string;
};

async function getCardInfo(
  cardId: number | null
): Promise<{ id: number; name: string } | null> {
  if (!cardId || cardId <= 0) return null;

  try {
    const res = await query<CardRow>(
      `SELECT id, name FROM cards WHERE id = $1 LIMIT 1`,
      [cardId]
    );
    if (res.rows.length === 0) return null;
    return { id: res.rows[0].id, name: res.rows[0].name };
  } catch {
    return null;
  }
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AlertsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const cardIdParam = params.cardId;
  const cardIdNum =
    typeof cardIdParam === "string" ? Number(cardIdParam) : null;
  const validCardId =
    cardIdNum && Number.isFinite(cardIdNum) && cardIdNum > 0 ? cardIdNum : null;

  // Feature flag check
  const alertsEnabled = isAlertsEnabled();

  if (!alertsEnabled) {
    return (
      <main className="page-shell space-y-6 py-6">
        <div className="panel space-y-4 text-center">
          <h1 className="text-2xl font-bold text-slate-900">
            Alerts Not Enabled
          </h1>
          <p className="text-sm text-slate-600">
            Email alerts are not enabled yet. Check back soon!
          </p>
          <Link href="/" className="inline-link">
            Browse current deals
          </Link>
        </div>
      </main>
    );
  }

  // Fetch card info if cardId provided
  const cardInfo = await getCardInfo(validCardId);

  return (
    <main className="page-shell space-y-6 py-6">
      <div className="mx-auto max-w-lg">
        <div className="space-y-2 pb-4">
          <h1 className="text-2xl font-bold text-slate-900">
            Subscribe to Alerts
          </h1>
          <p className="text-sm text-slate-600">
            Get notified by email when a card hits your target discount.
          </p>
        </div>

        <AlertsSubscribeClient
          initialCardId={cardInfo?.id ?? validCardId}
          initialCardName={cardInfo?.name ?? null}
        />
      </div>
    </main>
  );
}
