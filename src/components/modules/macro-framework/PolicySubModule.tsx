"use client";

import { useState, useEffect } from "react";
import type { PolicySnapshot } from "@/types";

// ============================================================
// 政策面子模块 (01-B)
// 数据源：FRED API → /api/policy
// ============================================================

interface IndicatorRow {
  label: string;
  labelEn: string;
  value: string;
  unit: string;
  date?: string | null;
  sub?: string;
  trend?: "up" | "down" | "flat";
  color?: string;
}

function trendEmoji(trend?: "up" | "down" | "flat"): string {
  if (trend === "up") return "▲";
  if (trend === "down") return "▼";
  return "→";
}

export default function PolicySubModule() {
  const [data, setData] = useState<PolicySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/policy")
      .then((r) => r.json())
      .then((d: PolicySnapshot) => {
        if (d.success) setData(d);
        else setError("数据加载失败");
      })
      .catch(() => setError("网络请求失败"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-[11px] text-gray-400">
        <span className="animate-pulse">加载政策面数据...</span>
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
  const fmtPct2 = (v: number | null) => v !== null ? `${v.toFixed(2)}%` : "--";
  const fmtTrillion = (v: number | null) => v !== null ? `$${v.toFixed(2)}T` : "--";
  const fmtBp = (v: number | null) => v !== null ? `${v > 0 ? "+" : ""}${v.toFixed(0)}bp` : "--";
  const fmtQtPace = (v: number | null) => {
    if (v === null) return "--";
    const abs = Math.abs(v);
    return `-$${abs.toFixed(0)}B/月`;
  };

  // 利率走廊/FFR区间
  const ffRange = data.ffTargetUpper !== null && data.ffTargetLower !== null
    ? `${data.ffTargetLower.toFixed(2)}–${data.ffTargetUpper.toFixed(2)}%`
    : "--";

  // QT 方向判断
  const qtPaceAbs = data.qtMonthlyPace !== null ? Math.abs(data.qtMonthlyPace) : null;

  const rows: IndicatorRow[] = [
    {
      label: "联邦基金利率目标区间",
      labelEn: "FFR Target Range",
      value: ffRange,
      unit: "%",
      date: data.ffTargetDate,
      color: "text-blue-700",
    },
    {
      label: "有效联邦基金利率",
      labelEn: "Effective FFR",
      value: fmtPct2(data.ffEffective),
      unit: "%",
      sub: `IORB ${fmtPct2(data.iorbRate)}`,
      color: "text-gray-800",
    },
    {
      label: "ON RRP 利率",
      labelEn: "ON RRP Award Rate",
      value: fmtPct2(data.onRrpRate),
      unit: "%",
      sub: "利率走廊下限",
      color: "text-gray-500",
    },
    {
      label: "Fed 资产负债表",
      labelEn: "Fed Balance Sheet",
      value: fmtTrillion(data.fedBalanceSheet),
      unit: "$T",
      date: data.fedBsDate,
      sub: data.qtMonthlyPace !== null
        ? `QT ${fmtQtPace(data.qtMonthlyPace)}`
        : undefined,
      trend: data.qtMonthlyPace !== null ? "down" : undefined,
      color: "text-gray-800",
    },
    {
      label: "2Y – FFR 利差",
      labelEn: "2Y – FFR Spread",
      value: fmtBp(data.twoYMinusFFR),
      unit: "bp",
      trend: data.twoYMinusFFR !== null
        ? (data.twoYMinusFFR < -20 ? "down" : data.twoYMinusFFR > 20 ? "up" : "flat")
        : undefined,
      color: data.twoYMinusFFR !== null
        ? (data.twoYMinusFFR < -20 ? "text-amber-600" : data.twoYMinusFFR > 20 ? "text-red-600" : "text-gray-800")
        : undefined,
    },
    {
      label: "10Y – FFR 利差",
      labelEn: "10Y – FFR Spread",
      value: fmtBp(data.tenYMinusFFR),
      unit: "bp",
      trend: data.tenYMinusFFR !== null
        ? (data.tenYMinusFFR < -10 ? "down" : data.tenYMinusFFR > 50 ? "up" : "flat")
        : undefined,
      color: data.tenYMinusFFR !== null
        ? (data.tenYMinusFFR < -10 ? "text-red-600" : data.tenYMinusFFR > 50 ? "text-amber-600" : "text-gray-800")
        : undefined,
    },
    {
      label: "5Y–30Y 利差（曲线形态）",
      labelEn: "5Y-30Y Spread",
      value: fmtBp(data.spread5s30s),
      unit: "bp",
      date: data.spread5s30sDate,
      sub: data.spread5s30s !== null
        ? (data.spread5s30s < -10 ? "倒挂信号" : data.spread5s30s < 10 ? "极度平坦" : data.spread5s30s > 60 ? "陡峭化" : "正常")
        : undefined,
      trend: data.spread5s30s !== null
        ? (data.spread5s30s < 0 ? "down" : data.spread5s30s > 60 ? "up" : "flat")
        : undefined,
      color: data.spread5s30s !== null
        ? (data.spread5s30s < -10 ? "text-red-600" : data.spread5s30s < 10 ? "text-amber-600" : data.spread5s30s > 60 ? "text-blue-600" : "text-gray-800")
        : undefined,
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* 子模块标题 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[11px] font-mono bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded">B</span>
        <h3 className="text-sm font-semibold text-gray-800">
          政策面 <span className="font-normal text-gray-400 text-[11px]">· Policy</span>
        </h3>
      </div>

      {/* 说明文字 */}
      <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
        货币政策路径锚定短端，QT 节奏影响久期供给；利差形态揭示市场预期与期限偏好。
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
              <div className="flex flex-col items-end">
                <span className={`text-xs font-mono ${row.color || "text-gray-800"}`}>
                  {row.trend && <span className="text-[10px] mr-0.5">{trendEmoji(row.trend)}</span>}
                  {row.value}
                </span>
                {row.sub && (
                  <span className="text-[10px] text-gray-400 leading-tight">{row.sub}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 数据来源链接 */}
      <div className="mt-3 pt-2.5 border-t border-gray-100">
        <p className="text-[10px] text-gray-400 mb-2">数据来源 · FRED (Federal Reserve Economic Data)</p>
        <div className="grid grid-cols-3 gap-x-2 gap-y-1">
          {[
            { label: "FF Target", id: "DFEDTAR" },
            { label: "FF Effective", id: "DFF" },
            { label: "IORB", id: "IORB" },
            { label: "ON RRP", id: "RRPONTSYD" },
            { label: "Fed B/S", id: "WALCL" },
            { label: "2Y Yield", id: "DGS2" },
            { label: "10Y Yield", id: "DGS10" },
            { label: "5Y Yield", id: "DGS5" },
            { label: "30Y Yield", id: "DGS30" },
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
