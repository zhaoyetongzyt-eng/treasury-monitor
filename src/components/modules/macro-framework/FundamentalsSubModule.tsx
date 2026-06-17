"use client";

import { useState, useEffect } from "react";
import type { FundamentalsSnapshot } from "@/types";

// ============================================================
// 基本面子模块 (01-A)
// 数据源：FRED API → /api/fundamentals
// ============================================================

interface IndicatorRow {
  label: string;
  labelEn: string;
  value: string;
  unit: string;
  date?: string | null;
  change?: string;
  trend?: "up" | "down" | "flat";
  color?: string;
}

function trendEmoji(trend?: "up" | "down" | "flat"): string {
  if (trend === "up") return "▲";
  if (trend === "down") return "▼";
  return "→";
}

export default function FundamentalsSubModule() {
  const [data, setData] = useState<FundamentalsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/fundamentals")
      .then((r) => r.json())
      .then((d: FundamentalsSnapshot) => {
        if (d.success) setData(d);
        else setError("数据加载失败");
      })
      .catch(() => setError("网络请求失败"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-[11px] text-gray-400">
        <span className="animate-pulse">加载基本面数据...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-[11px] text-gray-400">
        {error || "暂无数据"}
      </div>
    );
  }

  // 格式化
  const fmtPct1 = (v: number | null) => v !== null ? `${v > 0 ? "+" : ""}${v.toFixed(1)}%` : "--";
  const fmtK = (v: number | null) => v !== null ? `${v > 0 ? "+" : ""}${v}K` : "--";
  const fmtPct = (v: number | null) => v !== null ? `${v.toFixed(1)}%` : "--";

  const rows: IndicatorRow[] = [
    {
      label: "实际 GDP（季调年化）",
      labelEn: "Real GDP QoQ SAAR",
      value: fmtPct1(data.gdpQoQ),
      unit: "%",
      date: data.gdpDate,
      trend: data.gdpQoQ !== null ? (data.gdpQoQ > 0 ? "up" : data.gdpQoQ < 0 ? "down" : "flat") : undefined,
      color: data.gdpQoQ !== null ? (data.gdpQoQ > 0 ? "text-emerald-600" : data.gdpQoQ < 0 ? "text-red-600" : "text-gray-500") : undefined,
    },
    {
      label: "核心 PCE（同比）",
      labelEn: "Core PCE YoY",
      value: fmtPct1(data.corePceYoY),
      unit: "%",
      date: data.corePceDate,
      trend: data.corePceYoY !== null ? (data.corePceYoY >= 2.5 ? "up" : "flat") : undefined,
      color: data.corePceYoY !== null ? (data.corePceYoY >= 2.5 ? "text-amber-600" : "text-emerald-600") : undefined,
    },
    {
      label: "CPI（同比）",
      labelEn: "CPI YoY",
      value: fmtPct1(data.cpiYoY),
      unit: "%",
      date: data.cpiDate,
      trend: data.cpiYoY !== null ? (data.cpiYoY >= 2.5 ? "up" : "flat") : undefined,
      color: data.cpiYoY !== null ? (data.cpiYoY >= 2.5 ? "text-amber-600" : "text-emerald-600") : undefined,
    },
    {
      label: "失业率",
      labelEn: "Unemployment Rate",
      value: fmtPct(data.unemployment),
      unit: "%",
      date: data.employmentDate,
      trend: data.unemployment !== null ? (data.unemployment >= 4.5 ? "up" : "flat") : undefined,
      color: data.unemployment !== null ? (data.unemployment >= 4.5 ? "text-red-600" : "text-gray-800") : undefined,
    },
    {
      label: "非农就业新增（环比）",
      labelEn: "Nonfarm Payrolls MoM",
      value: fmtK(data.nfpMoM),
      unit: "K",
      date: data.employmentDate,
      trend: data.nfpMoM !== null ? (data.nfpMoM > 150 ? "up" : data.nfpMoM > 0 ? "flat" : "down") : undefined,
      color: data.nfpMoM !== null ? (data.nfpMoM >= 150 ? "text-emerald-600" : data.nfpMoM > 0 ? "text-gray-500" : "text-red-600") : undefined,
    },
    {
      label: "财政赤字/GDP",
      labelEn: "Fiscal Deficit / GDP",
      value: data.deficitPctGDP !== null ? `${data.deficitPctGDP.toFixed(1)}%` : "--",
      unit: "%",
      date: data.deficitDate,
      trend: data.deficitPctGDP !== null ? (data.deficitPctGDP < -5 ? "up" : "flat") : undefined,
      color: data.deficitPctGDP !== null ? (data.deficitPctGDP < -5 ? "text-red-600" : "text-amber-600") : undefined,
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* 子模块标题 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[11px] font-mono bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">A</span>
        <h3 className="text-sm font-semibold text-gray-800">
          基本面 <span className="font-normal text-gray-400 text-[11px]">· Fundamentals</span>
        </h3>
      </div>

      {/* 说明文字 */}
      <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
        增长、通胀与就业三角驱动美债收益率基准中枢；财政赤字决定供给压力起点。
      </p>

      {/* 指标列表 */}
      <div className="flex-1 divide-y divide-gray-100">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between py-2.5">
            <div className="min-w-0">
              <span className="text-xs text-gray-600">{row.label}</span>
              <span className="ml-1.5 text-[10px] text-gray-400">{row.labelEn}</span>
              {row.date && (
                <span className="ml-1.5 text-[10px] text-gray-400 font-mono">{row.date}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-right shrink-0">
              <span className={`text-xs font-mono ${row.color || "text-gray-800"}`}>
                {row.trend && <span className="text-[10px] mr-0.5">{trendEmoji(row.trend)}</span>}
                {row.value}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 数据来源链接 */}
      <div className="mt-3 pt-2.5 border-t border-gray-100">
        <p className="text-[10px] text-gray-400 mb-2">数据来源 · FRED (Federal Reserve Economic Data)</p>
        <div className="grid grid-cols-3 gap-x-2 gap-y-1">
          {[
            { label: "GDP", id: "A191RL1Q225SBEA" },
            { label: "Core PCE", id: "PCEPILFE" },
            { label: "CPI", id: "CPIAUCSL" },
            { label: "失业率", id: "UNRATE" },
            { label: "非农", id: "PAYEMS" },
            { label: "赤字", id: "FYFSGDA188S" },
          ].map((s) => (
            <a
              key={s.id}
              href={`https://fred.stlouisfed.org/series/${s.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-blue-500 hover:text-blue-700 hover:underline transition-colors"
            >
              {s.label} ↗
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
