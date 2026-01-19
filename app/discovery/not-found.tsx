import Link from "next/link";
import { buildDiscoveryUrl } from "@/lib/rebuild/urls";
import { DEFAULT_REBUILD_SORT } from "@/lib/rebuild/prefs/rebuildPrefs";

export default function DiscoveryNotFound() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <h1 className="text-2xl font-semibold text-slate-900">Discovery</h1>
          <p className="mt-2 text-sm text-slate-700">
            Invalid discovery filters or preset.
          </p>
          <div className="mt-4">
            <Link
              className="inline-flex rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              href={buildDiscoveryUrl({
                preset: DEFAULT_REBUILD_SORT,
                includeDefaultPreset: true,
              })}
            >
              Reset filters
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
