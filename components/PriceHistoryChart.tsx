"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoneyFromCad } from "@/lib/money";

export type HistoricalPoint = {
  date: string;
  median: number;
  sample: number;
};

export type PriceHistoryChartProps = {
  points: HistoricalPoint[];
};

function formatCurrency(value: number): string {
  return formatMoneyFromCad(value, "USD");
}

function formatDateLabel(label: string): string {
  const parsed = new Date(label);
  if (Number.isNaN(parsed.getTime())) {
    return label;
  }
  return parsed.toLocaleDateString();
}

export default function PriceHistoryChart({
  points,
}: PriceHistoryChartProps) {
  const data = (points ?? [])
    .filter(
      (point) =>
        point.median != null &&
        Number.isFinite(point.median) &&
        point.sample != null &&
        Number.isFinite(point.sample),
    )
    .map((point) => ({
      date: point.date,
      median: point.median,
      sample: point.sample,
    }));

  if (!data || data.length < 2) {
    return (
      <div className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
        Not enough historical data to display a chart.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="h-60 w-full rounded border border-slate-200 bg-white px-3 py-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 16, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateLabel}
              minTickGap={24}
              stroke="#94a3b8"
              fontSize={12}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={12}
              tickFormatter={(value) => formatCurrency(Number(value))}
            />
            <Tooltip
              contentStyle={{ fontSize: 12 }}
              labelFormatter={formatDateLabel}
              formatter={(value: number, _name, payload) => {
                const sample = payload?.payload?.sample;
                return [
                  `${formatCurrency(value)}${
                    typeof sample === "number" ? ` (n=${sample})` : ""
                  }`,
                  "Median",
                ];
              }}
            />
            <Line
              type="monotone"
              dataKey="median"
              stroke="#0ea5e9"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
