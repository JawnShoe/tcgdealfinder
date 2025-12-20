import { notFound } from "next/navigation";

import { isAdminAuthenticated } from "../../../lib/adminAuth";
import { AdminToolbar } from "../../../components/AdminToolbar";

export default async function AdminExclusionsPage() {
  if (!process.env.ADMIN_SECRET || !isAdminAuthenticated()) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <AdminToolbar current="exclusions" />
      <div className="panel">
        <h1 className="text-2xl font-semibold text-slate-900">Exclusions</h1>
        <p className="text-sm text-slate-500">
          Listing-level triage lives in the debug exclusions panel.
        </p>
        <div className="mt-3">
          <a
            href="/debug/exclusions"
            className="text-sm font-medium text-amber-600 hover:text-amber-700"
          >
            Open debug exclusions
          </a>
        </div>
      </div>
    </main>
  );
}
