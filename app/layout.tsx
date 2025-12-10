import "../app/globals.css";

import Link from "next/link";
import type { Metadata } from "next";

import { SearchAutocomplete } from "../components/SearchAutocomplete";

export const metadata: Metadata = {
  title: "TCG Deal Finder",
  description: "TCG deals powered by eBay + catalog data",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur supports-backdrop-blur:bg-white/80">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
            <Link href="/" className="text-2xl font-semibold text-slate-900">
              TCG Deal Finder
            </Link>
            <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center md:justify-end md:gap-4">
              <nav className="flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-600">
                <Link href="/" className="hover:text-slate-900">
                  Deals
                </Link>
                <Link href="/top-deals" className="hover:text-slate-900">
                  Top deals
                </Link>
                <Link href="/ending-soon" className="hover:text-slate-900">
                  Ending soon
                </Link>
                <Link href="/sets" className="hover:text-slate-900">
                  Browse by set
                </Link>
                <Link href="/catalog" className="hover:text-slate-900">
                  Catalog
                </Link>
                <Link href="/alerts" className="hover:text-slate-900">
                  Alerts
                </Link>
                <Link href="/watchlist" className="hover:text-slate-900">
                  Watchlist
                </Link>
              </nav>
              <div className="w-full md:max-w-[320px]">
                <SearchAutocomplete />
              </div>
            </div>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}

