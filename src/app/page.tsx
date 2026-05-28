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

      {/* ── Hero 区域 ── */}
      <div className="relative pt-13 overflow-hidden">
        {/* 背景光晕层 */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-blue-600/10 rounded-full blur-3xl" />
          <div className="absolute top-8 left-1/4 w-[400px] h-[200px] bg-cyan-500/5 rounded-full blur-2xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-12 pb-10">
          {/* 顶部小标签 */}
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-500/15 text-blue-300 border border-blue-500/20 tracking-wider">
              TREASURY FACTOR MONITOR
            </span>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              ● LIVE
            </span>
          </div>

          {/* 主标题 */}
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
            美债因子看板
            <span className="ml-4 text-xl font-light text-slate-400 tracking-widest align-baseline">
              US Rates Factor Desk
            </span>
          </h1>

          {/* 副标题描述 */}
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed mt-3">
            多维度追踪美国国债市场的核心驱动因子——从供给拍卖、持仓流向、杠杆周期到跨市场联动，
            <br className="hidden sm:block" />
            为利率研究提供一站式量化参考。
          </p>

          {/* 分隔线 */}
          <div className="mt-8 h-px bg-gradient-to-r from-transparent via-slate-600/40 to-transparent" />
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

      {/* ── 页脚 ── */}
      <footer className="mt-12 py-8 px-4 border-t border-[rgba(148,163,184,0.1)] bg-[rgba(7,12,22,0.6)]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">T</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-300">美债因子看板 · Treasury Factor Monitor</p>
                <p className="text-[11px] text-slate-500 mt-0.5">仅供研究参考，非投资建议</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-slate-500">
                数据来源：Treasury FiscalData · CFTC COT · BIS · FRED · TIC · MOF
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                非实时研究看板 · 数据更新频率因模块而异
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
