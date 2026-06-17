// ============================================================
// 美债因子看板 · 核心类型定义
// ============================================================

/** 拍卖记录 */
export interface AuctionRecord {
  securityType: string;       // 品种：Bill / Note / Bond / TIPS / FRN
  securityTerm: string;       // 期限：3Y / 10Y / 30Y 等
  offeringAmount: number;     // 发行规模（十亿美元）
  highYield: number;          // 中标利率（%）
  bidToCover: number;         // 投标倍数
  rating: AuctionRating;      // 评级
  auctionDate: string;        // 拍卖日期 ISO 字符串
  issueDate: string;          // 发行日
  maturityDate: string;       // 到期日
  isLatest: boolean;          // 是否为所有品种中最新完成的拍卖
}

export type AuctionRating = "强劲" | "稳健" | "中性" | "偏软" | "中性偏弱" | "疲弱·尾部";

/** CFTC 期货持仓 */
export interface CFTCPosition {
  category: string;           // 杠杆基金 / 资产管理人 / 商业头寸 等
  segment: string;            // 长端(10Y/30Y) / 前端(2Y/5Y)
  netPosition: "净多头" | "净空头" | "中性";
  netContracts: number;       // 净持仓合约数
  remark?: string;            // 备注（如"极值水平"）
}

/** TIC 海外持仓 */
export interface TICHolding {
  country: string;            // 持有国/地区
  amount: number;             // 持仓规模（十亿美元）
  trend: "上升" | "下降" | "持平" | "平稳";
  change: number;             // 变动额（十亿美元）
  isMajor: boolean;           // 是否主要持有国
}

/** 部门杠杆率 */
export interface SectorLeverage {
  sector: "家庭部门" | "非金融企业" | "政府部门" | "私人非金融部门";
  debtToGDP: number;          // 债务/GDP（%）
  yoyChange: number;          // 同比变化（百分点）
  trend: "上升" | "下降" | "持平";
  date: string;               // 数据日期（季度）
}

/** 状态摘要 */
export interface MarketStatus {
  currentState: string;       // 当前市场状态描述
  durationStance: string;     // 久期立场
  curveStance: string;        // 曲线立场
  snapshotDate: string;       // 数据快照日期
}

/** UST 持有者结构 - 实体类别 */
export interface USTHolder {
  category: string;            // 实体类别：外国官方 / 美联储 / 共同基金 / 银行 / 养老金 / 家庭
  holdings: number;            // 持仓规模（十亿美元）
  share: number;               // 占总量的百分比
  trend: "增持" | "减持" | "持平";
  change: number;              // 月度/季度变动（十亿美元）
  changePct: number;           // 变动百分比
  dataDate: string;            // 数据日期
}

/** UST 买卖机构 - 海外持仓明细 */
export interface ForeignHolderDetail {
  country: string;             // 国家/地区
  holdings: number;            // 持仓（十亿美元）
  monthlyChange: number;       // 月度变动（十亿美元）
  monthlyChangePct: number;    // 月度变动百分比
  yoyChangePct: number;        // 同比变动百分比
  rank: number;                // 排名
  isBuyer: boolean;            // 当月是否净买入
  note?: string;               // 备注
}

/** UST 买卖机构 - 汇总 */
export interface USTFlowSummary {
  totalOutstanding: number;    // 美债总存量（万亿美元）
  totalOutstandingSource?: string;
  marketFloat?: number;        // 市场自由流通量（万亿美元）= totalOutstanding - fedHoldings
  marketFloatSource?: string;
  fedHoldings: number;         // 美联储持有（万亿美元）
  fedHoldingsSource?: string;
  foreignHoldings: number;     // 外国持有（万亿美元）
  foreignHoldingsSource?: string;
  domesticHoldings: number;    // 国内私人持有（万亿美元，估算）
  domesticHoldingsSource?: string;
  netForeignFlow: number;      // 外资净流动（十亿美元，正=净买入）
  netForeignFlowSource?: string;
  netFedFlow: number;          // 美联储净购买（十亿美元）
  netFedFlowSource?: string;
  snapshotDate: string;        // 数据快照日期
}

/** 边际流向 - 单个主体 */
export interface MarginalFlowItem {
  category: string;             // 主体名称
  change: number;               // 变动额（十亿美元）
  isBuyer: boolean;             // 增持/减持
  source: string;               // 数据来源标注
  isResidual?: boolean;         // 是否为残差/未单列部门
  residualNote?: string;        // 残差项解释
}

/** 1M 最新边际信号 */
export interface LatestSignal {
  label: string;                // 信号名称
  change: number;               // 变动额（十亿美元）
  frequency: string;            // 数据频率（月频/周频）
  dataDate: string;             // 数据截止
  source: string;               // 数据来源
  note: string;                 // 解释说明
}

/** 边际流向 - 单时间维度数据 */
export interface MarginalFlowData {
  period: string;               // "1M" | "3M" | "12M"
  dataDate: string;             // 数据截止日期
  flows: MarginalFlowItem[];    // 各主体流向（3M/12M 使用）
  signals?: LatestSignal[];     // 最新边际信号（1M 使用）
  residualItem?: MarginalFlowItem; // 残差项（3M 使用，单独展示）
  footnote?: string;            // 维度专属脚注
}

/** 日本视角 - 持仓趋势 */
export interface JapanHoldingsTrend {
  date: string;                // 日期
  holdings: number;            // 持仓（十亿美元）
  change: number;              // 月度变动（十亿美元）
}

/** 日本视角 - 周度资金流（MOF 全部外国证券，不可拆分为美债） */
export interface JapanWeeklyFlow {
  weekStart: string;              // 周开始日期
  netForeignBonds: number;        // 净买入外国中长期+短期债券（十亿日元）
  netForeignStocks: number;       // 净买入外国股票/投资基金份额（十亿日元）
  netForeignLongBonds?: number;   // 净买入外国中长期债券（十亿日元）
  netForeignShortBonds?: number;  // 净买入外国短期债券（十亿日元）
}

/** 日本视角 - 关键指标（组件内使用） */
export interface JapanKeyMetrics {
  usdJpy: number;              // USD/JPY 汇率
  usdJpyChange: number;        // 日变动
  bojPolicyRate: number;       // BOJ 政策利率（%）
  jgb10YYield: number;         // 日本10Y国债收益率（%）
  ustJgbSpread: number;        // 美日10Y利差（bp）
  fxReserves: number;          // 外汇储备（万亿美元）
  dataDate: string;            // 数据日期
}

/** 日本视角 - 关键指标项（UI 展示用） */
export interface JapanMetricItem {
  label: string;
  value: string;
  change: number;
  unit: string;
  sub: string;
}

/** /api/japan-metrics 响应 */
export interface JapanMetricsResponse {
  success: boolean;
  dataDate: string;
  dataSource: string;
  metrics: JapanMetricItem[];
  usdJpy: number;
  usdJpyChange: number;
  bojPolicyRate: number;
  jgb10YYield: number;
  ust10YYield: number;
  ustJgbSpread: number;
  fxReserves: number;
  weeklyFlows: JapanWeeklyFlow[];
  updatedAt: string;
  freshness: {
    status: "实时" | "部分实时" | "降级模式";
    fredStatus: "ok" | "error";
    mofStatus: "ok" | "error" | "not_attempted";
  };
}

/** 收益率曲线摘要 */
export interface YieldSnapshot {
  date: string;
  yield2Y: number;               // 2年期国债收益率
  yield10Y: number;
  yield30Y: number;
  spread2s10s: number | null;    // 10Y - 2Y (百分点)
  spread5s30s: number;           // 30Y - 10Y (百分点)
  change2Y: number | null;       // 日变动（整数bp，基于原始小数差值计算）
  change10Y: number | null;      // 日变动（整数bp，基于原始小数差值计算）
  change30Y: number | null;
  change2s10s: number | null;
  previousDate: string | null;
  // ── Real Yield & Breakeven（来自 FRED TIPS / breakeven）────
  realYield10Y: number | null;       // 10Y TIPS 实际利率 (DFII10)
  breakeven10Y: number | null;       // 10Y 盈亏平衡通胀 (DGS10 - DFII10)
  breakeven5Y: number | null;        // 5Y 盈亏平衡通胀 (T5YIFR)
  changeReal10Y: number | null;      // bp
  changeBE10Y: number | null;        // bp
  changeBE5Y: number | null;         // bp
}

/** 资金面压力快照（Funding Stress） */
export interface FundingStressSnapshot {
  date: string | null;
  sofr: number | null;           // Secured Overnight Financing Rate (%)
  tgcr: number | null;           // Tri-Party General Collateral Rate (%)
  effr: number | null;           // Effective Federal Funds Rate (%)
  onRrpAmount: number | null;    // ON RRP Usage ($ Billions)
  onRrpRate: number | null;      // ON RRP offering rate (%)
  iorbRate: number | null;       // Interest on Reserve Balances (%)
  srfAmount: number | null;      // SRF Usage ($ Billions)
  srfRate: number | null;        // SRF stop-out rate (%)
  sofrMinusEffr: number | null;  // bp
  sofrMinusIorb: number | null;  // bp
  sofrMinusOnRrp: number | null; // bp
  changeSofr: number | null;     // bp
  changeTgcr: number | null;     // bp
  changeOnRrp: number | null;    // $ Billions
  changeSrf: number | null;      // $ Billions
  signal: "funding_stable" | "mild_pressure" | "funding_stress" | "liquidity_declining";
  signalLabel: string;
  signalColor: "emerald" | "amber" | "red";
  onRrpWarning: string | null;
  sofriorbWarning: string | null;
  sofrOnrrpWarning: string | null;
  dataSource: string;
}

/** 宏观基本面快照 */
export interface FundamentalsSnapshot {
  success: boolean;
  date: string | null;
  // GDP
  gdpQoQ: number | null;         // Real GDP QoQ SAAR (%)
  gdpDate: string | null;
  // Core PCE
  corePceYoY: number | null;     // Core PCE YoY (%)
  corePceDate: string | null;
  // CPI
  cpiYoY: number | null;         // CPI YoY (%)
  cpiDate: string | null;
  // 就业
  unemployment: number | null;   // U-3 Unemployment Rate (%)
  nfpMoM: number | null;         // Nonfarm Payrolls MoM change (thousands)
  employmentDate: string | null;
  // 财政
  deficitPctGDP: number | null;  // Federal Deficit as % of GDP
  deficitDate: string | null;
  updatedAt: string;
  dataSource: string;
}

/** 即将拍卖公告（已公布但尚未完成拍卖） */
export interface UpcomingAuction {
  securityType: string;       // 品种：Bill / Note / Bond
  securityTerm: string;       // 期限：4周国库券 / 2年期国债 等
  offeringAmount: number;     // 公告发行规模（十亿美元）
  auctionDate: string;        // 计划拍卖日期
  issueDate: string;          // 计划发行日
  maturityDate: string;       // 到期日
}

/** 拍卖发行概要 */
export interface AuctionIssuance {
  totalAuctioned: number;        // 十亿美元
  recordCount: number;
  avgBidToCover: number;
  dataFreshness: string | null;
}

/** 拍卖 API 响应 */
export interface AuctionsResponse {
  success: boolean;
  auctions: AuctionRecord[];           // 已完成拍卖（有结果）
  upcoming: UpcomingAuction[];         // 已公布但未拍卖
  issuance: AuctionIssuance;
  updatedAt: string;
  error?: string;
}

/** UK 视角 - 关键指标项（UI 展示用） */
export interface UKMetricItem {
  label: string;
  value: string;
  change: number;
  unit: string;
  sub: string;
  trend?: "up" | "down" | "neutral";
}

/** UK 视角 - 套息计算器数据 */
export interface UKCarryCalc {
  gilt5YYield: number;
  hedgeCost: number;
  hedgedCarry: number;
  duration: number;
  bullCase: {
    yieldChange: number;
    priceReturn: number;
    totalReturn: number;
  };
  bearCase: {
    yieldChange: number;
    priceReturn: number;
    totalReturn: number;
  };
}

/** UK 视角 - 基本面因子 */
export interface UKMacroFactor {
  factor: string;
  indicator: string;
  value: string;
  meaning: string;
  impact: "正面" | "负面" | "中性";
}

/** UK 视角 - 历史时序数据点 */
export interface UKTimeSeriesPoint {
  date: string;
  value: number;
}

/** /api/uk-metrics 响应 */
export interface UKMetricsResponse {
  success: boolean;
  dataDate: string;
  dataSource: string;
  metrics: UKMetricItem[];
  bankRate: number;
  cpi: number;
  gilt2Y: number;
  gilt5Y: number;
  gilt10Y: number;
  bund10Y: number;
  ukDeSpread: number;
  gbpUsd: number;
  unemployment: number;
  gdpGrowth: number;
  ecbRate: number;
  ust2Y: number;
  ust5Y: number;
  ust10Y: number;
  fedFunds: number;
  carryCalc: UKCarryCalc;
  macroFactors: UKMacroFactor[];
  timeSeries: {
    cpi: UKTimeSeriesPoint[];
    bankRate: UKTimeSeriesPoint[];
    gilt10Y: UKTimeSeriesPoint[];
    bund10Y: UKTimeSeriesPoint[];
    ecbRate: UKTimeSeriesPoint[];
    ust2Y: UKTimeSeriesPoint[];
    ust5Y: UKTimeSeriesPoint[];
    ust10Y: UKTimeSeriesPoint[];
  };
  updatedAt: string;
  freshness: {
    status: "实时" | "部分实时" | "降级模式";
    fredStatus: "ok" | "error";
  };
}

/** 情绪面快照 */
export interface SentimentSnapshot {
  success: boolean;
  date: string | null;
  // 波动率
  vix: number | null;               // VIX (CBOE Volatility Index)
  vixDate: string | null;
  // 信用
  hyOas: number | null;             // HY OAS (%, e.g. 3.40 = 340bp)
  hyOasDate: string | null;
  // 利率
  termPremium10Y: number | null;    // ACM Term Premium 10Y (bp)
  tpDate: string | null;
  // 通胀预期
  fwdBE5Y5Y: number | null;         // 5Y5Y Forward Breakeven (%)
  fwdBEDate: string | null;
  // 衰退信号
  spread10Y3M: number | null;       // 10Y-3M Spread (bp)
  spreadDate: string | null;
  // 美元
  dxyBroad: number | null;          // Broad Dollar Index
  dxyDate: string | null;
  // 美债波动率
  moveIndex: number | null;         // ICE BofA MOVE Index (美债隐含波动率，非FRED数据)
  moveDate: string | null;
  realVol10Y: number | null;        // 10Y Treasury Realized Volatility (bp/yr, 20d annualized)
  realVolDate: string | null;
  updatedAt: string;
  dataSource: string;
}

/** 政策面快照 */
export interface PolicySnapshot {
  success: boolean;
  date: string | null;
  // 利率
  ffTargetUpper: number | null;       // FFR Target Range Upper (%)
  ffTargetLower: number | null;       // FFR Target Range Lower (%)
  ffEffective: number | null;         // Effective FFR (%)
  ffTargetDate: string | null;        // 最近一次调整日期
  iorbRate: number | null;            // IORB Rate (%)
  onRrpRate: number | null;           // ON RRP Award Rate (%)
  // 资产负债表
  fedBalanceSheet: number | null;     // Fed Total Assets ($ Trillion)
  fedBsDate: string | null;
  fedBs4WkAgo: number | null;         // 4周前 Fed Total Assets ($ Trillion)
  qtMonthlyPace: number | null;       // QT Monthly Pace ($ Billion/month, 负值=缩表)
  // 预期
  twoYMinusFFR: number | null;        // 2Y Yield - Effective FFR (bp)
  tenYMinusFFR: number | null;        // 10Y Yield - Effective FFR (bp)
  spread5s30s: number | null;         // 5Y-30Y Spread (bp)
  spread5s30sDate: string | null;
  updatedAt: string;
  dataSource: string;
}

/** 模块配置 */
export interface ModuleConfig {
  id: string;
  number: string;             // 模块编号 01-10
  title: string;
  titleEn: string;
  description: string;
  component: string;          // 组件名称
}
