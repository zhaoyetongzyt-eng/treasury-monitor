"use client";

import { useState, useEffect } from "react";
import type { SentimentSnapshot } from "@/types";

// ============================================================
// 情绪面子模块 (01-C)
// 数据源：FRED API → /api/sentiment
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

export default function SentimentSubModule() {
  const [data, setData] = useState<SentimentSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sentiment")
      .then((r) => r.json())
      .then((d: SentimentSnapshot) => {
        if (d.success) setData(d);
        else setError("数据加载失败");
      })
      .catch(() => setError("网络请求失败"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-[11px] text-gray-400">
        <span className="animate-pulse">加载情绪面数据...</span>
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
  const fmtVix = (v: number | null) => v !== null ? v.toFixed(1) : "--";
  const fmtOas = (v: number | null) => v !== null ? `${v.toFixed(2)}%` : "--";
  const fmtBp = (v: number | null) => v !== null ? `${v > 0 ? "+" : ""}${v}bp` : "--";
  const fmtPct2 = (v: number | null) => v !== null ? `${v.toFixed(2)}%` : "--";
  const fmtDxy = (v: number | null) => v !== null ? v.toFixed(1) : "--";

  // VIX 信号：<15 低波动，15-25 正常，>25 恐慌
  const vixSignal = data.vix !== null
    ? (data.vix > 25 ? "恐慌" : data.vix > 20 ? "偏高" : data.vix > 15 ? "正常" : "极低")
    : "";
  const vixColor = data.vix !== null
    ? (data.vix > 25 ? "text-red-600" : data.vix > 20 ? "text-amber-600" : data.vix > 15 ? "text-emerald-600" : "text-blue-600")
    : "text-gray-800";

  // HY OAS 信号：<3.0% 宽松，3.0-5.0% 正常，>5.0% 压力
  const hySignal = data.hyOas !== null
    ? (data.hyOas > 5.0 ? "信用压力" : data.hyOas > 3.5 ? "偏高" : "宽松")
    : "";
  const hyColor = data.hyOas !== null
    ? (data.hyOas > 5.0 ? "text-red-600" : data.hyOas > 3.5 ? "text-amber-600" : "text-emerald-600")
    : "text-gray-800";

  // Term Premium 信号
  const tpColor = data.termPremium10Y !== null
    ? (data.termPremium10Y > 50 ? "text-red-600" : data.termPremium10Y > 20 ? "text-amber-600" : "text-emerald-600")
    : "text-gray-800";

  // 5Y5Y BE 信号：<2% 通缩担忧，2-2.5% 锚定良好，>2.5% 脱锚风险
  const beSignal = data.fwdBE5Y5Y !== null
    ? (data.fwdBE5Y5Y > 2.5 ? "脱锚风险" : data.fwdBE5Y5Y < 2.0 ? "偏低" : "锚定良好")
    : "";
  const beColor = data.fwdBE5Y5Y !== null
    ? (data.fwdBE5Y5Y > 2.5 ? "text-red-600" : data.fwdBE5Y5Y < 2.0 ? "text-amber-600" : "text-emerald-600")
    : "text-gray-800";

  // 10Y-3M 信号：>0 正常，<-50bp 深度倒挂
  const spreadSignal = data.spread10Y3M !== null
    ? (data.spread10Y3M < -50 ? "深度倒挂" : data.spread10Y3M < 0 ? "轻度倒挂" : "正常")
    : "";
  const spreadColor = data.spread10Y3M !== null
    ? (data.spread10Y3M < -50 ? "text-red-600" : data.spread10Y3M < 0 ? "text-amber-600" : "text-emerald-600")
    : "text-gray-800";

  // DXY 信号
  const dxyColor = data.dxyBroad !== null
    ? (data.dxyBroad > 125 ? "text-red-600" : data.dxyBroad > 120 ? "text-amber-600" : "text-emerald-600")
    : "text-gray-800";

  const rows: IndicatorRow[] = [
    {
      label: "VIX（跨资产恐慌指数）",
      labelEn: "CBOE Volatility Index",
      value: fmtVix(data.vix),
      unit: "",
      date: data.vixDate,
      sub: vixSignal,
      trend: data.vix !== null ? (data.vix > 25 ? "up" : data.vix < 15 ? "down" : "flat") : undefined,
      color: vixColor,
    },
    {
      label: "高收益债 OAS（水平值）",
      labelEn: "HY OAS Level (ICE BofA)",
      value: fmtOas(data.hyOas),
      unit: "%",
      date: data.hyOasDate,
      sub: data.hyOas !== null ? `≈${Math.round(data.hyOas * 100)}bp ${hySignal}` : hySignal,
      trend: data.hyOas !== null ? (data.hyOas > 3.5 ? "up" : data.hyOas < 2.5 ? "down" : "flat") : undefined,
      color: hyColor,
    },
    {
      label: "期限溢价（10Y ACM / THREEFYTP10）",
      labelEn: "ACM Term Premium (FRED)",
      value: fmtBp(data.termPremium10Y),
      unit: "bp",
      date: data.tpDate,
      sub: data.termPremium10Y !== null
        ? (data.termPremium10Y > 20 ? "风险溢价上升" : "风险溢价偏低")
        : undefined,
      trend: data.termPremium10Y !== null ? (data.termPremium10Y > 30 ? "up" : "flat") : undefined,
      color: tpColor,
    },
    {
      label: "5Y5Y 远期通胀预期",
      labelEn: "5Y5Y Forward Breakeven",
      value: fmtPct2(data.fwdBE5Y5Y),
      unit: "%",
      date: data.fwdBEDate,
      sub: beSignal,
      trend: data.fwdBE5Y5Y !== null ? (data.fwdBE5Y5Y > 2.6 ? "up" : data.fwdBE5Y5Y < 1.9 ? "down" : "flat") : undefined,
      color: beColor,
    },
    {
      label: "10Y–3M 利差（衰退信号）",
      labelEn: "10Y-3M Spread (T10Y3M)",
      value: fmtBp(data.spread10Y3M),
      unit: "bp",
      date: data.spreadDate,
      sub: spreadSignal,
      trend: data.spread10Y3M !== null ? (data.spread10Y3M < 0 ? "down" : data.spread10Y3M > 0 ? "up" : "flat") : undefined,
      color: spreadColor,
    },
    {
      label: "广义美元指数",
      labelEn: "Broad USD Index",
      value: fmtDxy(data.dxyBroad),
      unit: "",
      date: data.dxyDate,
          sub: data.dxyBroad !== null
            ? (data.dxyBroad > 125 ? "强美元" : data.dxyBroad > 120 ? "偏强" : "偏弱")
        : undefined,
      trend: data.dxyBroad !== null ? (data.dxyBroad > 130 ? "up" : "flat") : undefined,
      color: dxyColor,
    },
    {
      label: "MOVE 美债波动率指数",
      labelEn: "ICE BofA MOVE Index",
      value: data.moveIndex !== null ? data.moveIndex.toFixed(1) : "--",
      unit: "",
      date: data.moveDate,
      sub: data.moveIndex !== null
        ? (data.moveIndex > 120 ? "高波动" : data.moveIndex > 90 ? "偏高" : "正常")
        : "非FRED数据",
      trend: data.moveIndex !== null
        ? (data.moveIndex > 110 ? "up" : data.moveIndex < 70 ? "down" : "flat")
        : undefined,
      color: data.moveIndex !== null
        ? (data.moveIndex > 120 ? "text-red-600" : data.moveIndex > 90 ? "text-amber-600" : "text-emerald-600")
        : "text-gray-400",
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* 子模块标题 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[11px] font-mono bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">C</span>
        <h3 className="text-sm font-semibold text-gray-800">
          情绪面 <span className="font-normal text-gray-400 text-[11px]">· Sentiment</span>
        </h3>
      </div>

      {/* 说明文字 */}
      <p className="text-[11px] text-gray-400 mb-3 leading-relaxed">
        跨资产波动率、信用利差与期限溢价刻画风险偏好；美债波动率揭示利率不确定性与对冲成本。
      </p>

      {/* 指标列表 */}
      <div className="flex-1 divide-y divide-gray-100">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between py-2.5">
            <div className="min-w-0 flex-1">
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
        <p className="text-[10px] text-gray-400 mb-2">数据来源 · FRED (Federal Reserve Economic Data) + ICE BofA</p>
        <div className="grid grid-cols-4 gap-x-2 gap-y-1">
          {[
            { label: "VIX", id: "VIXCLS" },
            { label: "HY OAS", id: "BAMLH0A0HYM2" },
            { label: "Term Prem", id: "THREEFYTP10" },
            { label: "5Y5Y BE", id: "T5YIFR" },
            { label: "10Y-3M", id: "T10Y3M" },
            { label: "USD Broad", id: "DTWEXBGS" },
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
          <a
            href="https://www.tradingview.com/symbols/TVC-MOVE/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-blue-500 hover:text-blue-700 hover:underline transition-colors"
          >
            MOVE ↗
          </a>
        </div>
      </div>
    </div>
  );
}
