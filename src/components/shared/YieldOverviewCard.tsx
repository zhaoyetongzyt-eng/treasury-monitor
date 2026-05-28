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
        <div className="h-16 rounded-xl bg-[rgba(15,23,42,0.5)] border border-[rgba(148,163,184,0.08)] animate-pulse" />
      </div>
    );
  }

  if (!yields) return null;

  const formatYield = (v: number) => `${v.toFixed(2)}%`;

  const items = [
    {
      label: "10Y 收益率",
      value: formatYield(yields.yield10Y),
      change: yields.change10Y,
      highlight: true,
    },
    {
      label: "30Y 收益率",
      value: formatYield(yields.yield30Y),
      change: yields.change30Y,
    },
    {
      label: "2s10s 利差",
      value: yields.spread2s10s !== null ? `${yields.spread2s10s.toFixed(0)}bp` : "--",
      change: yields.change2s10s,
      isSpread: true,
      spreadVal: yields.spread2s10s,
    },
    {
      label: "5s30s 利差",
      value: yields.spread5s30s !== undefined ? `${(yields.spread5s30s * 100).toFixed(0)}bp` : "--",
      change: null as number | null,
      isSpread: true,
      spreadVal: yields.spread5s30s ?? null,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 pt-4 pb-2" id="status">
      <Card className="relative overflow-hidden border-blue-500/15 bg-[rgba(10,20,45,0.7)]">
        {/* 顶部蓝色渐变线 */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-cyan-400 to-transparent" />
        <CardContent className="py-4 px-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* 左侧标签 */}
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-xs text-slate-400 font-medium tracking-wide">
                收益率快照 · {yields.date}
              </span>
            </div>

            {/* 右侧数据 */}
            <div className="flex items-center gap-5 flex-wrap">
              {items.map((item) => (
                <div key={item.label} className="text-center min-w-[64px]">
                  <div className="text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">{item.label}</div>
                  <div className={`text-base font-bold font-mono tabular-nums ${
                    item.highlight
                      ? "text-blue-300"
                      : item.isSpread
                        ? (item.spreadVal !== null && item.spreadVal < 0 ? "text-red-400" : "text-emerald-400")
                        : "text-slate-200"
                  }`}>
                    {item.value}
                  </div>
                  {item.change !== null && item.change !== undefined && (
                    <div className={`text-[10px] font-mono tabular-nums ${
                      item.change > 0
                        ? "text-red-400"
                        : item.change < 0
                          ? "text-emerald-400"
                          : "text-slate-500"
                    }`}>
                      {item.change > 0 ? "▲" : item.change < 0 ? "▼" : "–"}{" "}
                      {Math.abs(item.change).toFixed(0)}bp
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 来源链接 */}
          <div className="mt-3 pt-2.5 border-t border-[rgba(148,163,184,0.08)] flex justify-end">
            <a
              href="https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView?type=daily_treasury_yield_curve"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-slate-500 hover:text-blue-400 transition-colors underline underline-offset-2"
            >
              Treasury.gov · Daily Yield Curve ↗
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
