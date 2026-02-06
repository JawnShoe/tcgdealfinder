import Link from "next/link";
import Image from "next/image";
import { buildDiscoveryUrl } from "@/lib/rebuild/urls";

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
            <Image
              src="/brand/logo.png"
              alt="TCG Deal Finder"
              width={28}
              height={28}
              className="h-7 w-7"
              style={{ imageRendering: "pixelated" }}
              priority
            />
            <span className="font-semibold text-sm sm:text-base tracking-tight">
              TCG Deal Finder
            </span>
          </Link>

          {/* Navigation links */}
          <nav className="flex items-center gap-1 sm:gap-4 text-sm">
            <Link
              href={buildDiscoveryUrl({ preset: "biggest-discount" })}
              className="px-2 py-1 text-slate-800 hover:text-slate-900 rounded-md hover:bg-slate-100"
            >
              Top Deals
            </Link>
            <Link
              href={buildDiscoveryUrl({
                preset: "newest",
                includeDefaultPreset: true,
              })}
              className="px-2 py-1 text-slate-800 hover:text-slate-900 rounded-md hover:bg-slate-100"
            >
              Newest
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
