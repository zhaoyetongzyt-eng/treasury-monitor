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
  weekStart: string;           // 周开始日期
  netForeignBonds: number;     // 净买入外国中长期+短期债券（十亿日元）
  netForeignStocks: number;    // 净买入外国股票/投资基金份额（十亿日元）
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

/** 模块配置 */
export interface ModuleConfig {
  id: string;
  number: string;             // 模块编号 01-10
  title: string;
  titleEn: string;
  description: string;
  component: string;          // 组件名称
}
