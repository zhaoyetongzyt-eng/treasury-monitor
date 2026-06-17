import NavBar from "@/components/layout/NavBar";
import YieldOverviewCard from "@/components/shared/YieldOverviewCard";
import MacroFrameworkModule from "@/components/modules/macro-framework/MacroFrameworkModule";
import AuctionModule from "@/components/modules/auction/AuctionModule";
import HoldingsModule from "@/components/modules/holdings/HoldingsModule";
import USTHoldersModule from "@/components/modules/ust-holders/USTHoldersModule";
import LeverageModule from "@/components/modules/leverage/LeverageModule";
import GlobalInvestorModule from "@/components/modules/global-investor/GlobalInvestorModule";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* 顶部导航 */}
      <NavBar />

      {/* 看板标题 */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-slate-900 text-white mt-12">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <h1 className="text-3xl font-bold tracking-tight">美债流动性与供需面看板</h1>
          <p className="text-lg text-blue-200 mt-1 font-light">US Treasury Liquidity &amp; Supply-Demand Monitor</p>
          <p className="text-sm text-blue-300/70 mt-3 max-w-2xl">
            聚焦美债供给压力、需求承接与资金面流动性变化，系统跟踪拍卖、持仓、回购、杠杆与全球资金流信号，为利率研究和交易判断提供量化参考。
          </p>
        </div>
      </div>

      {/* 收益率概览卡片（所有模块之前） */}
      <YieldOverviewCard />

      {/* ★ 模块 01：宏观定价框架 */}
      <MacroFrameworkModule />

      {/* 模块 02：供给与拍卖 */}
      <AuctionModule />

      {/* 模块 02：持仓与资金流 */}
      <HoldingsModule />

      {/* 模块 03：UST 持有人结构 */}
      <USTHoldersModule />

      {/* 模块 04：杠杆率 */}
      <LeverageModule />

      {/* 模块 05：全球资金视角 */}
      <GlobalInvestorModule />

      {/* 页脚 */}
      <footer className="py-8 px-4 text-center text-xs text-gray-400 border-t border-gray-200 mt-8">
        <p>美债流动性与供需面看板 · US Treasury Liquidity &amp; Supply-Demand Monitor</p>
        <p className="mt-1">数据来源：Treasury / TreasuryDirect / FiscalData / TIC / FRED / Fed / NY Fed / CFTC / BIS / MOF / ECB / IMF / WGC</p>
        <p className="mt-1">数据更新时间：各模块最新可得数据，日频/周频/月频/季频不同步 · 非实时研究看板</p>
      </footer>
    </div>
  );
}
