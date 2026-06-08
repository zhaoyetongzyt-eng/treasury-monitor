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

  // ── 收益率曲线形态信号判断（10 种情况，阈值 1bp）────────────────
  // Δ2Y = change2Y (bp), Δ10Y = change10Y (bp)
  // ΔSpread = Δ10Y - Δ2Y  →  >0 Steepening, <0 Flattening
  // 同向↑→Bear, 同向↓→Bull, 反向→Twist, 一端不变→Short/Long-end
  type CurveSignal = {
    label: string;
    summary: string;        // 数值摘要 e.g. "2Y +6bp, 10Y -3bp, 2s10s -9bp"
    interpretation: string;  // 驱动解释
    bg: string;
    text: string;
    border: string;
  };

  function bpStr(v: number): string {
    return `${v > 0 ? "+" : ""}${v.toFixed(0)}bp`;
  }

  function getCurveSignal(c2Y: number | null, c10Y: number | null, cSpread: number | null): CurveSignal | null {
    if (c2Y === null || c10Y === null) return null;
    const THR = 1.0; // bp, |Δ| ≤ 1bp 视为基本不变

    const twoUp    = c2Y  >  THR;
    const twoDown  = c2Y  < -THR;
    const twoFlat  = !twoUp && !twoDown;
    const tenUp    = c10Y >  THR;
    const tenDown  = c10Y < -THR;
    const tenFlat  = !tenUp && !tenDown;

    const dSpread = (c10Y - c2Y);           // >0 steepening, <0 flattening
    const spreadBp = cSpread !== null ? `${bpStr(cSpread)}` : "--";

    // ── 1. 同向上行 + 10Y 更多 → Bear Steepening ──
    if (twoUp && tenUp && dSpread > THR) {
      return {
        label: "Bear Steepening",
        summary: `2Y ${bpStr(c2Y)}, 10Y ${bpStr(c10Y)}, 2s10s ${spreadBp}`,
        interpretation: "全曲线利率上行，长端受通胀预期/供给/期限溢价推动涨幅更大，曲线陡峭化。",
        bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200",
      };
    }
    // ── 2. 同向上行 + 2Y 更多 → Bear Flattening ──
    if (twoUp && tenUp && dSpread < -THR) {
      return {
        label: "Bear Flattening",
        summary: `2Y ${bpStr(c2Y)}, 10Y ${bpStr(c10Y)}, 2s10s ${spreadBp}`,
        interpretation: "全曲线利率上行，短端受鹰派政策预期/加息冲击更大，曲线平坦化。",
        bg: "bg-red-50", text: "text-red-700", border: "border-red-200",
      };
    }
    // ── 3. 同向上行 + 幅度接近 → Bear Parallel ──
    if (twoUp && tenUp) {
      return {
        label: "Bear Shift ↑",
        summary: `2Y ${bpStr(c2Y)}, 10Y ${bpStr(c10Y)}, 2s10s ${spreadBp}`,
        interpretation: "曲线整体平行上移，形态基本不变，反映全面利率上行压力。",
        bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200",
      };
    }

    // ── 4. 同向下行 + 2Y 更多 → Bull Steepening ──
    if (twoDown && tenDown && dSpread > THR) {
      return {
        label: "Bull Steepening",
        summary: `2Y ${bpStr(c2Y)}, 10Y ${bpStr(c10Y)}, 2s10s ${spreadBp}`,
        interpretation: "全曲线利率下行，短端降息预期升温推动短端下行更快，曲线陡峭化。",
        bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200",
      };
    }
    // ── 5. 同向下行 + 10Y 更多 → Bull Flattening ──
    if (twoDown && tenDown && dSpread < -THR) {
      return {
        label: "Bull Flattening",
        summary: `2Y ${bpStr(c2Y)}, 10Y ${bpStr(c10Y)}, 2s10s ${spreadBp}`,
        interpretation: "全曲线利率下行，长端受避险买盘/期限溢价回落推动下行更快，曲线平坦化。",
        bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200",
      };
    }
    // ── 6. 同向下行 + 幅度接近 → Bull Parallel ──
    if (twoDown && tenDown) {
      return {
        label: "Bull Shift ↓",
        summary: `2Y ${bpStr(c2Y)}, 10Y ${bpStr(c10Y)}, 2s10s ${spreadBp}`,
        interpretation: "曲线整体平行下移，形态基本不变，反映全面利率下行。",
        bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200",
      };
    }

    // ── 7. 反向：2Y↑ + 10Y↓ → Twist Flattening ──
    if (twoUp && tenDown) {
      return {
        label: "Twist Flattening",
        summary: `2Y ${bpStr(c2Y)}, 10Y ${bpStr(c10Y)}, 2s10s ${spreadBp}`,
        interpretation: "短端受鹰派政策/Fed路径重定价推动上行，长端交易增长放缓或避险买盘，曲线扭曲式走平。",
        bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200",
      };
    }
    // ── 8. 反向：2Y↓ + 10Y↑ → Twist Steepening ──
    if (twoDown && tenUp) {
      return {
        label: "Twist Steepening",
        summary: `2Y ${bpStr(c2Y)}, 10Y ${bpStr(c10Y)}, 2s10s ${spreadBp}`,
        interpretation: "短端反映降息预期升温，长端受通胀、供给或期限溢价上升推动，曲线扭曲式变陡。",
        bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200",
      };
    }

    // ── 9. 仅短端变动 ──
    if (twoUp && tenFlat) {
      return {
        label: "Short-end Bear Flattening",
        summary: `2Y ${bpStr(c2Y)}, 10Y ${bpStr(c10Y)}, 2s10s ${spreadBp}`,
        interpretation: "主要由短端政策预期冲击推动上行，长端基本稳定，曲线由短端主导走平。",
        bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200",
      };
    }
    if (twoDown && tenFlat) {
      return {
        label: "Short-end Bull Steepening",
        summary: `2Y ${bpStr(c2Y)}, 10Y ${bpStr(c10Y)}, 2s10s ${spreadBp}`,
        interpretation: "主要由降息预期推动短端下行，长端基本稳定，曲线由短端主导变陡。",
        bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200",
      };
    }

    // ── 10. 仅长端变动 ──
    if (tenUp && twoFlat) {
      return {
        label: "Long-end Bear Steepening",
        summary: `2Y ${bpStr(c2Y)}, 10Y ${bpStr(c10Y)}, 2s10s ${spreadBp}`,
        interpretation: "主要由长端期限溢价或供给压力推动上行，短端基本锚定，曲线由长端主导变陡。",
        bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200",
      };
    }
    if (tenDown && twoFlat) {
      return {
        label: "Long-end Bull Flattening",
        summary: `2Y ${bpStr(c2Y)}, 10Y ${bpStr(c10Y)}, 2s10s ${spreadBp}`,
        interpretation: "主要由长端避险买盘或期限溢价下行推动，短端基本锚定，曲线由长端主导走平。",
        bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200",
      };
    }

    return null; // 两端均基本不变
  }

  const signal = getCurveSignal(yields.change2Y, yields.change10Y, yields.change2s10s);

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
          {/* 信号解读行 */}
          {signal && (
            <div className={`mt-2.5 px-3 py-2 rounded-md border text-xs leading-relaxed ${signal.bg} ${signal.text} ${signal.border}`}>
              <span className="font-mono font-semibold">{signal.summary}</span>
              <span className="mx-2 text-slate-300">|</span>
              <span className="opacity-85">{signal.interpretation}</span>
            </div>
          )}
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
