"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { YieldSnapshot, FundingStressSnapshot } from "@/types";

// ============================================================
// 美债日频因子｜Daily UST Factors — 统一白色卡片容器
// ============================================================

export default function YieldOverviewCard() {
  const [yields, setYields] = useState<YieldSnapshot | null>(null);
  const [funding, setFunding] = useState<FundingStressSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/yields").then((r) => r.json()),
      fetch("/api/funding-stress").then((r) => r.json()),
    ]).then(([yData, fData]) => {
      if (yData.success) setYields(yData);
      if (fData.success) setFunding(fData);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 pt-6 pb-2">
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="py-5">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
              <span className="animate-pulse">加载美债日频因子数据...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!yields) return null;

  const formatYield = (v: number) => `${v.toFixed(2)}%`;

  // ── 收益率曲线形态信号判断（10 种情况，阈值 1bp）────────────────
  type CurveSignal = {
    label: string;
    summary: string;
    interpretation: string;
    bg: string;
    text: string;
    border: string;
    accent: string;
  };

  function bpStr(v: number): string {
    return `${v > 0 ? "+" : ""}${v.toFixed(0)}bp`;
  }

  function getCurveSignal(c2Y: number | null, c10Y: number | null, cSpread: number | null): CurveSignal | null {
    if (c2Y === null || c10Y === null) return null;
    const THR = 1.0;

    const twoUp    = c2Y  >  THR;
    const twoDown  = c2Y  < -THR;
    const twoFlat  = !twoUp && !twoDown;
    const tenUp    = c10Y >  THR;
    const tenDown  = c10Y < -THR;
    const tenFlat  = !tenUp && !tenDown;

    const dSpread = (c10Y - c2Y);
    const spreadBp = cSpread !== null ? `${bpStr(cSpread)}` : "--";

    const s = (opts: Omit<CurveSignal, "summary"> & { accent: string }): CurveSignal => ({
      ...opts,
      summary: `2Y ${bpStr(c2Y)}, 10Y ${bpStr(c10Y)}, 2s10s ${spreadBp}`,
    });

    if (twoUp && tenUp && dSpread > THR) {
      return s({ label: "Bear Steepening", interpretation: "全曲线利率上行，长端受通胀预期/供给/期限溢价推动涨幅更大，曲线陡峭化。", bg: "bg-orange-50/50", text: "text-orange-700", border: "border-orange-200/50", accent: "bg-orange-400" });
    }
    if (twoUp && tenUp && dSpread < -THR) {
      return s({ label: "Bear Flattening", interpretation: "全曲线利率上行，短端受鹰派政策预期/加息冲击更大，曲线平坦化。", bg: "bg-red-50/50", text: "text-red-700", border: "border-red-200/50", accent: "bg-red-400" });
    }
    if (twoUp && tenUp) {
      return s({ label: "Bear Shift ↑", interpretation: "曲线整体平行上移，形态基本不变，反映全面利率上行压力。", bg: "bg-slate-50/50", text: "text-slate-700", border: "border-slate-200/50", accent: "bg-slate-400" });
    }
    if (twoDown && tenDown && dSpread > THR) {
      return s({ label: "Bull Steepening", interpretation: "全曲线利率下行，短端降息预期升温推动短端下行更快，曲线陡峭化。", bg: "bg-emerald-50/50", text: "text-emerald-700", border: "border-emerald-200/50", accent: "bg-emerald-400" });
    }
    if (twoDown && tenDown && dSpread < -THR) {
      return s({ label: "Bull Flattening", interpretation: "全曲线利率下行，长端受避险买盘/期限溢价回落推动下行更快，曲线平坦化。", bg: "bg-blue-50/50", text: "text-blue-700", border: "border-blue-200/50", accent: "bg-blue-400" });
    }
    if (twoDown && tenDown) {
      return s({ label: "Bull Shift ↓", interpretation: "曲线整体平行下移，形态基本不变，反映全面利率下行。", bg: "bg-slate-50/50", text: "text-slate-700", border: "border-slate-200/50", accent: "bg-slate-400" });
    }
    if (twoUp && tenDown) {
      return s({ label: "Twist Flattening", interpretation: "短端受鹰派政策/Fed路径重定价推动上行，长端交易增长放缓或避险买盘，曲线扭曲式走平。", bg: "bg-purple-50/50", text: "text-purple-700", border: "border-purple-200/50", accent: "bg-purple-400" });
    }
    if (twoDown && tenUp) {
      return s({ label: "Twist Steepening", interpretation: "短端反映降息预期升温，长端受通胀、供给或期限溢价上升推动，曲线扭曲式变陡。", bg: "bg-violet-50/50", text: "text-violet-700", border: "border-violet-200/50", accent: "bg-violet-400" });
    }
    if (twoUp && tenFlat) {
      return s({ label: "Short-end Bear Flattening", interpretation: "主要由短端政策预期冲击推动上行，长端基本稳定，曲线由短端主导走平。", bg: "bg-rose-50/50", text: "text-rose-700", border: "border-rose-200/50", accent: "bg-rose-400" });
    }
    if (twoDown && tenFlat) {
      return s({ label: "Short-end Bull Steepening", interpretation: "主要由降息预期推动短端下行，长端基本稳定，曲线由短端主导变陡。", bg: "bg-teal-50/50", text: "text-teal-700", border: "border-teal-200/50", accent: "bg-teal-400" });
    }
    if (tenUp && twoFlat) {
      return s({ label: "Long-end Bear Steepening", interpretation: "主要由长端期限溢价或供给压力推动上行，短端基本锚定，曲线由长端主导变陡。", bg: "bg-amber-50/50", text: "text-amber-700", border: "border-amber-200/50", accent: "bg-amber-400" });
    }
    if (tenDown && twoFlat) {
      return s({ label: "Long-end Bull Flattening", interpretation: "主要由长端避险买盘或期限溢价下行推动，短端基本锚定，曲线由长端主导走平。", bg: "bg-cyan-50/50", text: "text-cyan-700", border: "border-cyan-200/50", accent: "bg-cyan-400" });
    }
    return null;
  }

  const signal = getCurveSignal(yields.change2Y, yields.change10Y, yields.change2s10s);

  const formatPct = (v: number) => `${v.toFixed(2)}%`;

  // 金额格式化：0 → $0；< 0.01bn → $X.XXm；≥ 0.01bn → $X.XXXbn
  function formatBn(amount: number): string {
    if (amount === 0) return "$0";
    if (amount < 0.01) return `$${(amount * 1000).toFixed(2)}m`;
    return `$${amount.toFixed(3)}bn`;
  }
  function formatBnChange(change: number): string {
    if (change === 0) return "0";
    if (Math.abs(change) < 0.01) return `${(change * 1000).toFixed(2)}m`;
    return `${change.toFixed(3)}bn`;
  }

  type RenderItem = { label: string; display: string; change: number | null; color: string; changeUnit: "%" | "bn" };

  const yieldItems: RenderItem[] = [
    { label: "2Y", display: formatPct(yields.yield2Y), change: yields.change2Y, color: "text-gray-700", changeUnit: "%" as const },
    { label: "10Y", display: formatPct(yields.yield10Y), change: yields.change10Y, color: "text-blue-700", changeUnit: "%" as const },
    { label: "30Y", display: formatPct(yields.yield30Y), change: yields.change30Y, color: "text-indigo-700", changeUnit: "%" as const },
    {
      label: "2s10s",
      display: yields.spread2s10s !== null ? `${(yields.spread2s10s * 100).toFixed(0)}bp` : "--",
      change: yields.change2s10s,
      color: yields.spread2s10s !== null && yields.spread2s10s < 0 ? "text-red-600" : "text-emerald-600",
      changeUnit: "%" as const,
    },
  ];

  const realYieldItems: RenderItem[] = [
    { label: "10Y Real Yield", display: yields.realYield10Y !== null ? formatPct(yields.realYield10Y) : "--", change: yields.changeReal10Y, color: "text-blue-700", changeUnit: "%" as const },
    { label: "10Y Breakeven", display: yields.breakeven10Y !== null ? formatPct(yields.breakeven10Y) : "--", change: yields.changeBE10Y, color: "text-amber-700", changeUnit: "%" as const },
    { label: "5Y Breakeven", display: yields.breakeven5Y !== null ? formatPct(yields.breakeven5Y) : "--", change: yields.changeBE5Y, color: "text-orange-600", changeUnit: "%" as const },
  ].filter((item) => item.display !== "--");

  const realYieldDriver = (() => {
    if (!yields) return null;
    const cN = yields.change10Y;
    const cR = yields.changeReal10Y;
    const cB = yields.changeBE10Y;
    if (cN === null || cR === null || cB === null) return null;
    const THR = 1;
    const nomUp = cN > THR;
    const nomDown = cN < -THR;
    const realMoves = Math.abs(cR) >= THR;
    const beMoves = Math.abs(cB) >= THR;
    if (nomUp && realMoves && !beMoves) return { text: "主驱动：实际利率 ↑ — 金融条件收紧", color: "text-blue-600" };
    if (nomUp && beMoves && !realMoves) return { text: "主驱动：通胀预期 ↑", color: "text-amber-600" };
    if (nomDown && realMoves && !beMoves) return { text: "主驱动：实际利率 ↓ — 降息/增长放缓交易", color: "text-blue-600" };
    if (nomDown && beMoves && !realMoves) return { text: "主驱动：通胀预期 ↓", color: "text-amber-600" };
    if (realMoves && beMoves) return { text: "实际利率与通胀预期同向变动", color: "text-slate-500" };
    return null;
  })();

  const fundingItems: RenderItem[] = funding ? [
    { label: "SOFR", display: formatPct(funding.sofr!), change: funding.changeSofr, color: "text-slate-800", changeUnit: "%" as const },
    { label: "TGCR", display: formatPct(funding.tgcr!), change: funding.changeTgcr, color: "text-slate-700", changeUnit: "%" as const },
    { label: "ON RRP", display: funding.onRrpAmount !== null ? formatBn(funding.onRrpAmount) : "--", change: funding.changeOnRrp, color: "text-purple-700", changeUnit: "bn" as const },
    { label: "SRF", display: funding.srfAmount !== null ? formatBn(funding.srfAmount) : "--", change: funding.changeSrf, color: "text-orange-700", changeUnit: "bn" as const },
    { label: "SOFR−EFFR", display: `${funding.sofrMinusEffr! > 0 ? "+" : ""}${funding.sofrMinusEffr!}bp`, change: null, color: funding.sofrMinusEffr !== null && funding.sofrMinusEffr > 5 ? "text-red-600" : "text-slate-600", changeUnit: "%" as const },
    { label: "SOFR−ONRRP", display: funding.sofrMinusOnRrp !== null ? `${funding.sofrMinusOnRrp! > 0 ? "+" : ""}${funding.sofrMinusOnRrp!}bp` : "--", change: null, color: funding.sofrMinusOnRrp !== null && funding.sofrMinusOnRrp >= 25 ? "text-red-600" : funding.sofrMinusOnRrp !== null && funding.sofrMinusOnRrp >= 15 ? "text-amber-600" : "text-slate-500", changeUnit: "%" as const },
  ].filter((item) => item.display !== "--") : [];

  // ── 通用数据项渲染 ──
  const renderDataItems = (items: RenderItem[]) => (
    <div className="flex items-center gap-5 flex-wrap">
      {items.map((item) => (
        <div key={item.label} className="text-center">
          <div className="text-[11px] text-slate-400 mb-0.5">{item.label}</div>
          <div className={`text-base font-bold font-mono ${item.color}`}>
            {item.display}
          </div>
          {item.change !== null && item.change !== undefined && (
            <div
              className={`text-[11px] font-mono ${
                item.change > 0 ? "text-red-500" : item.change < 0 ? "text-green-500" : "text-gray-400"
              }`}
            >
              {item.change > 0 ? "↑" : item.change < 0 ? "↓" : "→"}{" "}
              {item.changeUnit === "bn"
                ? formatBnChange(item.change)
                : `${Math.abs(item.change)}bp`}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  // ── 收益率快照列 ──
  const yieldColumn = (
    <div className="px-5 py-4 flex flex-col">
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="text-xs font-semibold text-slate-600">
          收益率快照 <span className="font-normal tracking-normal text-slate-400 text-[11px]">· Yield Snapshot</span>
        </span>
        {signal && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold tracking-wide ${signal.bg} ${signal.text} ${signal.border}`}>
            <span className={`w-[6px] h-[6px] rounded-full ${signal.accent}`} />
            {signal.label}
          </span>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center">
        {renderDataItems(yieldItems)}
      </div>

      <div className="mt-auto pt-3">
        <a
          href="https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView?type=daily_treasury_yield_curve"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-blue-500 hover:text-blue-700 underline underline-offset-2"
        >
          Data: Treasury.gov · Daily Yield Curve ↗
        </a>
      </div>
    </div>
  );

  // ── Real Yield 列 ──
  const realYieldColumn = yields.realYield10Y !== null ? (
    <div className="px-5 py-4 flex flex-col">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <span className="text-xs font-semibold text-slate-600">
          实际利率与通胀预期 <span className="font-normal tracking-normal text-slate-400 text-[11px]">· Real Yield & Breakeven</span>
        </span>
        {realYieldDriver && (
          <span className={`text-[10.5px] font-semibold ${realYieldDriver.color}`}>
            {realYieldDriver.text}
          </span>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center">
        {renderDataItems(realYieldItems)}
      </div>

      <div className="pt-3">
        <a
          href="https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView?type=daily_treasury_real_yield_curve"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-blue-500 hover:text-blue-700 underline underline-offset-2"
        >
          Data: Treasury.gov · TIPS Real Yield Curve ↗
        </a>
      </div>
    </div>
  ) : null;

  // ── Funding Stress 列 ──
  const fundingColumn = funding && funding.sofr !== null ? (
    <div className="px-5 py-4 flex flex-col">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <span className="text-xs font-semibold text-slate-600">
          资金面压力 <span className="font-normal tracking-normal text-slate-400 text-[11px]">· Funding Stress</span>
        </span>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
          funding.signal === "funding_stable"
            ? "bg-emerald-50 text-emerald-700"
            : funding.signal === "mild_pressure"
              ? "bg-amber-50 text-amber-700"
              : "bg-red-50 text-red-700"
        }`}>
          {funding.signalLabel}
        </span>
      </div>

      {(funding.onRrpWarning || funding.sofriorbWarning || funding.sofrOnrrpWarning) && (
        <div className="mb-2.5 flex flex-col gap-1">
          {funding.onRrpWarning && (
            <span className="text-[11px] text-amber-600 bg-amber-50/50 px-2 py-0.5 rounded">
              {funding.onRrpWarning}
            </span>
          )}
          {funding.sofriorbWarning && (
            <span className="text-[11px] text-red-600 bg-red-50/50 px-2 py-0.5 rounded">
              {funding.sofriorbWarning}
            </span>
          )}
          {funding.sofrOnrrpWarning && (
            <span className="text-[11px] text-red-600 bg-red-50/50 px-2 py-0.5 rounded">
              {funding.sofrOnrrpWarning}
            </span>
          )}
        </div>
      )}

      <div className="flex-1 flex items-center justify-center">
        <div className="grid grid-cols-3 gap-x-4 gap-y-3">
          {fundingItems.map((item) => (
            <div key={item.label} className="text-center">
              <div className="text-[11px] text-slate-400 mb-0.5">{item.label}</div>
              <div className={`text-base font-bold font-mono ${item.color}`}>
                {item.display}
              </div>
              {item.change !== null && item.change !== undefined && (
                <div
                  className={`text-[11px] font-mono ${
                    item.change > 0 ? "text-red-500" : item.change < 0 ? "text-green-500" : "text-gray-400"
                  }`}
                >
                  {item.change > 0 ? "↑" : item.change < 0 ? "↓" : "→"}{" "}
                  {item.changeUnit === "bn"
                    ? `${item.change.toFixed(3)}bn`
                    : `${Math.abs(item.change)}bp`}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="pt-3">
        <a
          href="https://www.newyorkfed.org/markets/reference-rates/sofr"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-blue-500 hover:text-blue-700 underline underline-offset-2"
        >
          Data: NY Fed SOFR ↗
        </a>
        <span className="text-[10px] text-slate-400 mx-1">|</span>
        <a
          href="https://www.newyorkfed.org/markets/desk-operations/reverse-repo"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-blue-500 hover:text-blue-700 underline underline-offset-2"
        >
          ON RRP ↗
        </a>
        <span className="text-[10px] text-slate-400 mx-1">|</span>
        <a
          href="https://www.newyorkfed.org/markets/desk-operations/repo"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-blue-500 hover:text-blue-700 underline underline-offset-2"
        >
          SRF ↗
        </a>
        <span className="text-[10px] text-slate-400 mx-1">|</span>
        <a
          href="https://fred.stlouisfed.org/series/IORB"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-blue-500 hover:text-blue-700 underline underline-offset-2"
        >
          FRED IORB ↗
        </a>
      </div>
    </div>
  ) : null;

  // ── 计算实际显示的列数，决定网格列数 ──
  const visibleCols = [yieldColumn, realYieldColumn, fundingColumn].filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto px-4 pt-6 pb-2">
      <Card className="bg-white border-gray-200/80 shadow-sm overflow-hidden">
        {/* 统一标题头 */}
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-bold text-slate-800 tracking-tight">
            美债日频因子
            <span className="font-normal text-slate-400 mx-1.5">｜</span>
            <span className="font-normal text-slate-500 text-xs tracking-normal">Daily UST Factors</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono bg-slate-50 px-2.5 py-1 rounded-md">
            {yields.date}
          </span>
        </div>

        {/* 三列内容区 — 垂直分割线保留边界 */}
        <div className={`grid grid-cols-1 ${
          visibleCols === 3 ? "lg:grid-cols-3" : visibleCols === 2 ? "lg:grid-cols-2" : ""
        } divide-y lg:divide-y-0 lg:divide-x divide-gray-100`}>
          {yieldColumn}
          {realYieldColumn}
          {fundingColumn}
        </div>
      </Card>
    </div>
  );
}
