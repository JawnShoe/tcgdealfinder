"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { RebuildSort } from "@/lib/rebuild/prefs/rebuildPrefs";
import {
  DEFAULT_REBUILD_SORT,
  parseRebuildSortValue,
  REBUILD_SORT_OPTIONS,
} from "@/lib/rebuild/prefs/rebuildPrefs";

type PreferencesBarProps = {
  initialSort: RebuildSort;
  className?: string;
};

export default function PreferencesBar({
  initialSort,
  className,
}: PreferencesBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const searchParamsKey = searchParams.toString();
  const sortFromUrl = useMemo(() => {
    const parsed = parseRebuildSortValue(
      new URLSearchParams(searchParamsKey).get("sort")
    );
    return parsed || initialSort;
  }, [searchParamsKey, initialSort]);

  const [sort, setSort] = useState<RebuildSort>(() => sortFromUrl);

  useEffect(() => {
    if (sortFromUrl !== sort) {
      setSort(sortFromUrl);
    }
  }, [sortFromUrl, sort]);

  const handleSortChange = (nextSort: RebuildSort) => {
    setSort(nextSort);
    const params = new URLSearchParams(searchParams);
    if (nextSort === DEFAULT_REBUILD_SORT) {
      params.delete("sort");
    } else {
      params.set("sort", nextSort);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  return (
    <div
      className={`mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 ${className ?? ""}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
        Preferences
      </p>
      <label className="flex items-center gap-2 text-xs text-slate-600">
        Sort
        <select
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
          value={sort}
          onChange={(event) =>
            handleSortChange(event.target.value as RebuildSort)
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
  );
}
