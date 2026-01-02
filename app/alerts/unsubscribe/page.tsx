import type { Metadata } from "next";
import Link from "next/link";

import { isAlertsEnabled } from "../../../lib/featureFlags";
import { unsubscribeByToken } from "../../../lib/emailSubscriptions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Unsubscribe from Alerts | TCG Deal Finder",
  description: "Unsubscribe from email alerts.",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AlertsUnsubscribePage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const tokenParam = params.token;
  const token = typeof tokenParam === "string" ? tokenParam.trim() : null;

  // Feature flag check
  const alertsEnabled = isAlertsEnabled();

  if (!alertsEnabled) {
    return (
      <main className="page-shell space-y-6 py-6">
        <div className="mx-auto max-w-md">
          <div className="panel space-y-4 text-center">
            <h1 className="text-2xl font-bold text-slate-900">
              Alerts Not Enabled
            </h1>
            <p className="text-sm text-slate-600">
              Email alerts are not enabled yet.
            </p>
            <Link href="/" className="inline-link">
              Browse current deals
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Missing token
  if (!token) {
    return (
      <main className="page-shell space-y-6 py-6">
        <div className="mx-auto max-w-md">
          <div className="panel space-y-4 text-center">
            <h1 className="text-2xl font-bold text-slate-900">Missing Token</h1>
            <p className="text-sm text-slate-600">
              No unsubscribe token was provided. Please use the link from your
              alert email.
            </p>
            <Link href="/" className="inline-link">
              Browse current deals
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Attempt to unsubscribe
  let success = false;
  try {
    success = await unsubscribeByToken(token);
  } catch (error) {
    console.error("Unsubscribe error:", error);
    success = false;
  }

  if (success) {
    return (
      <main className="page-shell space-y-6 py-6">
        <div className="mx-auto max-w-md">
          <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
            <h1 className="text-xl font-bold text-green-800">
              Unsubscribed Successfully
            </h1>
            <p className="mt-2 text-sm text-green-700">
              You have been unsubscribed from alerts for this card. You will no
              longer receive emails for this subscription.
            </p>
          </div>
          <div className="mt-6 text-center">
            <Link href="/" className="inline-link">
              Browse current deals
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Token invalid or already unsubscribed
  return (
    <main className="page-shell space-y-6 py-6">
      <div className="mx-auto max-w-md">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
          <h1 className="text-xl font-bold text-amber-800">
            Already Unsubscribed
          </h1>
          <p className="mt-2 text-sm text-amber-700">
            This unsubscribe link is invalid or has already been used. You may
            have already unsubscribed from this alert.
          </p>
        </div>
        <div className="mt-6 text-center">
          <Link href="/" className="inline-link">
            Browse current deals
          </Link>
        </div>
      </div>
    </main>
  );
}
