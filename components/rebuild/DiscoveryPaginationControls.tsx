"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Preset } from "@/lib/rebuild/prefs/rebuildPrefs";
import type { DiscoveryFilters } from "@/lib/rebuild/discovery/discoveryQuery";
import { buildDiscoveryUrl } from "@/lib/rebuild/urls";

const ALLOWED_PAGE_SIZES = [25, 50, 100] as const;

type DiscoveryPaginationControlsProps = {
  preset: Preset;
  filters: DiscoveryFilters;
  page: number;
  pageSize: number;
  totalCount: number;
};

function normalizePageSize(
  pageSize: number
): (typeof ALLOWED_PAGE_SIZES)[number] {
  if ((ALLOWED_PAGE_SIZES as readonly number[]).includes(pageSize)) {
    return pageSize as (typeof ALLOWED_PAGE_SIZES)[number];
  }
  return 25;
}

export default function DiscoveryPaginationControls({
  preset,
  filters,
  page,
  pageSize,
  totalCount,
}: DiscoveryPaginationControlsProps) {
  const router = useRouter();

  const basePath = "/discovery" as const;

  const normalizedPageSize = useMemo(
    () => normalizePageSize(pageSize),
    [pageSize]
  );

  const totalPages = useMemo(() => {
    if (totalCount <= 0) return 1;
    return Math.max(1, Math.ceil(totalCount / normalizedPageSize));
  }, [normalizedPageSize, totalCount]);

  const clampedPage = Math.max(1, page);
  const hasPrev = clampedPage > 1;
  const hasNext = clampedPage * normalizedPageSize < totalCount;

  const goToPage = (nextPage: number) => {
    router.replace(
      buildDiscoveryUrl({
        preset,
        basePath,
        filters,
        pagination: {
          page: Math.max(1, nextPage),
          pageSize: normalizedPageSize,
        },
      }),
      { scroll: false }
    );
  };

  return (
    <div
      data-testid="discovery-pagination"
      className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-700"
    >
      <div className="flex items-center gap-2">
        <span data-testid="discovery-pagination-page">
          Page {clampedPage} of {totalPages}
        </span>
        <span className="text-slate-500">·</span>
        <span>
          Page size{" "}
          <select
            data-testid="discovery-pagination-page-size"
            className="ml-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
            value={String(normalizedPageSize)}
            onChange={(event) => {
              const parsed = Number(event.target.value);
              const nextSize = normalizePageSize(parsed);
              router.replace(
                buildDiscoveryUrl({
                  preset,
                  basePath,
                  filters,
                  pagination: { page: 1, pageSize: nextSize },
                }),
                { scroll: false }
              );
            }}
          >
            {ALLOWED_PAGE_SIZES.map((size) => (
              <option key={size} value={String(size)}>
                {size}
              </option>
            ))}
          </select>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          data-testid="discovery-pagination-prev"
          type="button"
          className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!hasPrev}
          onClick={() => goToPage(clampedPage - 1)}
        >
          Prev
        </button>
        <button
          data-testid="discovery-pagination-next"
          type="button"
          className="rounded-md border border-slate-300 bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!hasNext}
          onClick={() => goToPage(clampedPage + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
