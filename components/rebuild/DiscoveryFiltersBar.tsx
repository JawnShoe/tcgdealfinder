"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { parsePreset, type Preset } from "@/lib/rebuild/prefs/rebuildPrefs";
import {
  ALLOWED_CONDITIONS,
  ALLOWED_CONFIDENCE_THRESHOLDS,
  ALLOWED_LANGUAGES,
  DEFAULT_DISCOVERY_FILTERS,
  DEFAULT_DISCOVERY_PAGINATION,
  parseDiscoveryQueryFromUrlSearchParams,
  type ConfidenceThreshold,
  type Condition,
  type DiscoveryFilters,
  type Language,
} from "@/lib/rebuild/discovery/discoveryQuery";
import {
  DEFAULT_REBUILD_SORT,
  REBUILD_SORT_OPTIONS,
} from "@/lib/rebuild/prefs/rebuildPrefs";
import { buildDiscoveryUrl } from "@/lib/rebuild/urls";

type DiscoveryFiltersBarProps = {
  initialPreset: Preset;
  initialFilters: DiscoveryFilters;
  className?: string;
};

export default function DiscoveryFiltersBar({
  initialPreset,
  initialFilters,
  className,
}: DiscoveryFiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [preset, setPreset] = useState<Preset>(initialPreset);
  const [priceMinCad, setPriceMinCad] = useState<string>(
    initialFilters.priceMinCad != null ? String(initialFilters.priceMinCad) : ""
  );
  const [priceMaxCad, setPriceMaxCad] = useState<string>(
    initialFilters.priceMaxCad != null ? String(initialFilters.priceMaxCad) : ""
  );
  const [condition, setCondition] = useState<Condition | "">(
    initialFilters.condition ?? ""
  );
  const [language, setLanguage] = useState<Language | "">(
    initialFilters.language ?? ""
  );
  const [minConfidence, setMinConfidence] = useState<ConfidenceThreshold>(
    initialFilters.minConfidence
  );
  const [seller, setSeller] = useState<string>(initialFilters.seller ?? "");

  const searchParamsKey = searchParams.toString();
  const queryFromUrl = useMemo(() => {
    const parsed = parseDiscoveryQueryFromUrlSearchParams(searchParams);
    return parsed.kind === "ok" ? parsed.query : null;
  }, [searchParamsKey]);

  useEffect(() => {
    if (!queryFromUrl) return;
    setPreset(queryFromUrl.preset);
    setPriceMinCad(
      queryFromUrl.filters.priceMinCad != null
        ? String(queryFromUrl.filters.priceMinCad)
        : ""
    );
    setPriceMaxCad(
      queryFromUrl.filters.priceMaxCad != null
        ? String(queryFromUrl.filters.priceMaxCad)
        : ""
    );
    setCondition(queryFromUrl.filters.condition ?? "");
    setLanguage(queryFromUrl.filters.language ?? "");
    setMinConfidence(queryFromUrl.filters.minConfidence);
    setSeller(queryFromUrl.filters.seller ?? "");
  }, [queryFromUrl, searchParamsKey]);

  const basePath: "/discovery" | "/rebuild/discovery" =
    pathname === "/rebuild/discovery" ? "/rebuild/discovery" : "/discovery";

  const effectivePagination =
    queryFromUrl?.pagination ?? DEFAULT_DISCOVERY_PAGINATION;

  const filtersFromState = (): DiscoveryFilters => ({
    ...DEFAULT_DISCOVERY_FILTERS,
    priceMinCad: priceMinCad.trim() ? Number(priceMinCad.trim()) : null,
    priceMaxCad: priceMaxCad.trim() ? Number(priceMaxCad.trim()) : null,
    condition: condition || null,
    language: language || null,
    minConfidence,
    seller: seller.trim() ? seller.trim() : null,
  });

  const replaceWithPreset = (nextPreset: Preset) => {
    router.replace(
      buildDiscoveryUrl({
        preset: nextPreset,
        basePath,
        filters: filtersFromState(),
        pagination: { page: 1, pageSize: effectivePagination.pageSize },
      }),
      { scroll: false }
    );
  };

  const handleApply = (form: HTMLFormElement) => {
    const sortRaw = String(new FormData(form).get("sort") ?? "");
    const presetResult = parsePreset(sortRaw);
    const resolvedPreset =
      typeof presetResult === "string" ? presetResult : DEFAULT_REBUILD_SORT;

    replaceWithPreset(resolvedPreset);
  };

  const handlePresetChange = (nextPreset: Preset) => {
    setPreset(nextPreset);
    replaceWithPreset(nextPreset);
  };

  const handleClear = () => {
    setPreset(DEFAULT_REBUILD_SORT);
    setPriceMinCad("");
    setPriceMaxCad("");
    setCondition("");
    setLanguage("");
    setMinConfidence("any");
    setSeller("");

    router.replace(
      buildDiscoveryUrl({
        preset: DEFAULT_REBUILD_SORT,
        basePath,
        pagination: {
          page: 1,
          pageSize: DEFAULT_DISCOVERY_PAGINATION.pageSize,
        },
      }),
      { scroll: false }
    );
  };

  return (
    <form
      data-testid="discovery-filters-bar"
      className={`mt-4 rounded-lg border border-slate-200 bg-white px-4 py-3 ${className ?? ""}`}
      onSubmit={(event) => {
        event.preventDefault();
        handleApply(event.currentTarget);
      }}
    >
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-700">
            Sort
            <select
              data-testid="discovery-sort-select"
              className="mt-1 block rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
              name="sort"
              value={preset}
              onChange={(event) =>
                handlePresetChange(event.target.value as Preset)
              }
            >
              {REBUILD_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-700">
            Min price (CAD)
            <input
              data-testid="discovery-filter-min-price-cad"
              className="mt-1 block w-28 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
              inputMode="numeric"
              pattern="\\d*"
              value={priceMinCad}
              onChange={(event) =>
                setPriceMinCad(event.target.value.replace(/[^\d]/g, ""))
              }
            />
          </label>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-700">
            Max price (CAD)
            <input
              className="mt-1 block w-28 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
              inputMode="numeric"
              pattern="\\d*"
              value={priceMaxCad}
              onChange={(event) =>
                setPriceMaxCad(event.target.value.replace(/[^\d]/g, ""))
              }
            />
          </label>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-700">
            Condition
            <select
              className="mt-1 block w-28 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
              value={condition}
              onChange={(event) =>
                setCondition(event.target.value as Condition | "")
              }
            >
              <option value="">Any</option>
              {ALLOWED_CONDITIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-700">
            Language
            <select
              className="mt-1 block w-28 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
              value={language}
              onChange={(event) =>
                setLanguage(event.target.value as Language | "")
              }
            >
              <option value="">Any</option>
              {ALLOWED_LANGUAGES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-700">
            Min confidence
            <select
              className="mt-1 block w-28 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
              value={minConfidence}
              onChange={(event) =>
                setMinConfidence(event.target.value as ConfidenceThreshold)
              }
            >
              {ALLOWED_CONFIDENCE_THRESHOLDS.map((value) => (
                <option key={value} value={value}>
                  {value === "any"
                    ? "Any"
                    : value === "medium"
                      ? "Medium+"
                      : "High"}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="min-w-[10rem] flex-1">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-700">
            Seller
            <input
              data-testid="discovery-filter-seller"
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
              value={seller}
              onChange={(event) => setSeller(event.target.value)}
            />
          </label>
        </div>

        <div className="flex gap-2">
          <button
            data-testid="discovery-filters-apply"
            type="submit"
            className="rounded-md border border-slate-300 bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Apply
          </button>
          <button
            data-testid="discovery-filters-clear"
            type="button"
            className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            onClick={handleClear}
          >
            Clear
          </button>
        </div>
      </div>
    </form>
  );
}
