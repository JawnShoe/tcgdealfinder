"use client";

import { AdminDealActions } from "./AdminDealActions";
import { buildDealViewModel, type DealViewModel } from "../lib/dealViewModel";
import { EndingSoonColumns } from "../lib/tableColumns";
import type { Deal } from "../types/deal";

interface EndingSoonClientProps {
  deals: Deal[];
  isAdmin?: boolean;
}

export default function EndingSoonClient({
  deals,
  isAdmin = false,
}: EndingSoonClientProps) {
  const viewModels = deals.map((deal) => buildDealViewModel(deal));

  if (viewModels.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-slate-600">
          No trusted discounted listings ending in the next 24 hours.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Check back soon for new listings.
        </p>
      </div>
    );
  }

  return (
    <table className="min-w-full table-fixed text-sm text-slate-900">
      <thead className="border-b border-slate-200 bg-slate-50">
        <tr>
          {EndingSoonColumns.map((col) => (
            <th
              key={col.key}
              className={`${col.headerClassName} ${col.width ?? ""}`}
            >
              {col.headerLabel}
            </th>
          ))}
          {isAdmin && (
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Admin
            </th>
          )}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {viewModels.map((vm) => (
          <tr
            key={vm.deal.id}
            className="even:bg-slate-50/50 hover:bg-slate-100"
          >
            {EndingSoonColumns.map((col) => (
              <td
                key={col.key}
                className={`${col.cellClassName} ${col.width ?? ""}`}
              >
                {col.renderCell(vm, {
                  showListingTitle: true,
                  showViewCardLink: true,
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
  );
}
