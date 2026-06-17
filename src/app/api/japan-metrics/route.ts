import { NextResponse } from "next/server";

export const revalidate = 3600; // 每小时检查 FRED/MOF 最新数据

// ============================================================
// GET /api/japan-metrics
// 日本视角关键指标 + 周度资金流
//
// 数据源：
//   - FRED API: USD/JPY (DEXJPUS), JGB 10Y (IRLTLT01JPM156N),
//     外汇储备 (TRESEGJPM052N), UST 10Y (DGS10)
//   - MOF CSV: 周度跨境证券资金流 (week.csv)
//
// 策略：实时拉取 FRED + 尝试拉取 MOF CSV，
//      失败时降级为内置 fallback 数据。
//      FRED API Key 需在 .env.local 中配置 FRED_API_KEY。
// ============================================================

interface KeyMetricsItem {
  label: string;
  value: string;
  change: number;
  unit: string;
  sub: string;
}

interface JapanMetricsResponse {
  success: boolean;
  dataDate: string;
  dataSource: string;
  metrics: KeyMetricsItem[];
  usdJpy: number;
  usdJpyChange: number;
  bojPolicyRate: number;
  jgb10YYield: number;
  ust10YYield: number;
  ustJgbSpread: number;
  fxReserves: number;
  weeklyFlows: {
    weekStart: string;
    netForeignBonds: number;
    netForeignStocks: number;
    netForeignLongBonds: number;
    netForeignShortBonds: number;
  }[];
  updatedAt: string;
  freshness: {
    status: "实时" | "部分实时" | "降级模式";
    fredStatus: "ok" | "error";
    mofStatus: "ok" | "error" | "not_attempted";
  };
}

// ============================================================
// FRED Series IDs
// ============================================================
const FRED_SERIES = {
  usdJpy: "DEXJPUS",           // USD/JPY 即期汇率（日频）
  jgb10Y: "IRLTLT01JPM156N",   // 日本 10Y 国债收益率（月频，OECD）
  fxReserves: "TRESEGJPM052N", // 日本外汇储备（月频，IMF，百万美元）
  ust10Y: "DGS10",             // 美国 10Y 国债收益率（日频）
} as const;

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";
const MOF_WEEKLY_CSV =
  "https://www.mof.go.jp/policy/international_policy/reference/itn_transactions_in_securities/week.csv";

// ============================================================
// Fallback 数据（2026-05-27 手动验证）
// ============================================================
const FALLBACK_METRICS: KeyMetricsItem[] = [
  {
    label: "USD/JPY",
    value: "159.34",
    change: +0.14,
    unit: "",
    sub: "日元贬值 = 干预风险↑",
  },
  {
    label: "BOJ政策利率",
    value: "0.75",
    change: 0,
    unit: "%",
    sub: "2025年12月加息至0.75%，下次会议6月15-16日",
  },
  {
    label: "日本10Y国债",
    value: "2.70",
    change: 0,
    unit: "%",
    sub: "5月18日一度触及2.8%创29年新高后回落",
  },
  {
    label: "美日10Y利差",
    value: "177",
    change: 0,
    unit: "bp",
    sub: "美国4.47% vs 日本2.70%",
  },
  {
    label: "外汇储备",
    value: "1.26",
    change: 0,
    unit: "万亿美元",
    sub: "干预弹药库规模",
  },
];

const FALLBACK_WEEKLY_FLOWS = [
  { weekStart: "05/03-09", netForeignBonds: 1497, netForeignStocks: -583, netForeignLongBonds: 1644, netForeignShortBonds: -148 },
  { weekStart: "05/10-16", netForeignBonds: 831, netForeignStocks: 41, netForeignLongBonds: 773, netForeignShortBonds: 58 },
  { weekStart: "05/17-23", netForeignBonds: -114, netForeignStocks: -368, netForeignLongBonds: 8, netForeignShortBonds: -122 },
  { weekStart: "05/24-30", netForeignBonds: -172, netForeignStocks: -1068, netForeignLongBonds: -184, netForeignShortBonds: 12 },
  { weekStart: "05/31-06", netForeignBonds: 240, netForeignStocks: -944, netForeignLongBonds: 198, netForeignShortBonds: 42 },
  { weekStart: "06/07-13", netForeignBonds: 0, netForeignStocks: 0, netForeignLongBonds: 0, netForeignShortBonds: 0 },
  { weekStart: "06/14-20", netForeignBonds: 0, netForeignStocks: 0, netForeignLongBonds: 0, netForeignShortBonds: 0 },
  { weekStart: "06/21-27", netForeignBonds: 0, netForeignStocks: 0, netForeignLongBonds: 0, netForeignShortBonds: 0 },
];

// ============================================================
// FRED API 辅助函数
// ============================================================

function getFredApiKey(): string | null {
  return process.env.FRED_API_KEY || null;
}

/**
 * 从 FRED 获取单个 series 的最新观测值
 * 返回 { date, value } 或 null
 */
async function fetchFredLatest(
  seriesId: string,
  apiKey: string
): Promise<{ date: string; value: number } | null> {
  try {
    const url = `${FRED_BASE}?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=2`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "treasury-monitor/1.0" },
    });

    if (!res.ok) return null;

    const json = await res.json();
    const observations = json?.observations;
    if (!observations || observations.length === 0) return null;

    // 取最新一条有效观测
    for (const obs of observations) {
      const val = parseFloat(obs.value);
      if (!isNaN(val) && obs.value !== ".") {
        return { date: obs.date, value: val };
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 批量获取 FRED 数据
 */
async function fetchAllFredData(apiKey: string) {
  const [usdJpy, jgb10Y, fxReserves, ust10Y] = await Promise.all([
    fetchFredLatest(FRED_SERIES.usdJpy, apiKey),
    fetchFredLatest(FRED_SERIES.jgb10Y, apiKey),
    fetchFredLatest(FRED_SERIES.fxReserves, apiKey),
    fetchFredLatest(FRED_SERIES.ust10Y, apiKey),
  ]);

  return { usdJpy, jgb10Y, fxReserves, ust10Y };
}

// ============================================================
// MOF CSV 解析
// ============================================================

/**
 * 从 MOF week.csv 解析最近 N 周的 Portfolio Investment Assets 数据。
 * CSV 结构（2014年起符号：正值=净买入，负值=净卖出）：
 *   左侧: 1. Portfolio Investment Assets
 *     Equity and investment fund shares: Acquisition, Disposition, Net
 *     Long-term debt securities: Acquisition, Disposition, Net
 *     Short-term debt securities: Acquisition, Disposition, Net
 *   右侧: 2. Portfolio Investment Liabilities (不解析)
 *
 * 每行格式: "YYYY.M.D - M.D", stocksAcq, stocksDisp, stocksNet,
 *            bondsLTAcq, bondsLTDisp, bondsLTNet,
 *            bondsSTAcq, bondsSTDisp, bondsSTNet, ...
 */
async function fetchMofWeekly(
  weeks: number = 8
): Promise<{ weekStart: string; netForeignBonds: number; netForeignStocks: number; netForeignLongBonds: number; netForeignShortBonds: number }[] | null> {
  try {
    const res = await fetch(MOF_WEEKLY_CSV, {
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": "treasury-monitor/1.0" },
    });
    if (!res.ok) return null;

    const text = await res.text();
    const lines = text.split("\n").filter((l) => l.trim());

    const result: { weekStart: string; netForeignBonds: number; netForeignStocks: number; netForeignLongBonds: number; netForeignShortBonds: number }[] = [];

    // 找到包含日期格式的行（"YYYY.M.D - M.D"）
    for (const line of lines) {
      // 匹配行首的日期模式: 4位年份.1-2位月份.1-2位日 ~ 1-2位月份.1-2位日
      const dateMatch = line.match(/^"?(\d{4})\.(\d{1,2})\.(\d{1,2})\s*[-~]\s*(\d{1,2})\.(\d{1,2})/);
      if (!dateMatch) continue;

      const [, year, startMonth, startDay, endMonth, endDay] = dateMatch;
      // 格式化为 MM-DD
      const weekStart = `${startMonth.padStart(2, "0")}-${startDay.padStart(2, "0")}`;

      // 按逗号分割，跳过日期列
      const cols = line.replace(/^"[^"]*",?/, "").split(",").map((c) => c.trim().replace(/"/g, ""));

      // Assets 部分结构（每项3列: Acquisition, Disposition, Net）：
      // cols[0-2]: Equity
      // cols[3-5]: Long-term debt
      // cols[6-8]: Short-term debt
      if (cols.length < 9) continue;

      const stocksNet = parseFloat(cols[2]);   // Equity Net
      const bondsLTNet = parseFloat(cols[5]);  // Long-term Debt Net
      const bondsSTNet = parseFloat(cols[8]);  // Short-term Debt Net

      if (isNaN(stocksNet) || isNaN(bondsLTNet) || isNaN(bondsSTNet)) continue;

      // MOF 数据单位是亿日元，转换为十亿日元
      const netForeignBonds = Math.round((bondsLTNet + bondsSTNet) / 10);
      const netForeignStocks = Math.round(stocksNet / 10);
      const netForeignLongBonds = Math.round(bondsLTNet / 10);
      const netForeignShortBonds = Math.round(bondsSTNet / 10);

      result.push({ weekStart, netForeignBonds, netForeignStocks, netForeignLongBonds, netForeignShortBonds });
    }

    if (result.length === 0) return null;

    // 取最近 weeks 条，并反转使最旧在前
    return result.slice(-weeks);
  } catch {
    return null;
  }
}

// ============================================================
// 构建响应
// ============================================================

function buildMetricsFromFred(fred: {
  usdJpy: { date: string; value: number } | null;
  jgb10Y: { date: string; value: number } | null;
  fxReserves: { date: string; value: number } | null;
  ust10Y: { date: string; value: number } | null;
}): {
  metrics: KeyMetricsItem[];
  usdJpy: number;
  usdJpyChange: number;
  bojPolicyRate: number;
  jgb10YYield: number;
  ust10YYield: number;
  ustJgbSpread: number;
  fxReserves: number;
} {
  const usdJpy = fred.usdJpy?.value ?? 159.34;
  const jgb10Y = fred.jgb10Y?.value ?? 2.70;
  const ust10Y = fred.ust10Y?.value ?? 4.47;
  const fxMillions = fred.fxReserves?.value ?? 1257555;
  const fxTrillions = fxMillions / 1_000_000; // 百万美元 → 万亿美元
  const spread = Math.round((ust10Y - jgb10Y) * 100); // bp

  const metrics: KeyMetricsItem[] = [
    {
      label: "USD/JPY",
      value: usdJpy.toFixed(2),
      change: +0.14,
      unit: "",
      sub: "日元贬值 = 干预风险↑",
    },
    {
      label: "BOJ政策利率",
      value: "0.75",
      change: 0,
      unit: "%",
      sub: "2025年12月加息至0.75%，下次会议6月15-16日",
    },
    {
      label: "日本10Y国债",
      value: jgb10Y.toFixed(2),
      change: 0,
      unit: "%",
      sub: jgb10Y >= 2.7 ? "已突破2.7%关口，创多年新高" : "收益率持续攀升",
    },
    {
      label: "美日10Y利差",
      value: spread.toString(),
      change: 0,
      unit: "bp",
      sub: `美国${ust10Y.toFixed(2)}% vs 日本${jgb10Y.toFixed(2)}%`,
    },
    {
      label: "外汇储备",
      value: fxTrillions.toFixed(2),
      change: 0,
      unit: "万亿美元",
      sub: "干预弹药库规模",
    },
  ];

  return {
    metrics,
    usdJpy,
    usdJpyChange: +0.14,
    bojPolicyRate: 0.75,
    jgb10YYield: jgb10Y,
    ust10YYield: ust10Y,
    ustJgbSpread: spread,
    fxReserves: fxTrillions,
  };
}

// ============================================================
// GET Handler
// ============================================================

export async function GET() {
  const apiKey = getFredApiKey();
  let fredStatus: "ok" | "error" = "error";
  let mofStatus: "ok" | "error" | "not_attempted" = "not_attempted";

  let fredResult: Awaited<ReturnType<typeof fetchAllFredData>> | null = null;
  let mofFlows: Awaited<ReturnType<typeof fetchMofWeekly>> | null = null;

  // 并行拉取 FRED + MOF
  if (apiKey) {
    const [fred, mof] = await Promise.all([
      fetchAllFredData(apiKey),
      fetchMofWeekly(8),
    ]);
    fredResult = fred;
    mofFlows = mof;
    fredStatus = fred.usdJpy || fred.jgb10Y || fred.ust10Y ? "ok" : "error";
    mofStatus = mof ? "ok" : "error";
  } else {
    // 无 API key 时仍尝试拉取 MOF（无需认证）
    mofFlows = await fetchMofWeekly(8);
    mofStatus = mofFlows ? "ok" : "error";
  }

  const metricsData = fredResult
    ? buildMetricsFromFred(fredResult)
    : {
        metrics: FALLBACK_METRICS,
        usdJpy: 159.34,
        usdJpyChange: +0.14,
        bojPolicyRate: 0.75,
        jgb10YYield: 2.70,
        ust10YYield: 4.47,
        ustJgbSpread: 177,
        fxReserves: 1.26,
      };

  const weeklyFlows = mofFlows || FALLBACK_WEEKLY_FLOWS;

  // 确定整体新鲜度
  let freshnessStatus: "实时" | "部分实时" | "降级模式" = "降级模式";
  if (fredStatus === "ok" && mofStatus === "ok") {
    freshnessStatus = "实时";
  } else if (fredStatus === "ok" || mofStatus === "ok") {
    freshnessStatus = "部分实时";
  }

  const response: JapanMetricsResponse = {
    success: true,
    dataDate: new Date().toISOString().slice(0, 10),
    dataSource: [
      "FRED: DEXJPUS, IRLTLT01JPM156N, TRESEGJPM052N, DGS10",
      "MOF: 证券交易统计 week.csv",
      apiKey ? "(API 实时)" : "(无 FRED_API_KEY，降级为内置数据)",
    ].join(" · "),
    ...metricsData,
    weeklyFlows,
    updatedAt: new Date().toISOString(),
    freshness: {
      status: freshnessStatus,
      fredStatus,
      mofStatus,
    },
  };

  return NextResponse.json(response);
}
