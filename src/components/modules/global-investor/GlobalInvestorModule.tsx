"use client";

import ModuleHeader from "@/components/layout/ModuleHeader";
import JapanSubModule from "./JapanSubModule";
import UKSubModule from "./UKSubModule";

// ============================================================
// 全球资金与储备配置模块 (05)
// 储备资产结构变化 + 日本视角 + 英国视角
// ============================================================

// -------- Gold vs UST 数据（手动维护，以 ECB/WGC/IMF COFER 最新报告为准）--------
// 数据日期: 2025 末 / 2026Q1（ECB International Role of the Euro 2025年报）
// 来源: ECB International Role of the Euro Report · WGC Central Bank Gold Reserves
//       IMF COFER (Currency Composition of Official Foreign Exchange Reserves)
const GOLD_DATA = {
  goldShare: 27,     // 黄金占全球官方储备比例（市场价值，ECB 2025年报）
  ustShare: 22,      // 美国国债占全球官方储备比例
  euroShare: 15,     // 欧元资产占比
  usdTotal: 42,      // 美元计价资产合计占比（含 UST + 机构债 + 存款等）
  dataDate: "2025 末 / 2026Q1",
  sources: [
    {
      label: "ECB International Role of the Euro",
      url: "https://www.ecb.europa.eu/press/other-publications/ire/html/ecb.ire202606.en.html",
    },
    {
      label: "WGC Central Bank Gold Reserves",
      url: "https://www.gold.org/goldhub/data/gold-reserves-by-country",
    },
    {
      label: "IMF COFER",
      url: "https://data.imf.org/?sk=E6A5F467-C14B-4AA8-9F6D-5A09EC4E62A4",
    },
  ],
};

export default function GlobalInvestorModule() {
  return (
    <section id="global-investor" className="py-8 px-4 max-w-7xl mx-auto scroll-mt-16">
      <ModuleHeader
        number="05"
        title="全球资金与储备配置"
        titleEn="Global Reserves & Investor Lens"
        description="从储备资产多元化、日本最大持有人与英国高息替代资产三个维度，评估美债对全球资金的长期吸引力。"
      />

      {/* ================================================================ */}
      {/* 0. 储备资产结构变化：Gold vs UST */}
      {/* ================================================================ */}
      <div className="mb-10">
        {/* 分区标题 */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-yellow-100 text-yellow-700 text-sm font-bold">
            ★
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              储备资产结构变化：Gold vs UST
            </h3>
            <p className="text-xs text-gray-400">
              Reserve Asset Composition: Gold vs US Treasuries
            </p>
          </div>
        </div>

        {/* 横向提示卡 */}
        <div className="mb-2 p-4 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-sm text-amber-800 leading-relaxed">
            <span className="font-semibold">关键信号：</span>
            欧央行报告显示，按市场价值计算，截至 2025 年底，黄金占全球官方储备的比例升至 27%，超过美国国债的 22%，成为全球官方储备中最大的单一资产类别。
          </p>
        </div>

        {/* ECB 报告引用链接 */}
        <div className="mb-4 text-right">
          <a
            href="https://www.ecb.europa.eu/press/other-publications/ire/html/ecb.ire202606.en.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-blue-500 hover:underline"
          >
            ECB · The International Role of the Euro, June 2026 ↗
          </a>
        </div>

        {/* 4 个数据卡片 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
            <p className="text-xs text-yellow-600 font-medium mb-1">Gold Share</p>
            <p className="text-2xl font-bold text-yellow-700">{GOLD_DATA.goldShare}%</p>
            <p className="text-[10px] text-gray-500 mt-1">黄金占全球官方储备</p>
            <p className="text-[10px] text-yellow-600 mt-0.5 font-medium">▲ 最大单一资产类别</p>
          </div>
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-xs text-blue-600 font-medium mb-1">US Treasuries Share</p>
            <p className="text-2xl font-bold text-blue-700">{GOLD_DATA.ustShare}%</p>
            <p className="text-[10px] text-gray-500 mt-1">美国国债占全球官方储备</p>
            <p className="text-[10px] text-blue-600 mt-0.5">单一资产，已被黄金超越</p>
          </div>
          <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-200">
            <p className="text-xs text-indigo-600 font-medium mb-1">Euro Assets Share</p>
            <p className="text-2xl font-bold text-indigo-700">{GOLD_DATA.euroShare}%</p>
            <p className="text-[10px] text-gray-500 mt-1">欧元计价资产占比</p>
            <p className="text-[10px] text-indigo-600 mt-0.5">欧元区主权债为主</p>
          </div>
          <div className="p-4 rounded-lg bg-green-50 border border-green-200">
            <p className="text-xs text-green-600 font-medium mb-1">USD Assets Total</p>
            <p className="text-2xl font-bold text-green-700">{GOLD_DATA.usdTotal}%</p>
            <p className="text-[10px] text-gray-500 mt-1">美元计价资产合计</p>
            <p className="text-[10px] text-green-600 mt-0.5">含 UST、机构债、存款等</p>
          </div>
        </div>

        {/* 注意：黄金 vs UST，而非黄金 vs 美元总体 */}
        <div className="mb-4 p-3 rounded-lg bg-gray-50 border border-gray-200">
          <p className="text-xs text-gray-600 leading-relaxed">
            <span className="font-semibold text-gray-800">注意区分：</span>
            黄金 (27%) 超过的是"美国国债" (22%)，而非超过全部美元计价资产 (42%)。
            美元资产合计仍是最大类别，不宜解读为"美元储备地位终结"。
          </p>
        </div>

        {/* 蓝色判断框 */}
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-sm text-blue-800 leading-relaxed">
            <span className="font-semibold">当前判断：</span>
            黄金超过美债说明官方储备资产正在多元化，美债的长期储备需求可能面临边际削弱。
            但由于美元资产合计占比仍高、UST 仍具备最深流动性和安全资产属性，
            这更像是"储备配置再平衡"信号，而不是"美元体系失效"信号。
            对美债而言，核心影响在于长期官方储备买盘的边际弱化：
            当黄金、Gilt、Bund 等资产提供替代配置逻辑时，美债需要依靠更高收益率、
            流动性溢价和美元安全资产属性来维持全球吸引力。
          </p>
        </div>

        {/* 数据来源 */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          <span className="text-[10px] text-gray-400">数据来源（{GOLD_DATA.dataDate}）：</span>
          {GOLD_DATA.sources.map((s) => (
            <a
              key={s.url}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-blue-500 hover:underline"
            >
              {s.label} ↗
            </a>
          ))}
        </div>
      </div>

      {/* ================================================================ */}
      {/* A. 日本视角：最大海外持有人与汇率对冲压力 */}
      {/* ================================================================ */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-700 text-sm font-bold">
            A
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              日本视角：最大海外持有人与汇率对冲压力
            </h3>
            <p className="text-xs text-gray-400">
              Japan Lens: Largest Foreign Holder &amp; FX Hedge Pressure
            </p>
          </div>
        </div>
        <JapanSubModule />
      </div>

      {/* ================================================================ */}
      {/* B. 英国视角：金融中心与 UST 高息替代资产 */}
      {/* ================================================================ */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-sm font-bold">
            B
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              英国视角：金融中心与 UST 高息替代资产
            </h3>
            <p className="text-xs text-gray-400">
              UK Lens: Financial Hub &amp; Gilt as High-Yield Alternative to UST
            </p>
          </div>
        </div>
        <UKSubModule />
      </div>
    </section>
  );
}
