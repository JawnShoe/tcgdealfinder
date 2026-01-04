"use client";

import { useMemo, useState } from "react";
import { AdminDealActions } from "./AdminDealActions";
import { buildDealViewModel, type DealViewModel } from "../lib/dealViewModel";
import { TopDealsColumns } from "../lib/tableColumns";
import { TooltipPopoverClientOnly } from "./TooltipPopoverClientOnly";
import type { Deal } from "../types/deal";

type ConfidenceFilterKey = "all" | "high" | "medium" | "low";
type HeaderSortKey =
  | "total"
  | "historic"
  | "discount"
  | "score"
  | "priceConf"
  | "seller";
type HeaderSort = {
  key: HeaderSortKey | null;
  dir: "asc" | "desc";
};

interface TopDealsClientProps {
  deals: Deal[];
  isAdmin?: boolean;
  referenceTime: number;
}

export default function TopDealsClient({
  deals,
  isAdmin = false,
  referenceTime,
}: TopDealsClientProps) {
  const [priceConfFilter, setPriceConfFilter] =
    useState<ConfidenceFilterKey>("all");
  const [headerSort, setHeaderSort] = useState<HeaderSort>({
    key: "score", // Default: Score DESC
    dir: "desc",
  });

  const viewModels = useMemo<DealViewModel[]>(() => {
    return deals.map((deal) =>
      buildDealViewModel(deal, {
        computeScore: true,
        referenceTime,
      })
    );
  }, [deals, referenceTime]);

  const filteredAndSorted = useMemo(() => {
    let filtered = viewModels;

    // Price confidence filter
    if (priceConfFilter !== "all") {
      filtered = filtered.filter((vm) => {
        const confLabel = vm.priceConfidenceLabel ?? "low";
        return confLabel === priceConfFilter;
      });
    }

    // Header sort
    if (headerSort.key) {
      const key = headerSort.key;
      const dir = headerSort.dir;
      filtered = [...filtered].sort((a, b) => {
        let aVal: number | string;
        let bVal: number | string;

        switch (key) {
          case "total":
            // Nulls sort last in both ASC and DESC
            aVal = a.totalUsd ?? (dir === "asc" ? Infinity : -Infinity);
            bVal = b.totalUsd ?? (dir === "asc" ? Infinity : -Infinity);
            break;
          case "historic":
            aVal = a.historicUsd ?? (dir === "asc" ? Infinity : -Infinity);
            bVal = b.historicUsd ?? (dir === "asc" ? Infinity : -Infinity);
            break;
          case "discount":
            aVal = a.discountPercent ?? (dir === "asc" ? Infinity : -Infinity);
            bVal = b.discountPercent ?? (dir === "asc" ? Infinity : -Infinity);
            break;
          case "score":
            aVal = a.score ?? (dir === "asc" ? Infinity : -Infinity);
            bVal = b.score ?? (dir === "asc" ? Infinity : -Infinity);
            break;
          case "priceConf":
            // High -> Med -> Low (map to numbers for sorting), nulls last
            const confMap = { high: 3, medium: 2, low: 1 };
            aVal = a.priceConfidenceLabel
              ? confMap[a.priceConfidenceLabel]
              : dir === "asc"
                ? Infinity
                : -Infinity;
            bVal = b.priceConfidenceLabel
              ? confMap[b.priceConfidenceLabel]
              : dir === "asc"
                ? Infinity
                : -Infinity;
            break;
          case "seller":
            aVal = a.deal.sellerUsername ?? "zzz";
            bVal = b.deal.sellerUsername ?? "zzz";
            break;
          default:
            aVal = 0;
            bVal = 0;
        }

        let cmp = 0;
        if (typeof aVal === "number" && typeof bVal === "number") {
          cmp = aVal - bVal;
        } else {
          cmp = String(aVal).localeCompare(String(bVal));
        }

        if (dir === "desc") cmp = -cmp;

        // Stable tie-break
        if (cmp === 0) {
          cmp = a.cardSortKey.localeCompare(b.cardSortKey);
          if (cmp === 0) {
            cmp = a.deal.id - b.deal.id;
          }
        }

        return cmp;
      });
    }

    return filtered;
  }, [viewModels, priceConfFilter, headerSort]);

  const handleHeaderSort = (key: HeaderSortKey) => {
    setHeaderSort((prev) => {
      if (prev.key === key) {
        return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      // Find column metadata for default direction
      const col = TopDealsColumns.find((c) => {
        const sortKey = c.sortKey as string | undefined;
        if (key === "total" && sortKey === "totalUsd") return true;
        if (key === "historic" && sortKey === "historicUsd") return true;
        if (key === "discount" && sortKey === "discountPercent") return true;
        if (key === "score" && sortKey === "score") return true;
        if (key === "priceConf" && sortKey === "confidenceWeight") return true;
        return false;
      });
      const defaultDir =
        col?.defaultDirection ?? (key === "seller" ? "asc" : "desc");
      return { key, dir: defaultDir };
    });
  };

  const SortArrow = ({ colKey }: { colKey: HeaderSortKey }) => {
    const isActive = headerSort.key === colKey;
    return (
      <span className="ml-1 inline-block w-3 text-center">
        {isActive ? (
          <span>{headerSort.dir === "asc" ? "▲" : "▼"}</span>
        ) : (
          <span className="invisible">▼</span>
        )}
      </span>
    );
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <label className="flex flex-col gap-1 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase text-slate-500">
            <span>Data reliability</span>
            <TooltipPopoverClientOnly
              content="Indicates how reliable recent pricing data is based on sales volume and consistency"
              ariaLabel="Data reliability help"
              triggerClassName="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] font-semibold text-slate-500"
              tooltipClassName="tooltip-wide"
              side="top"
              size="medium"
            >
              <span aria-hidden="true">?</span>
            </TooltipPopoverClientOnly>
          </span>
          <select
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            value={priceConfFilter}
            onChange={(event) =>
              setPriceConfFilter(event.target.value as ConfidenceFilterKey)
            }
          >
            <option value="all">All</option>
            <option value="high">High</option>
            <option value="medium">Med</option>
            <option value="low">Low</option>
          </select>
        </label>
      </div>

      {filteredAndSorted.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm text-slate-600">
            No high-confidence top deals found with current filters.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Try adjusting your filter selection.
          </p>
        </div>
      ) : (
        <div
          className="w-full"
          style={{ overflowX: "auto", overflowY: "clip" }}
        >
          <table className="min-w-full table-fixed text-sm text-slate-900">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                {TopDealsColumns.map((col) => {
                  // Check sortable metadata from column spec
                  const isSortable = col.sortable ?? false;
                  // Map sortKey from DealViewModel to HeaderSortKey
                  let sortKey: HeaderSortKey | null = null;
                  if (col.sortKey === "totalUsd") sortKey = "total";
                  else if (col.sortKey === "historicUsd") sortKey = "historic";
                  else if (col.sortKey === "discountPercent")
                    sortKey = "discount";
                  else if (col.sortKey === "score") sortKey = "score";
                  else if (col.sortKey === "confidenceWeight")
                    sortKey = "priceConf";

                  return (
                    <th
                      key={col.key}
                      className={`${col.headerClassName} ${col.width ?? ""} ${
                        isSortable
                          ? "cursor-pointer hover:bg-slate-100 select-none"
                          : ""
                      } ${col.key === "score" ? "hidden sm:table-cell" : ""}`}
                      onClick={
                        isSortable && sortKey
                          ? () => handleHeaderSort(sortKey)
                          : undefined
                      }
                      onKeyDown={
                        isSortable && sortKey
                          ? (event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                handleHeaderSort(sortKey);
                              }
                            }
                          : undefined
                      }
                      tabIndex={isSortable ? 0 : undefined}
                      aria-label={
                        isSortable && sortKey
                          ? `Sort by ${col.headerLabel}`
                          : undefined
                      }
                      aria-sort={
                        isSortable && sortKey
                          ? headerSort.key === sortKey
                            ? headerSort.dir === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                          : undefined
                      }
                    >
                      {isSortable && sortKey ? (
                        <span className="inline-flex items-center">
                          <span>{col.headerLabel}</span>
                          <SortArrow colKey={sortKey} />
                        </span>
                      ) : (
                        col.headerLabel
                      )}
                    </th>
                  );
                })}
                {isAdmin && (
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Admin
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAndSorted.map((vm) => (
                <tr
                  key={vm.deal.id}
                  className="even:bg-slate-50/50 hover:bg-slate-100"
                >
                  {TopDealsColumns.map((col) => (
                    <td
                      key={col.key}
                      className={`${col.cellClassName} ${col.width ?? ""} ${
                        col.key === "score" ? "hidden sm:table-cell" : ""
                      }`}
                    >
                      {col.renderCell(vm, {
                        showListingTitle: true,
                        showViewCardLink: true,
                        referenceTime,
                      })}
                    </td>
                  ))}
                  {isAdmin && (
                    <td className="px-3 py-4 align-middle">
                      <AdminDealActions
                        listingId={vm.deal.id}
                        sellerUsername={vm.deal.sellerUsername}
                        isAdmin={isAdmin}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
