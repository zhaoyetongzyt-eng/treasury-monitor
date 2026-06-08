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
    bg: string;             // 底色（半透明）
    text: string;           // 强调色文字
    border: string;         // 边框
    accent: string;         // 左侧竖条强调色
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

    // ── 信号工厂：统一生成带色彩的信号 ───────────────────────
    const s = (opts: Omit<CurveSignal, "summary"> & { accent: string }): CurveSignal => ({
      ...opts,
      summary: `2Y ${bpStr(c2Y)}, 10Y ${bpStr(c10Y)}, 2s10s ${spreadBp}`,
    });

    // ── 1. 同向上行 + 10Y 更多 → Bear Steepening ──
    if (twoUp && tenUp && dSpread > THR) {
      return s({
        label: "Bear Steepening",
        interpretation: "全曲线利率上行，长端受通胀预期/供给/期限溢价推动涨幅更大，曲线陡峭化。",
        bg: "bg-orange-50/50", text: "text-orange-700", border: "border-orange-200/50", accent: "bg-orange-400",
      });
    }
    // ── 2. 同向上行 + 2Y 更多 → Bear Flattening ──
    if (twoUp && tenUp && dSpread < -THR) {
      return s({
        label: "Bear Flattening",
        interpretation: "全曲线利率上行，短端受鹰派政策预期/加息冲击更大，曲线平坦化。",
        bg: "bg-red-50/50", text: "text-red-700", border: "border-red-200/50", accent: "bg-red-400",
      });
    }
    // ── 3. 同向上行 + 幅度接近 → Bear Parallel ──
    if (twoUp && tenUp) {
      return s({
        label: "Bear Shift ↑",
        interpretation: "曲线整体平行上移，形态基本不变，反映全面利率上行压力。",
        bg: "bg-slate-50/50", text: "text-slate-700", border: "border-slate-200/50", accent: "bg-slate-400",
      });
    }

    // ── 4. 同向下行 + 2Y 更多 → Bull Steepening ──
    if (twoDown && tenDown && dSpread > THR) {
      return s({
        label: "Bull Steepening",
        interpretation: "全曲线利率下行，短端降息预期升温推动短端下行更快，曲线陡峭化。",
        bg: "bg-emerald-50/50", text: "text-emerald-700", border: "border-emerald-200/50", accent: "bg-emerald-400",
      });
    }
    // ── 5. 同向下行 + 10Y 更多 → Bull Flattening ──
    if (twoDown && tenDown && dSpread < -THR) {
      return s({
        label: "Bull Flattening",
        interpretation: "全曲线利率下行，长端受避险买盘/期限溢价回落推动下行更快，曲线平坦化。",
        bg: "bg-blue-50/50", text: "text-blue-700", border: "border-blue-200/50", accent: "bg-blue-400",
      });
    }
    // ── 6. 同向下行 + 幅度接近 → Bull Parallel ──
    if (twoDown && tenDown) {
      return s({
        label: "Bull Shift ↓",
        interpretation: "曲线整体平行下移，形态基本不变，反映全面利率下行。",
        bg: "bg-slate-50/50", text: "text-slate-700", border: "border-slate-200/50", accent: "bg-slate-400",
      });
    }

    // ── 7. 反向：2Y↑ + 10Y↓ → Twist Flattening ──
    if (twoUp && tenDown) {
      return s({
        label: "Twist Flattening",
        interpretation: "短端受鹰派政策/Fed路径重定价推动上行，长端交易增长放缓或避险买盘，曲线扭曲式走平。",
        bg: "bg-purple-50/50", text: "text-purple-700", border: "border-purple-200/50", accent: "bg-purple-400",
      });
    }
    // ── 8. 反向：2Y↓ + 10Y↑ → Twist Steepening ──
    if (twoDown && tenUp) {
      return s({
        label: "Twist Steepening",
        interpretation: "短端反映降息预期升温，长端受通胀、供给或期限溢价上升推动，曲线扭曲式变陡。",
        bg: "bg-violet-50/50", text: "text-violet-700", border: "border-violet-200/50", accent: "bg-violet-400",
      });
    }

    // ── 9. 仅短端变动 ──
    if (twoUp && tenFlat) {
      return s({
        label: "Short-end Bear Flattening",
        interpretation: "主要由短端政策预期冲击推动上行，长端基本稳定，曲线由短端主导走平。",
        bg: "bg-rose-50/50", text: "text-rose-700", border: "border-rose-200/50", accent: "bg-rose-400",
      });
    }
    if (twoDown && tenFlat) {
      return s({
        label: "Short-end Bull Steepening",
        interpretation: "主要由降息预期推动短端下行，长端基本稳定，曲线由短端主导变陡。",
        bg: "bg-teal-50/50", text: "text-teal-700", border: "border-teal-200/50", accent: "bg-teal-400",
      });
    }

    // ── 10. 仅长端变动 ──
    if (tenUp && twoFlat) {
      return s({
        label: "Long-end Bear Steepening",
        interpretation: "主要由长端期限溢价或供给压力推动上行，短端基本锚定，曲线由长端主导变陡。",
        bg: "bg-amber-50/50", text: "text-amber-700", border: "border-amber-200/50", accent: "bg-amber-400",
      });
    }
    if (tenDown && twoFlat) {
      return s({
        label: "Long-end Bull Flattening",
        interpretation: "主要由长端避险买盘或期限溢价下行推动，短端基本锚定，曲线由长端主导走平。",
        bg: "bg-cyan-50/50", text: "text-cyan-700", border: "border-cyan-200/50", accent: "bg-cyan-400",
      });
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
                  <span className={`w-[6px] h-[6px] rounded-full ${signal.accent}`} />
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
          {/* 信号解读行 — 白色玻璃质感底 + 左色条强调 */}
          {signal && (
            <div className="mt-2.5 flex items-start gap-2.5 rounded-lg bg-white/60 backdrop-blur-sm border border-white/80 shadow-sm px-3.5 py-2.5">
              {/* 左色条 */}
              <div className={`w-[3px] shrink-0 self-stretch rounded-full mt-0.5 ${signal.accent}`} />
              <div className="min-w-0 text-[12px] leading-[1.65]">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${signal.text}`}>
                    {signal.label}
                  </span>
                  <span className="text-[10.5px] text-slate-400 font-mono">{signal.summary}</span>
                </div>
                <div className="text-slate-600">{signal.interpretation}</div>
              </div>
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
