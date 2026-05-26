import NavBar from "@/components/layout/NavBar";
import YieldOverviewCard from "@/components/shared/YieldOverviewCard";
import AuctionModule from "@/components/modules/auction/AuctionModule";
import HoldingsModule from "@/components/modules/holdings/HoldingsModule";
import LeverageModule from "@/components/modules/leverage/LeverageModule";
import USTHoldersModule from "@/components/modules/ust-holders/USTHoldersModule";
import { PlaceholderModule } from "@/components/modules/PlaceholderModule";

const placeholderModules = [
  { id: "yield-curve", number: "05", title: "收益率曲线", titleEn: "Yield Curve", description: "美国国债各期限收益率叠加对比，追踪曲线形态变化与期限利差信号。" },
  { id: "decomposition", number: "06", title: "成分分解", titleEn: "Decomposition", description: "将长期利率分解为期限溢价、实际利率和通胀预期三大成分（Clarida 四分法）。" },
  { id: "scorecard", number: "07", title: "因子计分卡", titleEn: "Scorecard", description: "多因子评分模型——对增长、通胀、政策、供求等因子分别打分并综合形成市场立场。" },
  { id: "policy", number: "08", title: "货币政策", titleEn: "Monetary Policy", description: "追踪美联储政策利率路径、市场隐含降息概率及流动性管道。" },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* 顶部导航 */}
      <NavBar />

      {/* 看板标题 */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-slate-900 text-white mt-12">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <h1 className="text-3xl font-bold tracking-tight">美债因子看板</h1>
          <p className="text-lg text-blue-200 mt-1 font-light">US Rates Factor Desk</p>
          <p className="text-sm text-blue-300/70 mt-3 max-w-2xl">
            多维度追踪美国国债市场的核心驱动因子——从供给拍卖、持仓流向、杠杆周期到跨市场联动，为利率研究提供一站式量化参考。
          </p>
        </div>
      </div>

      {/* 收益率概览卡片（所有模块之前） */}
      <YieldOverviewCard />

      {/* ★ 模块 01：供给与拍卖 */}
      <AuctionModule />

      {/* ★ 模块 02：持仓与资金流 */}
      <HoldingsModule />

      {/* ★ 模块 03：杠杆率 */}
      <LeverageModule />

      {/* ★ 模块 04：UST 买卖机构 */}
      <USTHoldersModule />

      {/* 占位模块 */}
      {placeholderModules.map((m) => (
        <PlaceholderModule key={m.id} {...m} />
      ))}

      {/* 跨市场、事件与观点 */}
      <PlaceholderModule
        id="cross-market"
        number="09"
        title="跨市场背景"
        titleEn="Cross-Market"
        description="对比全球主要经济体利率走势、风险资产及通胀商品价格，提供宏观交叉验证。"
      />
      <PlaceholderModule
        id="events"
        number="10"
        title="事件与观点"
        titleEn="Events & Views"
        description="追踪关键经济数据发布日历、央行官员讲话及市场投资观点。"
      />

      {/* 页脚 */}
      <footer className="py-8 px-4 text-center text-xs text-gray-400 border-t border-gray-200 mt-8">
        <p>美债因子看板 · Treasury Factor Monitor</p>
        <p className="mt-1">数据来源：Treasury FiscalData · CFTC COT · BIS · FRED</p>
        <p className="mt-1">数据快照：2026-05-18 收盘 · 非实时研究看板</p>
      </footer>
    </div>
  );
}
