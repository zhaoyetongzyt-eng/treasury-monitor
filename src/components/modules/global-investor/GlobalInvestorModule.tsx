"use client";

import ModuleHeader from "@/components/layout/ModuleHeader";
import JapanSubModule from "./JapanSubModule";
import UKSubModule from "./UKSubModule";

// ============================================================
// 全球资金视角模块 (05)
// 从全球投资者的角度审视美债的相对吸引力
// ============================================================

export default function GlobalInvestorModule() {
  return (
    <section id="global-investor" className="py-8 px-4 max-w-7xl mx-auto scroll-mt-16">
      <ModuleHeader
        number="05"
        title="全球资金视角"
        titleEn="Global Investor Lens"
        description="从日本（最大海外持有人）和英国（金融中心+高息竞争者）两大视角，评估美债对全球资金的相对吸引力。"
      />

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
              Japan Lens: Largest Foreign Holder & FX Hedge Pressure
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
