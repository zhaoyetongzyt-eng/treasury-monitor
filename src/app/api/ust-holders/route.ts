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
// Z.1 L.210 Q4 2024 部门持仓数据（来源：Fed, 2025-03-13 发布）
// 单位：十亿美元 (Billions USD) · 市值计价
// ============================================================
const Z1_Q4_2025 = {
  total: 28497.9,
  household: 2944.6,          // Household sector & NPISH
  nonfinancialCorporate: 135.7,
  stateLocalGovt: 1635.6,     // State and local governments
  monetaryAuthority: 3859.2,  // Federal Reserve SOMA (市值)
  depositoryInstitutions: 1744.8,
  creditUnions: 67.1,
  propertyCasualtyIns: 432.1,
  lifeInsurance: 207.3,
  privatePension: 605.5,
  stateLocalRetirement: 529.9,
  moneyMarketFunds: 3517.8,
  mutualFunds: 1675.1,
  etfs: 706.8,
  restOfWorld: 9224.4,        // Foreign holders (official + private)
  other: 246.0,               // Closed-end funds, brokers, holding co, GSEs, ABS, etc.
} as const;

const Z1_Q4_2024 = {
  total: 26025.4,
  household: 2626.3,          // Line 5: Household sector & NPISH
  nonfinancialCorporate: 114.0,
  stateLocalGovt: 1572.3,
  monetaryAuthority: 3819.9,  // Line 9: Monetary authority (Fed SOMA)
  depositoryInstitutions: 1536.8,
  creditUnions: 62.8,
  propertyCasualtyIns: 447.0,
  lifeInsurance: 186.0,
  privatePension: 440.1,
  stateLocalRetirement: 503.9,
  moneyMarketFunds: 2994.9,
  mutualFunds: 1503.7,        // Line 32: Mutual funds
  etfs: 554.6,
  restOfWorld: 8558.4,        // Line 42: Rest of the world
  other: 1104.0,              // Not used individually — "其他" computed as residual below
} as const;

// ============================================================
// 构建持有者分类（Z.1 Q4 2025 vs Q4 2024 持仓水平变动）
// change = Q4 2025 level - Q4 2024 level (单位: 十亿美元，期末余额，非季调)
// "其他" = L.210 Total assets − 七类合计（残差项）
// 注意：Z.1 市值计价，与 FRED TREAST(面值)/TIC(面值) 口径不同
// ============================================================
const holderCategories = (() => {
  function calc(f25: number, f24: number) {
    const change = +(f25 - f24).toFixed(1);
    const trend: "增持" | "减持" | "持平" = change > 5 ? "增持" : change < -5 ? "减持" : "持平";
    return {
      holdings: f25,
      share: +(f25 / Z1_Q4_2025.total * 100).toFixed(1),
      trend,
      change,
      changePct: +((change / f24) * 100).toFixed(1),
    };
  }

  const foreign = calc(Z1_Q4_2025.restOfWorld, Z1_Q4_2024.restOfWorld);
  const fed = calc(Z1_Q4_2025.monetaryAuthority, Z1_Q4_2024.monetaryAuthority);
  const mf = calc(Z1_Q4_2025.mutualFunds, Z1_Q4_2024.mutualFunds);
  
  const banks25 = Z1_Q4_2025.depositoryInstitutions + Z1_Q4_2025.creditUnions;
  const banks24 = Z1_Q4_2024.depositoryInstitutions + Z1_Q4_2024.creditUnions;
  const banks = calc(banks25, banks24);
  
  const pi25 = Z1_Q4_2025.privatePension + Z1_Q4_2025.lifeInsurance + Z1_Q4_2025.propertyCasualtyIns;
  const pi24 = Z1_Q4_2024.privatePension + Z1_Q4_2024.lifeInsurance + Z1_Q4_2024.propertyCasualtyIns;
  const pi = calc(pi25, pi24);
  
  const hh = calc(Z1_Q4_2025.household, Z1_Q4_2024.household);
  const mmf = calc(Z1_Q4_2025.moneyMarketFunds, Z1_Q4_2024.moneyMarketFunds);

  // "其他" = Total − 七类合计（残差项）
  const sum7_25 = foreign.holdings + fed.holdings + mf.holdings + banks25 + pi25 + hh.holdings + mmf.holdings;
  const other25 = Z1_Q4_2025.total - sum7_25;
  const other24 = Z1_Q4_2024.total - (Z1_Q4_2024.restOfWorld + Z1_Q4_2024.monetaryAuthority + Z1_Q4_2024.mutualFunds + banks24 + pi24 + Z1_Q4_2024.household + Z1_Q4_2024.moneyMarketFunds);
  const other = calc(other25, other24);

  return [
    {
      category: "外国部门 / Rest of world",
      ...foreign,
      dataDate: "2025-Q4",
      source: "Z.1 L.210 Line 42 · Q4 2025 vs Q4 2024 · 市值",
    },
    {
      category: "美联储 / Monetary authority",
      ...fed,
      dataDate: "2025-Q4",
      source: "Z.1 L.210 Line 9 · Q4 2025 vs Q4 2024 · 市值 (FRED TREAST 面值: 2026-05-20 = $4,457.7B)",
    },
    {
      category: "共同基金",
      ...mf,
      dataDate: "2025-Q4",
      source: "Z.1 L.210 Line 32 · Q4 2025 vs Q4 2024 · 市值",
    },
    {
      category: "银行机构*",
      ...banks,
      dataDate: "2025-Q4",
      source: "Z.1 L.210 · Q4 2025 vs Q4 2024 · U.S.-chartered depository institutions (Line 12) + Credit unions (Line 15)",
    },
    {
      category: "私人养老金与保险**",
      ...pi,
      dataDate: "2025-Q4",
      source: "Z.1 L.210 · Q4 2025 vs Q4 2024 · Property-casualty insurance (Line 16) + Life insurance (Line 19) + Private pension funds (Line 22)",
    },
    {
      category: "家庭部门",
      ...hh,
      dataDate: "2025-Q4",
      source: "Z.1 L.210 Line 5 · Q4 2025 vs Q4 2024 · Household sector & NPISH",
    },
    {
      category: "货币市场基金",
      ...mmf,
      dataDate: "2025-Q4",
      source: "Z.1 L.210 Line 29 · Q4 2025 vs Q4 2024 · 市值",
    },
    {
      category: "其他（残差项）",
      ...other,
      dataDate: "2025-Q4",
      source: "Z.1 L.210 · Total assets − 上述七类合计 · 含ETF/州地方/非金融企业/经纪商/GSE等",
    },
  ];
})();

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
// Z.1 L.210 Q3 2025 部门持仓数据（用于3M季度环比）
// 来源：FRED Z.1 2025-Q3 release, 2025-12-11 发布
// 单位：十亿美元 (Billions USD) · 市值计价
// ============================================================
const Z1_Q3_2025 = {
  total: 28151.2,
  household: 2908.7,
  nonfinancialCorporate: 128.3,
  stateLocalGovt: 1612.4,
  monetaryAuthority: 3825.0,       // Fed SOMA Q3 2025 (市值)
  depositoryInstitutions: 1692.1,
  creditUnions: 64.5,
  propertyCasualtyIns: 439.8,
  lifeInsurance: 201.5,
  privatePension: 582.3,
  stateLocalRetirement: 521.0,
  moneyMarketFunds: 3445.2,
  mutualFunds: 1610.8,
  etfs: 678.4,
  restOfWorld: 9058.6,
  other: 2382.6,
} as const;

// ============================================================
// 资金流汇总（多源拼合，口径标注清晰）
// ============================================================
const flowSummary = {
  // 可流通美债约 $28.5T (Z.1 Q4 2025 所有部门持有合计 ≈ $28.5T)
  totalOutstanding: 28.50,           // 万亿美元
  totalOutstandingSource: "Z.1 L.210 Q4 2025 · Treasury MSPD 可流通口径",
  
  // 市场自由流通量 = 总存量 − 美联储SOMA (面值口径)
  marketFloat: 24.04,                // 万亿美元 (28.50 - 4.46)
  marketFloatSource: "估算 (total outstanding − Fed SOMA · FRED TREAST 面值)",
  
  fedHoldings: 4.46,                 // 万亿美元 (FRED TREAST May 20, 2026: $4,457.7B 面值)
  fedHoldingsSource: "FRED TREAST · 2026-05-20 · 面值",
  
  foreignHoldings: 9.35,             // 万亿美元 (TIC March 2026: $9,348.7B)
  foreignHoldingsSource: "TIC SLT Table 5 · 2026-03 · 期末持仓",
  
  domesticHoldings: 14.69,           // 万亿美元 (28.50 - 4.46 - 9.35, 估算残差项)
  domesticHoldingsSource: "估算 (total − foreign − fed)",
  
  netForeignFlow: -138.4,            // 十亿美元 (TIC 3月 9348.7B vs 2月 9487.1B = -138.4B)
  netForeignFlowSource: "TIC SLT Table 5 · 2026-03 vs 2026-02 · 持仓月变动",
  
  netFedFlow: +37.4,                 // 十亿美元 (FRED TREAST 5周: 4/22→5/20 +$37.4B)
  netFedFlowSource: "FRED TREAST · 2026-04-22→2026-05-20 · 5周累计",
  
  snapshotDate: "2026-05-20",
};

// ============================================================
// 美联储最新数据（FRED TREAST 周频 · 面值）
// ============================================================
const fedLatest = {
  holdings: 4457.7,                  // 十亿美元 (面值)
  date: "2026-05-20",
  weeklyChange: +7.5,                // 最近一周变动
  fiveWeekChange: +37.4,             // 最近5周累计
  trend: "结束QT，滚续到期国债本金，并进行储备管理购买",
};

// ============================================================
// 边际流向数据（多时间维度：1M / 3M / 12M）
// 数据源：TIC Table 5 (月频·面值) / FRED TREAST (周频·面值) / Z.1 L.210 (季频·市值)
// 注意：不同数据源口径不同（面值 vs 市值），不可直接横向对比
// ============================================================

function buildMarginalFlows() {
  // --- 辅助：Z.1 Q4 2025 vs Q3 2025 季度环比变动 ---
  function calcQoQ(f25q4: number, f25q3: number) {
    const change = +(f25q4 - f25q3).toFixed(1);
    return change;
  }

  // --- 1M 数据（最新月度：TIC 2026-03 vs 2026-02 / FRED 近5周） ---
  const flows1M = [
    { category: "外国部门 (TIC 月频)", change: -138.4, isBuyer: false, source: "TIC SLT Table 5 · 2026-03 vs 2026-02 · 持仓月变动 · 面值" },
    { category: "美联储 SOMA (FRED 周频)", change: +37.4, isBuyer: true, source: "FRED TREAST · 2026-04-22→2026-05-20 · 5周累计 · 面值" },
  ];

  // --- 3M 数据（最新季度环比：Z.1 Q4 2025 vs Q3 2025） ---
  const flows3M = [
    { category: "外国部门 (Z.1 季频)", change: calcQoQ(Z1_Q4_2025.restOfWorld, Z1_Q3_2025.restOfWorld), isBuyer: true, source: "Z.1 L.210 · Q4 2025 vs Q3 2025 · 市值" },
    { category: "美联储 (Z.1 季频)", change: calcQoQ(Z1_Q4_2025.monetaryAuthority, Z1_Q3_2025.monetaryAuthority), isBuyer: true, source: "Z.1 L.210 · Q4 2025 vs Q3 2025 · 市值" },
    { category: "货币市场基金", change: calcQoQ(Z1_Q4_2025.moneyMarketFunds, Z1_Q3_2025.moneyMarketFunds), isBuyer: true, source: "Z.1 L.210 · Q4 2025 vs Q3 2025 · 市值" },
    { category: "共同基金", change: calcQoQ(Z1_Q4_2025.mutualFunds, Z1_Q3_2025.mutualFunds), isBuyer: true, source: "Z.1 L.210 · Q4 2025 vs Q3 2025 · 市值" },
    { category: "银行机构*", change: calcQoQ(Z1_Q4_2025.depositoryInstitutions + Z1_Q4_2025.creditUnions, Z1_Q3_2025.depositoryInstitutions + Z1_Q3_2025.creditUnions), isBuyer: true, source: "Z.1 L.210 · Q4 2025 vs Q3 2025 · 市值" },
    { category: "私人养老金与保险**", change: calcQoQ(Z1_Q4_2025.privatePension + Z1_Q4_2025.lifeInsurance + Z1_Q4_2025.propertyCasualtyIns, Z1_Q3_2025.privatePension + Z1_Q3_2025.lifeInsurance + Z1_Q3_2025.propertyCasualtyIns), isBuyer: false, source: "Z.1 L.210 · Q4 2025 vs Q3 2025 · 市值" },
    { category: "家庭与非营利部门", change: calcQoQ(Z1_Q4_2025.household, Z1_Q3_2025.household), isBuyer: true, source: "Z.1 L.210 · Q4 2025 vs Q3 2025 · 市值" },
    { category: "其他（残差项）", change: +(Z1_Q4_2025.total - Z1_Q3_2025.total - (calcQoQ(Z1_Q4_2025.restOfWorld, Z1_Q3_2025.restOfWorld) + calcQoQ(Z1_Q4_2025.monetaryAuthority, Z1_Q3_2025.monetaryAuthority) + calcQoQ(Z1_Q4_2025.moneyMarketFunds, Z1_Q3_2025.moneyMarketFunds) + calcQoQ(Z1_Q4_2025.mutualFunds, Z1_Q3_2025.mutualFunds) + calcQoQ(Z1_Q4_2025.depositoryInstitutions + Z1_Q4_2025.creditUnions, Z1_Q3_2025.depositoryInstitutions + Z1_Q3_2025.creditUnions) + calcQoQ(Z1_Q4_2025.privatePension + Z1_Q4_2025.lifeInsurance + Z1_Q4_2025.propertyCasualtyIns, Z1_Q3_2025.privatePension + Z1_Q3_2025.lifeInsurance + Z1_Q3_2025.propertyCasualtyIns) + calcQoQ(Z1_Q4_2025.household, Z1_Q3_2025.household))).toFixed(1), isBuyer: false, source: "Z.1 L.210 · 残差项 · Q4 2025 vs Q3 2025" },
  ];

  // --- 12M 数据（年度同比：Z.1 Q4 2025 vs Q4 2024） ---
  const flows12M = [
    { category: "外国部门 (Z.1 年度)", change: +(Z1_Q4_2025.restOfWorld - Z1_Q4_2024.restOfWorld).toFixed(1), isBuyer: true, source: "Z.1 L.210 · Q4 2025 vs Q4 2024 · 市值" },
    { category: "美联储 (Z.1 年度)", change: +(Z1_Q4_2025.monetaryAuthority - Z1_Q4_2024.monetaryAuthority).toFixed(1), isBuyer: true, source: "Z.1 L.210 · Q4 2025 vs Q4 2024 · 市值" },
    { category: "货币市场基金", change: +(Z1_Q4_2025.moneyMarketFunds - Z1_Q4_2024.moneyMarketFunds).toFixed(1), isBuyer: true, source: "Z.1 L.210 · Q4 2025 vs Q4 2024 · 市值" },
    { category: "共同基金", change: +(Z1_Q4_2025.mutualFunds - Z1_Q4_2024.mutualFunds).toFixed(1), isBuyer: true, source: "Z.1 L.210 · Q4 2025 vs Q4 2024 · 市值" },
    { category: "银行机构*", change: +(Z1_Q4_2025.depositoryInstitutions + Z1_Q4_2025.creditUnions - Z1_Q4_2024.depositoryInstitutions - Z1_Q4_2024.creditUnions).toFixed(1), isBuyer: true, source: "Z.1 L.210 · Q4 2025 vs Q4 2024 · 市值" },
    { category: "私人养老金与保险**", change: +(Z1_Q4_2025.privatePension + Z1_Q4_2025.lifeInsurance + Z1_Q4_2025.propertyCasualtyIns - Z1_Q4_2024.privatePension - Z1_Q4_2024.lifeInsurance - Z1_Q4_2024.propertyCasualtyIns).toFixed(1), isBuyer: true, source: "Z.1 L.210 · Q4 2025 vs Q4 2024 · 市值" },
    { category: "家庭与非营利部门", change: +(Z1_Q4_2025.household - Z1_Q4_2024.household).toFixed(1), isBuyer: true, source: "Z.1 L.210 · Q4 2025 vs Q4 2024 · 市值" },
    { category: "其他（残差项）", change: +(Z1_Q4_2025.total - Z1_Q4_2024.total - ((Z1_Q4_2025.restOfWorld - Z1_Q4_2024.restOfWorld) + (Z1_Q4_2025.monetaryAuthority - Z1_Q4_2024.monetaryAuthority) + (Z1_Q4_2025.moneyMarketFunds - Z1_Q4_2024.moneyMarketFunds) + (Z1_Q4_2025.mutualFunds - Z1_Q4_2024.mutualFunds) + (Z1_Q4_2025.depositoryInstitutions + Z1_Q4_2025.creditUnions - Z1_Q4_2024.depositoryInstitutions - Z1_Q4_2024.creditUnions) + (Z1_Q4_2025.privatePension + Z1_Q4_2025.lifeInsurance + Z1_Q4_2025.propertyCasualtyIns - Z1_Q4_2024.privatePension - Z1_Q4_2024.lifeInsurance - Z1_Q4_2024.propertyCasualtyIns) + (Z1_Q4_2025.household - Z1_Q4_2024.household))).toFixed(1), isBuyer: false, source: "Z.1 L.210 · 残差项 · Q4 2025 vs Q4 2024" },
  ];

  // 根据 change 正负修正 isBuyer
  function fixBuyer(items: typeof flows1M) {
    return items.map(item => ({ ...item, isBuyer: item.change >= 0 }));
  }

  return {
    "1M": { period: "1M", dataDate: "2026-03", flows: fixBuyer(flows1M) },
    "3M": { period: "3M", dataDate: "2025-Q4", flows: fixBuyer(flows3M) },
    "12M": { period: "12M", dataDate: "2025-Q4", flows: fixBuyer(flows12M) },
  };
}

const marginalFlows = buildMarginalFlows();
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
    desc: "FRED TREAST显示美联储SOMA持仓连续5周增加（累计+$37.4B/374亿美元，至$4,457.7B），量化紧缩已结束，转为滚续到期国债本金并进行储备管理购买。这是2025年以来的重要政策转向信号。",
  },
  {
    type: "info" as const,
    title: "货币市场基金持续增持",
    desc: "Z.1 Q4 2025数据显示，货币市场基金持仓$3,517.8B（12.3%），全年持仓水平增加$522.9B，为第二大增持部门。高短期利率持续吸引资金流入，但增持速度较2024年有所放缓。",
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
    marginalFlows,
    keySignals,
  });
}
