"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { YieldSnapshot } from "@/types";

// ============================================================
// 收益率概览卡片 — 独立组件，展示在所有模块之前
// ============================================================

export default function YieldOverviewCard() {
  const [yields, setYields] = useState<YieldSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/yields")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setYields(data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 pt-6 pb-2">
        <Card className="bg-gradient-to-r from-slate-50 to-blue-50 border-blue-100">
          <CardContent className="py-4">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
              <span className="animate-pulse">加载收益率数据...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!yields) return null;

  const formatBp = (v: number | null) => {
    if (v === null) return "--";
    return `${v > 0 ? "+" : ""}${v.toFixed(0)}bp`;
  };

  const formatYield = (v: number) => `${v.toFixed(2)}%`;

  const items = [
    {
      label: "2Y 收益率",
      value: formatYield(yields.yield2Y),
      change: yields.change2Y,
      color: "text-blue-700",
    },
    {
      label: "10Y 收益率",
      value: formatYield(yields.yield10Y),
      change: yields.change10Y,
      color: "text-blue-700",
    },
    {
      label: "30Y 收益率",
      value: formatYield(yields.yield30Y),
      change: yields.change30Y,
      color: "text-indigo-700",
    },
    {
      label: "2s10s 利差",
      value: yields.spread2s10s !== null ? `${yields.spread2s10s.toFixed(0)}bp` : "--",
      change: yields.change2s10s,
      color:
        yields.spread2s10s !== null && yields.spread2s10s < 0
          ? "text-red-600"
          : "text-emerald-600",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 pt-6 pb-2">
      <Card className="bg-gradient-to-r from-slate-50 to-blue-50 border-blue-100">
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="text-xs text-gray-400">
              收益率快照 · {yields.date}
            </div>
            <div className="flex items-center gap-6 flex-wrap">
              {items.map((item) => (
                <div key={item.label} className="text-center">
                  <div className="text-xs text-gray-400 mb-0.5">{item.label}</div>
                  <div className={`text-lg font-bold font-mono ${item.color}`}>
                    {item.value}
                  </div>
                  {item.change !== null && (
                    <div
                      className={`text-xs font-mono ${
                        item.change > 0
                          ? "text-red-500"
                          : item.change < 0
                            ? "text-green-500"
                            : "text-gray-400"
                      }`}
                    >
                      {item.change > 0 ? "↑" : item.change < 0 ? "↓" : "→"}{" "}
                      {Math.abs(item.change).toFixed(0)}bp
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-blue-100">
            <a
              href="https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView?type=daily_treasury_yield_curve"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2"
            >
              数据引用：Treasury.gov · Daily Treasury Yield Curve ↗
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
