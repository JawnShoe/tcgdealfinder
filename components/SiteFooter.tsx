import Link from "next/link";
import { buildDiscoveryUrl } from "@/lib/rebuild/urls";

/**
 * SiteFooter — Phase 1: Visual Legitimacy
 *
 * Minimal footer with data source disclosure and navigation.
 * Trust indicator: static text explaining data sources.
 * No behavior changes, display-only.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Data source disclosure — trust indicator (static text) */}
          <div className="text-xs text-slate-800 max-w-md">
            <p className="font-medium text-slate-900 mb-1">Data Sources</p>
            <p>
              Listings from eBay API. Historical prices from TCGPlayer market
              data. Prices shown in USD with automatic currency conversion for
              international markets.
            </p>
          </div>

          {/* Footer navigation */}
          <nav className="flex flex-wrap gap-4 text-xs text-slate-800">
            <Link href="/" className="hover:text-slate-700">
              Home
            </Link>
            <Link
              href={buildDiscoveryUrl({ preset: "biggest-discount" })}
              className="hover:text-slate-700"
            >
              Top Deals
            </Link>
            <Link
              href={buildDiscoveryUrl({ preset: "endingSoon" })}
              className="hover:text-slate-700"
            >
              Ending Soon
            </Link>
            <Link href="/alerts" className="hover:text-slate-700">
              Alerts
            </Link>
          </nav>
        </div>

        {/* Copyright */}
        <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-700">
          TCG Deal Finder — Real-time undervalued card detection
        </div>
      </div>
    </footer>
  );
}
