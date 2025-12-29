"use client";

import { useId } from "react";

import { buildUsdBaselineCookieString } from "@/lib/usdBaselinePreference";

type UsdBaselineToggleProps = {
  value: boolean;
  onChange: (nextValue: boolean) => void;
  className?: string;
};

export function UsdBaselineToggle({
  value,
  onChange,
  className,
}: UsdBaselineToggleProps) {
  const id = useId();

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="inline-flex items-center gap-2 text-sm text-slate-600"
        title="Helps compare deals across markets"
      >
        <input
          id={id}
          type="checkbox"
          checked={value}
          onChange={(event) => {
            const nextValue = event.target.checked;
            document.cookie = buildUsdBaselineCookieString(nextValue);
            onChange(nextValue);
          }}
          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400/40"
          data-testid="usd-baseline-toggle"
        />
        <span>Show USD baseline</span>
      </label>
    </div>
  );
}
