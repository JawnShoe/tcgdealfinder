import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminToastContainer } from "@/components/AdminActionFeedback";
import { AdminBlacklistPanel } from "@/components/AdminBlacklistPanel";
import { AdminExclusionsPanel } from "@/components/AdminExclusionsPanel";
import { AdminListingsPanel } from "@/components/AdminListingsPanel";
import { isAdminAuthenticated } from "@/lib/adminAuth";

type SearchParams = Record<string, string | string[] | undefined>;
type AdminTab = "exclusions" | "blacklist" | "listings";

const tabs: Array<{ key: AdminTab; label: string }> = [
  { key: "exclusions", label: "Exclusions" },
  { key: "blacklist", label: "Blacklist" },
  { key: "listings", label: "Listings" },
];

function getCurrentTab(searchParams?: SearchParams): AdminTab {
  const raw = Array.isArray(searchParams?.tab)
    ? searchParams?.tab[0]
    : searchParams?.tab;
  if (raw === "blacklist" || raw === "listings" || raw === "exclusions") {
    return raw;
  }
  return "exclusions";
}

export default async function AdminHubPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  if (!process.env.ADMIN_SECRET || !isAdminAuthenticated()) {
    notFound();
  }

  const current = getCurrentTab(searchParams);
  const sellerFilterRaw = Array.isArray(searchParams?.seller)
    ? searchParams?.seller[0]
    : searchParams?.seller;
  const sellerFilter = sellerFilterRaw?.trim().toLowerCase() || null;

  return (
    <AdminToastContainer>
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <div className="panel">
          <h1 className="text-2xl font-semibold text-slate-900">Admin hub</h1>
          <p className="text-sm text-slate-500">
            Operator workflow for exclusions, blacklist, and listing overrides.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {tabs.map((tab) => {
              const isActive = tab.key === current;
              return (
                <Link
                  key={tab.key}
                  href={`/admin?tab=${tab.key}`}
                  aria-current={isActive ? "page" : undefined}
                  className={`rounded-full border px-3 py-1 font-semibold transition ${
                    isActive
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 text-slate-600 hover:border-slate-400"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>

        {current === "exclusions" ? (
          <AdminExclusionsPanel
            searchParams={searchParams}
            basePath="/admin"
            baseQuery="tab=exclusions"
          />
        ) : null}

        {current === "blacklist" ? (
          <AdminBlacklistPanel
            sellerFilter={sellerFilter}
            clearFilterHref="/admin?tab=blacklist"
          />
        ) : null}

        {current === "listings" ? <AdminListingsPanel /> : null}
      </main>
    </AdminToastContainer>
  );
}
