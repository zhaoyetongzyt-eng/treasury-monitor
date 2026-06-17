"use client";

import ModuleHeader from "@/components/layout/ModuleHeader";
import FundamentalsSubModule from "./FundamentalsSubModule";
import PolicySubModule from "./PolicySubModule";
import SentimentSubModule from "./SentimentSubModule";

// ============================================================
// 宏观定价框架模块 (01)
// 三大维度：基本面 / 政策面 / 情绪面
// ============================================================

export default function MacroFrameworkModule() {
  return (
    <section id="macro-framework" className="max-w-7xl mx-auto px-4 py-10">
      <ModuleHeader
        number="01"
        title="宏观定价框架"
        titleEn="Macro Pricing Framework"
        description="从基本面、政策面与情绪面三个维度构建美债定价锚，辅助判断收益率中枢与利率方向。"
      />

      {/* 三列布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">

        {/* ── A 基本面 ── */}
        <div className="px-6 py-5 border-b lg:border-b-0 lg:border-r border-slate-100">
          <FundamentalsSubModule />
          {/* 数据来源 */}
          <div className="pt-4 mt-2 border-t border-slate-100 flex flex-wrap gap-x-2 gap-y-1">
            <a href="https://fred.stlouisfed.org/series/A191RL1Q225SBEA" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:text-blue-700 underline underline-offset-2">GDP ↗</a>
            <span className="text-[10px] text-slate-300">|</span>
            <a href="https://fred.stlouisfed.org/series/PCEPILFE" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:text-blue-700 underline underline-offset-2">PCE ↗</a>
            <span className="text-[10px] text-slate-300">|</span>
            <a href="https://fred.stlouisfed.org/series/CPIAUCSL" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:text-blue-700 underline underline-offset-2">CPI ↗</a>
            <span className="text-[10px] text-slate-300">|</span>
            <a href="https://fred.stlouisfed.org/series/UNRATE" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:text-blue-700 underline underline-offset-2">失业率 ↗</a>
            <span className="text-[10px] text-slate-300">|</span>
            <a href="https://fred.stlouisfed.org/series/PAYEMS" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:text-blue-700 underline underline-offset-2">非农 ↗</a>
            <span className="text-[10px] text-slate-300">|</span>
            <a href="https://fred.stlouisfed.org/series/FYFSGDA188S" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:text-blue-700 underline underline-offset-2">赤字/GDP ↗</a>
          </div>
        </div>

        {/* ── B 政策面 ── */}
        <div className="px-6 py-5 border-b lg:border-b-0 lg:border-r border-slate-100">
          <PolicySubModule />
          {/* 数据来源 */}
          <div className="pt-4 mt-2 border-t border-slate-100">
            <a
              href="https://www.federalreserve.gov/monetarypolicy.htm"
              target="_blank" rel="noopener noreferrer"
              className="text-[10px] text-blue-500 hover:text-blue-700 underline underline-offset-2"
            >Fed Policy ↗</a>
            <span className="text-[10px] text-slate-300 mx-1">|</span>
            <a
              href="https://fred.stlouisfed.org/series/WALCL"
              target="_blank" rel="noopener noreferrer"
              className="text-[10px] text-blue-500 hover:text-blue-700 underline underline-offset-2"
            >FRED Balance Sheet ↗</a>
          </div>
        </div>

        {/* ── C 情绪面 ── */}
        <div className="px-6 py-5">
          <SentimentSubModule />
          {/* 数据来源 */}
          <div className="pt-4 mt-2 border-t border-slate-100">
            <a
              href="https://www.cftc.gov/dea/options/financial_lof.htm"
              target="_blank" rel="noopener noreferrer"
              className="text-[10px] text-blue-500 hover:text-blue-700 underline underline-offset-2"
            >CFTC COT ↗</a>
            <span className="text-[10px] text-slate-300 mx-1">|</span>
            <a
              href="https://www.newyorkfed.org/research/data_indicators/term-premia"
              target="_blank" rel="noopener noreferrer"
              className="text-[10px] text-blue-500 hover:text-blue-700 underline underline-offset-2"
            >ACM Term Premium ↗</a>
            <span className="text-[10px] text-slate-300 mx-1">|</span>
            <a
              href="https://www.ice.com/index/move"
              target="_blank" rel="noopener noreferrer"
              className="text-[10px] text-blue-500 hover:text-blue-700 underline underline-offset-2"
            >MOVE Index ↗</a>
          </div>
        </div>

      </div>

      {/* 口径说明 */}
      <div className="mt-3 px-5 py-3 rounded-lg bg-slate-50 border border-slate-100">
        <p className="text-[11px] leading-relaxed text-slate-500">
          <span className="font-semibold text-slate-600">数据频率说明：</span>
          GDP为季频，PCE/CPI/就业为月频，Fed资产负债表为周频，利率、利差、VIX、信用利差和美元指数为日频。不同指标最新发布日期不同，页面展示为各自最新可得数据，非同一交易日截面。
        </p>
      </div>
    </section>
  );
}
