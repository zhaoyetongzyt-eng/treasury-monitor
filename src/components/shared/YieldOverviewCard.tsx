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

  const formatYield = (v: number) => `${v.toFixed(2)}%`;

  // ── 收益率曲线形态信号判断 ──────────────────────────────────
  // change2Y / change10Y 均为 bp（单日变动）
  type CurveSignal = {
    label: string;
    desc: string;
    bg: string;
    text: string;
    border: string;
  };

  function getCurveSignal(c2Y: number | null, c10Y: number | null): CurveSignal | null {
    if (c2Y === null || c10Y === null) return null;
    const THRESHOLD = 0.5; // bp，小于此值视为"基本不变"

    const twoUp = c2Y > THRESHOLD;
    const twoDown = c2Y < -THRESHOLD;
    const tenUp = c10Y > THRESHOLD;
    const tenDown = c10Y < -THRESHOLD;

    // Bear Steepening：长端涨幅 > 短端涨幅，曲线变陡，整体熊市
    if (tenUp && c10Y > c2Y + THRESHOLD) {
      return {
        label: "Bear Steepening",
        desc: "长端主导上行，曲线变陡",
        bg: "bg-orange-50",
        text: "text-orange-700",
        border: "border-orange-200",
      };
    }
    // Bear Flattening：短端涨幅 > 长端涨幅，曲线变平，整体熊市
    if (twoUp && c2Y > c10Y + THRESHOLD) {
      return {
        label: "Bear Flattening",
        desc: "短端主导上行，曲线变平",
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
      };
    }
    // Bull Flattening：长端跌幅 > 短端跌幅，曲线变平，整体牛市
    if (tenDown && c10Y < c2Y - THRESHOLD) {
      return {
        label: "Bull Flattening",
        desc: "长端主导下行，曲线变平",
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-200",
      };
    }
    // Bull Steepening：短端跌幅 > 长端跌幅，曲线变陡，整体牛市
    if (twoDown && c2Y < c10Y - THRESHOLD) {
      return {
        label: "Bull Steepening",
        desc: "短端主导下行，曲线变陡",
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
      };
    }
    // 并行移动（parallel shift）
    if ((twoUp && tenUp) || (twoDown && tenDown)) {
      const dir = twoUp ? "上行" : "下行";
      return {
        label: "Parallel Shift",
        desc: `曲线整体${dir}，形态基本不变`,
        bg: "bg-slate-50",
        text: "text-slate-600",
        border: "border-slate-200",
      };
    }
    return null;
  }

  const signal = getCurveSignal(yields.change2Y, yields.change10Y);

  const items = [
    {
      label: "2Y 收益率",
      value: formatYield(yields.yield2Y),
      change: yields.change2Y,
      color: "text-gray-700",
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
      value: yields.spread2s10s !== null ? `${(yields.spread2s10s * 100).toFixed(0)}bp` : "--",
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
            {/* 左侧：日期 + 曲线形态信号 */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs text-gray-400">收益率快照 · {yields.date}</span>
              {signal && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold tracking-wide ${signal.bg} ${signal.text} ${signal.border}`}
                >
                  <span className="text-[9px]">▶</span>
                  {signal.label}
                  <span className="font-normal opacity-70 hidden sm:inline">· {signal.desc}</span>
                </span>
              )}
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
