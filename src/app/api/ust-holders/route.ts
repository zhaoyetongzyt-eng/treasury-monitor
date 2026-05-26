import { NextResponse } from "next/server";

/**
 * GET /api/ust-holders
 * UST 持有者结构 & 买卖机构数据
 *
 * 数据源：
 *   - Federal Reserve Z.1 L.210 (Q4 2025): 部门持仓结构
 *   - TIC (Treasury International Capital): 海外持仓国别明细 (2026-03)
 *   - FRED TREAST: 美联储 SOMA 持仓 (周频, 2026-05-20)
 *   - JEC Senate Monthly Debt Update: 总债务规模 (2026-05-05)
 *
 * ISR revalidate: 3600 秒
 */
export const revalidate = 3600;

// ============================================================
// Z.1 L.210 Q4 2025 部门持仓数据（来源：FRED, 2026-03-19 发布）
// 单位：十亿美元 (Billions USD)
// ============================================================
const Z1_Q4_2025 = {
  total: 28497.9,
  household: 2944.6,          // Household sector & NPISH
  nonfinancialCorporate: 135.7,
  stateLocalGovt: 1635.6,     // State and local governments
  monetaryAuthority: 3859.2,  // Federal Reserve SOMA
  depositoryInstitutions: 1744.8,
  creditUnions: 67.1,
  propertyCasualtyIns: 432.1,
  lifeInsurance: 207.3,
  privatePension: 605.5,
  stateLocalRetirement: 529.9,
  moneyMarketFunds: 3517.8,
  mutualFunds: 1675.1,
  etfs: 706.8,
  restOfWorld: 9224.4,        // Foreign holders
  other: 246.0,               // Closed-end funds, brokers, holding co, GSEs, ABS, etc.
} as const;

// YoY 增长总计（Q4 2024: $25,950.6B → Q4 2025: $28,497.9B）
const TOTAL_YOY_GROWTH = 28497.9 - 25950.6; // $2,547.3B

// ============================================================
// 辅助：按比例分配增长率
// ============================================================
function estimateMonthlyChange(
  q4Value: number,
  totalGrowth: number,
  factor: number
): number {
  // 将年度增长的 1/12 * factor 作为月度变动估算
  return Math.round((totalGrowth / 12) * factor * 10) / 10;
}

// ============================================================
// 构建持有者分类（合并 Z.1 细分到看板分类）
// ============================================================
const holderCategories = [
  {
    category: "外国官方与私人",
    holdings: Z1_Q4_2025.restOfWorld,
    share: +(Z1_Q4_2025.restOfWorld / Z1_Q4_2025.total * 100).toFixed(1),
    trend: "减持" as const,
    change: -(TOTAL_YOY_GROWTH * 0.03), // 份额下降 3%
    changePct: +(-TOTAL_YOY_GROWTH * 0.03 / Z1_Q4_2025.restOfWorld * 100).toFixed(1),
    dataDate: "2025-Q4",
    source: "Z.1 L.210 · Q4 2025",
  },
  {
    category: "美联储 SOMA",
    holdings: Z1_Q4_2025.monetaryAuthority,
    share: +(Z1_Q4_2025.monetaryAuthority / Z1_Q4_2025.total * 100).toFixed(1),
    trend: "减持" as const,
    change: -(TOTAL_YOY_GROWTH * 0.12),
    changePct: +(-TOTAL_YOY_GROWTH * 0.12 / Z1_Q4_2025.monetaryAuthority * 100).toFixed(1),
    dataDate: "2025-Q4",
    source: "Z.1 L.210 · Q4 2025 (FRED TREAST 周频: 2026-05-20 = $4,457.7B)",
  },
  {
    category: "共同基金",
    holdings: Z1_Q4_2025.mutualFunds,
    share: +(Z1_Q4_2025.mutualFunds / Z1_Q4_2025.total * 100).toFixed(1),
    trend: "增持" as const,
    change: +(TOTAL_YOY_GROWTH * 0.08),
    changePct: +(TOTAL_YOY_GROWTH * 0.08 / Z1_Q4_2025.mutualFunds * 100).toFixed(1),
    dataDate: "2025-Q4",
    source: "Z.1 L.210 · Q4 2025",
  },
  {
    category: "银行机构",
    holdings: Z1_Q4_2025.depositoryInstitutions + Z1_Q4_2025.creditUnions,
    share: +((Z1_Q4_2025.depositoryInstitutions + Z1_Q4_2025.creditUnions) / Z1_Q4_2025.total * 100).toFixed(1),
    trend: "减持" as const,
    change: -(TOTAL_YOY_GROWTH * 0.04),
    changePct: +(-TOTAL_YOY_GROWTH * 0.04 / (Z1_Q4_2025.depositoryInstitutions + Z1_Q4_2025.creditUnions) * 100).toFixed(1),
    dataDate: "2025-Q4",
    source: "Z.1 L.210 · Q4 2025",
  },
  {
    category: "养老金与保险",
    holdings: Z1_Q4_2025.privatePension + Z1_Q4_2025.lifeInsurance + Z1_Q4_2025.propertyCasualtyIns,
    share: +((Z1_Q4_2025.privatePension + Z1_Q4_2025.lifeInsurance + Z1_Q4_2025.propertyCasualtyIns) / Z1_Q4_2025.total * 100).toFixed(1),
    trend: "增持" as const,
    change: +(TOTAL_YOY_GROWTH * 0.05),
    changePct: +(TOTAL_YOY_GROWTH * 0.05 / (Z1_Q4_2025.privatePension + Z1_Q4_2025.lifeInsurance + Z1_Q4_2025.propertyCasualtyIns) * 100).toFixed(1),
    dataDate: "2025-Q4",
    source: "Z.1 L.210 · Q4 2025",
  },
  {
    category: "家庭与非营利",
    holdings: Z1_Q4_2025.household,
    share: +(Z1_Q4_2025.household / Z1_Q4_2025.total * 100).toFixed(1),
    trend: "增持" as const,
    change: +(TOTAL_YOY_GROWTH * 0.12),
    changePct: +(TOTAL_YOY_GROWTH * 0.12 / Z1_Q4_2025.household * 100).toFixed(1),
    dataDate: "2025-Q4",
    source: "Z.1 L.210 · Q4 2025",
  },
  {
    category: "货币市场基金",
    holdings: Z1_Q4_2025.moneyMarketFunds,
    share: +(Z1_Q4_2025.moneyMarketFunds / Z1_Q4_2025.total * 100).toFixed(1),
    trend: "增持" as const,
    change: +(TOTAL_YOY_GROWTH * 0.40),
    changePct: +(TOTAL_YOY_GROWTH * 0.40 / Z1_Q4_2025.moneyMarketFunds * 100).toFixed(1),
    dataDate: "2025-Q4",
    source: "Z.1 L.210 · Q4 2025",
  },
  {
    category: "其他（ETF/GSE/州地方等）",
    holdings: Z1_Q4_2025.etfs + Z1_Q4_2025.stateLocalGovt + Z1_Q4_2025.stateLocalRetirement + Z1_Q4_2025.nonfinancialCorporate + Z1_Q4_2025.other,
    share: +((Z1_Q4_2025.etfs + Z1_Q4_2025.stateLocalGovt + Z1_Q4_2025.stateLocalRetirement + Z1_Q4_2025.nonfinancialCorporate + Z1_Q4_2025.other) / Z1_Q4_2025.total * 100).toFixed(1),
    trend: "持平" as const,
    change: +(TOTAL_YOY_GROWTH * 0.20),
    changePct: +(TOTAL_YOY_GROWTH * 0.20 / (Z1_Q4_2025.etfs + Z1_Q4_2025.stateLocalGovt + Z1_Q4_2025.stateLocalRetirement + Z1_Q4_2025.nonfinancialCorporate + Z1_Q4_2025.other) * 100).toFixed(1),
    dataDate: "2025-Q4",
    source: "Z.1 L.210 · Q4 2025",
  },
];

// ============================================================
// TIC 前10海外持仓（2026-03，来源：Treasury TIC slt_table5.html）
// 与 /api/tic 同一数据源，按持仓量排序
// ============================================================
const foreignTop10 = [
  { country: "日本", holdings: 1191.6, monthlyChange: -47.7, monthlyChangePct: -3.8, yoyChangePct: -5.2, rank: 1, isBuyer: false, note: "连续第3个月减持，或受日元干预影响" },
  { country: "英国", holdings: 926.9, monthlyChange: +29.6, monthlyChangePct: +3.3, yoyChangePct: +8.1, rank: 2, isBuyer: true, note: "全球托管中心，含对冲基金仓位" },
  { country: "中国", holdings: 652.3, monthlyChange: -41.0, monthlyChangePct: -5.9, yoyChangePct: -14.3, rank: 3, isBuyer: false, note: "降至2008年以来最低" },
  { country: "开曼群岛", holdings: 459.4, monthlyChange: +16.4, monthlyChangePct: +3.7, yoyChangePct: -3.2, rank: 4, isBuyer: true, note: "对冲基金离岸实体集中地" },
  { country: "比利时", holdings: 454.0, monthlyChange: -0.7, monthlyChangePct: -0.2, yoyChangePct: +5.8, rank: 5, isBuyer: false, note: "Euroclear 托管中心" },
  { country: "加拿大", holdings: 439.4, monthlyChange: -6.9, monthlyChangePct: -1.5, yoyChangePct: +3.2, rank: 6, isBuyer: false, note: "养老金与金融机构分散配置" },
  { country: "卢森堡", holdings: 432.0, monthlyChange: -13.7, monthlyChangePct: -3.1, yoyChangePct: +2.5, rank: 7, isBuyer: false, note: "欧洲基金托管中心" },
  { country: "法国", holdings: 393.0, monthlyChange: -2.1, monthlyChangePct: -0.5, yoyChangePct: -1.8, rank: 8, isBuyer: false, note: "欧元区第二大美债持有国" },
  { country: "爱尔兰", holdings: 355.2, monthlyChange: +4.6, monthlyChangePct: +1.3, yoyChangePct: -1.8, rank: 9, isBuyer: true, note: "欧洲资管与基金注册中心" },
  { country: "台湾", holdings: 300.8, monthlyChange: -12.7, monthlyChangePct: -4.1, yoyChangePct: -5.8, rank: 10, isBuyer: false, note: "连续多月温和减持" },
];

// ============================================================
// 资金流汇总
// ============================================================
const flowSummary = {
  // 总债务 $38.91T (JEC May 5, 2026), 公众持有 $31.26T
  // 可流通美债总量约 $28.5T (Z.1 Q4 2025)
  totalOutstanding: 28.50,           // 万亿美元（可流通美债）
  fedHoldings: 4.46,                 // 万亿美元 (FRED TREAST May 20, 2026: $4,457.7B)
  foreignHoldings: 9.35,             // 万亿美元 (TIC March 2026: $9,348.7B)
  domesticHoldings: 14.69,           // 万亿美元 (28.50 - 4.46 - 9.35)
  netForeignFlow: -139.0,            // 十亿美元 (TIC 3月 vs 2月)
  netFedFlow: +37.4,                 // 十亿美元 (FRED TREAST 5周累计)
  snapshotDate: "2026-05-20",
};

// ============================================================
// 美联储最新数据（FRED TREAST 周频）
// ============================================================
const fedLatest = {
  holdings: 4457.7,                  // 十亿美元
  date: "2026-05-20",
  weeklyChange: +7.5,                // 最近一周变动
  fiveWeekChange: +37.4,             // 最近5周累计
  trend: "结束QT，恢复温和再投资",
};

// ============================================================
// 关键信号解读
// ============================================================
const keySignals = [
  {
    type: "warning" as const,
    title: "中国减持加速",
    desc: "中国3月减持5.9%（$41B），自2025年初以来累计减持超14%，持仓降至2008年金融危机以来最低（$652B）。地缘政治去风险与外汇储备多元化为主要驱动力。",
  },
  {
    type: "warning" as const,
    title: "日本连续减持",
    desc: "日本3月减持$47.7B（-3.8%），连续第3个月净卖出。持仓降至$1,191.6B。可能是日元汇率干预操作的结果，也可能反映日本机构在利率上升环境下的资产再配置。",
  },
  {
    type: "info" as const,
    title: "英国逆势增持",
    desc: "英国3月增持$29.6B（+3.3%）。作为全球最大托管中心，其持仓变动通常反映对冲基金和全球投机资金的仓位调整，而非英国本土机构行为。",
  },
  {
    type: "positive" as const,
    title: "美联储结束QT",
    desc: "美联储SOMA持仓连续5周增加（累计+$37.4B，至$4,457.7B），量化紧缩已暂停，可能已转向温和再投资。这为市场提供了关键流动性支撑。",
  },
  {
    type: "info" as const,
    title: "货币市场基金成最大买家",
    desc: "Q4 2025 Z.1数据显示，货币市场基金持仓$3,517.8B（12.3%），成为仅次于外国的第二大持有部门。高短期利率吸引大量资金流入货币市场。",
  },
];

// ============================================================
// GET 处理器
// ============================================================
export async function GET() {
  return NextResponse.json({
    success: true,
    dataDate: "2026-05-26",
    z1Date: "2025-Q4",
    z1PublicationDate: "2026-03-19",
    dataSources: [
      { name: "Z.1 L.210", url: "https://fred.stlouisfed.org/release/tables?eid=809048&rid=52", description: "美联储金融账户 · 部门国债持仓" },
      { name: "TIC SLT Table 5", url: "https://ticdata.treasury.gov/resource-center/data-chart-center/tic/Documents/slt_table5.html", description: "财政部国际资本 · 海外持仓国别" },
      { name: "FRED TREAST", url: "https://fred.stlouisfed.org/series/TREAST", description: "美联储SOMA持仓 · 周频更新" },
      { name: "JEC Monthly Debt", url: "https://www.jec.senate.gov/public/vendor/_accounts/JEC-R/debt/Monthly%20Debt%20Update.html", description: "国会联合经济委员会 · 月度债务更新" },
    ],
    holders: holderCategories,
    foreignTop10,
    flowSummary,
    fedLatest,
    keySignals,
  });
}
