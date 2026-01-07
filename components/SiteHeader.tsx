import Link from "next/link";

/**
 * SiteHeader — Phase 1: Visual Legitimacy
 *
 * Minimal header with logo/brand and navigation links.
 * No behavior changes, display-only.
 */
export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="flex h-14 items-center justify-between">
          {/* Logo and brand */}
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-900 hover:text-slate-700"
          >
            <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
              <rect x="4" y="2" width="24" height="28" rx="3" fill="#0f172a" />
              <rect x="6" y="4" width="20" height="24" rx="2" fill="#1e293b" />
              <circle
                cx="16"
                cy="14"
                r="8"
                stroke="#10b981"
                strokeWidth="1.5"
                fill="none"
                opacity="0.3"
              />
              <circle
                cx="16"
                cy="14"
                r="5"
                stroke="#10b981"
                strokeWidth="1.5"
                fill="none"
                opacity="0.5"
              />
              <circle cx="16" cy="14" r="2" fill="#10b981" />
              <path d="M12 22 L16 20 L20 22 L16 24 Z" fill="#38bdf8" />
            </svg>
            <span className="font-semibold text-sm sm:text-base tracking-tight">
              TCG Deal Finder
            </span>
          </Link>

          {/* Navigation links */}
          <nav className="flex items-center gap-1 sm:gap-4 text-sm">
            <Link
              href="/top-deals"
              className="px-2 py-1 text-slate-800 hover:text-slate-900 rounded-md hover:bg-slate-100"
            >
              Top Deals
            </Link>
            <Link
              href="/newest"
              className="px-2 py-1 text-slate-800 hover:text-slate-900 rounded-md hover:bg-slate-100"
            >
              Newest
            </Link>
            <Link
              href="/watchlist"
              className="px-2 py-1 text-slate-800 hover:text-slate-900 rounded-md hover:bg-slate-100"
            >
              Watchlist
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
