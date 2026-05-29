import { NextResponse } from "next/server";

export const revalidate = 3600; // 每小时检查 FRED 最新数据

// ============================================================
// GET /api/uk-metrics
// 英国视角：Gilt 高息安全垫与价格重定价机会
//
// 数据源：
//   - FRED API: BoE Bank Rate (BOERUKM), UK 10Y Gilt (IRLTLT01GBM156N),
//     Germany 10Y Bund (IRLTLT01DEM156N), USD/GBP (DEXUSUK),
//     UK CPI (CPALTT01GBM659N), UK Unemployment (UNRTUKA), UK GDP (GBRGDPQDSNAQ)
//
// 策略：实时拉取 FRED，失败时降级为内置 fallback 数据。
//      FRED API Key 需在 .env.local 中配置 FRED_API_KEY。
//      2Y/5Y Gilt 在 FRED 上缺少月频系列，使用内置 benchmark + 外部参考链接。
// ============================================================

// ============================================================
// FRED Series IDs
// ============================================================
const FRED_SERIES = {
  bankRate: "BOERUKM",             // BoE Official Bank Rate (月频)
  gilt10Y: "IRLTLT01GBM156N",      // UK 10Y Gilt Yield (月频, OECD)
  bund10Y: "IRLTLT01DEM156N",      // Germany 10Y Bund Yield (月频, OECD)
  gbpUsd: "DEXUSUK",               // USD/GBP 即期汇率 (日频)
  cpi: "CPALTT01GBM659N",          // UK CPI (月频, OECD)
  unemployment: "UNRTUKA",         // UK 失业率 (月频, OECD)
  gdp: "GBRGDPQDSNAQ",             // UK GDP 季环比年化 (季频, OECD)
  ecbRate: "ECBDFR",               // ECB Deposit Facility Rate (日频)
} as const;

// 需要拉取历史时序的 series（用于折线图）
const HISTORY_SERIES = [
  FRED_SERIES.cpi,
  FRED_SERIES.bankRate,
  FRED_SERIES.gilt10Y,
  FRED_SERIES.bund10Y,
  FRED_SERIES.ecbRate,
] as const;

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";

// ============================================================
// Built-in Benchmark（2026-05-29 手动验证）
// 2Y/5Y Gilt 无法从 FRED 获取，使用 Trading Economics / worldgovernmentbonds.com 参考值
// ============================================================
const BENCHMARK_GILT_2Y = 4.31;
const BENCHMARK_GILT_5Y = 4.41;

// ============================================================
// Fallback 数据
// ============================================================
const FALLBACK_DATA = {
  bankRate: 3.75,
  cpi: 3.2,
  gilt10Y: 4.53,
  bund10Y: 3.02,
  gbpUsd: 1.3375,
  unemployment: 5.2,
  gdpGrowth: 0.6,
};

// ============================================================
// FRED API 辅助函数
// ============================================================

function getFredApiKey(): string | null {
  return process.env.FRED_API_KEY || null;
}

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

async function fetchAllFredData(apiKey: string) {
  const [bankRate, gilt10Y, bund10Y, gbpUsd, cpi, unemployment, gdp, ecbRate] =
    await Promise.all([
      fetchFredLatest(FRED_SERIES.bankRate, apiKey),
      fetchFredLatest(FRED_SERIES.gilt10Y, apiKey),
      fetchFredLatest(FRED_SERIES.bund10Y, apiKey),
      fetchFredLatest(FRED_SERIES.gbpUsd, apiKey),
      fetchFredLatest(FRED_SERIES.cpi, apiKey),
      fetchFredLatest(FRED_SERIES.unemployment, apiKey),
      fetchFredLatest(FRED_SERIES.gdp, apiKey),
      fetchFredLatest(FRED_SERIES.ecbRate, apiKey),
    ]);

  return { bankRate, gilt10Y, bund10Y, gbpUsd, cpi, unemployment, gdp, ecbRate };
}

// ============================================================
// 历史时序拉取（用于折线图，过去 24 个观测值）
// ============================================================

async function fetchFredHistory(
  seriesId: string,
  apiKey: string
): Promise<{ date: string; value: number }[]> {
  try {
    const url = `${FRED_BASE}?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=24`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "treasury-monitor/1.0" },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const observations = json?.observations;
    if (!observations || observations.length === 0) return [];
    const result: { date: string; value: number }[] = [];
    for (const obs of observations) {
      const val = parseFloat(obs.value);
      if (!isNaN(val) && obs.value !== ".") {
        result.push({ date: obs.date, value: val });
      }
    }
    // 反转：最早的在前
    return result.reverse();
  } catch {
    return [];
  }
}

// ============================================================
// 套息计算器
// ============================================================

function calcCarry(gilt5Y: number, bankRate: number) {
  const duration = 4.5; // 5Y Gilt 近似久期
  const hedgeCost = bankRate; // GBP 短端对冲成本 ≈ Bank Rate
  const hedgedCarry = Math.round((gilt5Y - hedgeCost) * 100); // bp

  const bullYieldChange = -0.25; // 下行 25bp (收益率%)
  const bearYieldChange = +0.20; // 上行 20bp (收益率%)

  const bullPriceReturn = -(duration * bullYieldChange); // 正收益
  const bearPriceReturn = -(duration * bearYieldChange); // 负收益

  return {
    gilt5YYield: gilt5Y,
    hedgeCost,
    hedgedCarry,
    duration,
    bullCase: {
      yieldChange: -25,
      priceReturn: parseFloat((bullPriceReturn * 100).toFixed(1)),
      totalReturn: parseFloat(((hedgedCarry / 100 + bullPriceReturn) * 100).toFixed(1)),
    },
    bearCase: {
      yieldChange: +20,
      priceReturn: parseFloat((bearPriceReturn * 100).toFixed(1)),
      totalReturn: parseFloat(((hedgedCarry / 100 + bearPriceReturn) * 100).toFixed(1)),
    },
  };
}

// ============================================================
// 基本面因子
// ============================================================

function buildMacroFactors(cpi: number, unemployment: number, gdpGrowth: number) {
  return [
    {
      factor: "通胀粘性",
      indicator: "CPI YoY",
      value: `${cpi}%`,
      meaning: cpi > 2.5 ? "通胀仍高于目标，限制快速降息" : "通胀趋于受控",
      impact: cpi > 2.5 ? ("负面" as const) : ("正面" as const),
    },
    {
      factor: "劳动力市场",
      indicator: "失业率",
      value: `${unemployment}%`,
      meaning: unemployment < 5 ? "劳动力仍偏紧，工资有粘性" : "劳动力市场明显降温",
      impact: unemployment < 5 ? ("负面" as const) : ("正面" as const),
    },
    {
      factor: "增长动能",
      indicator: "GDP 环比",
      value: `${gdpGrowth > 0 ? "+" : ""}${gdpGrowth}%`,
      meaning: gdpGrowth < 0.8 ? "增长偏弱，支持中期降息定价" : "增长稳健，降息空间收窄",
      impact: gdpGrowth < 0.8 ? ("正面" as const) : ("负面" as const),
    },
  ];
}

// ============================================================
// GET Handler
// ============================================================

export async function GET() {
  const apiKey = getFredApiKey();
  let fredStatus: "ok" | "error" = "error";

  let fredResult: Awaited<ReturnType<typeof fetchAllFredData>> | null = null;
  let timeSeries: Record<string, { date: string; value: number }[]> = {};

  if (apiKey) {
    fredResult = await fetchAllFredData(apiKey);
    fredStatus =
      fredResult.gilt10Y || fredResult.bankRate || fredResult.bund10Y
        ? "ok"
        : "error";

    // 拉取历史时序
    const historyResults = await Promise.all(
      HISTORY_SERIES.map((sid) => fetchFredHistory(sid, apiKey))
    );
    timeSeries = {
      cpi: historyResults[0],
      bankRate: historyResults[1],
      gilt10Y: historyResults[2],
      bund10Y: historyResults[3],
      ecbRate: historyResults[4],
    };
  }

  // 取值：FRED 实时 > fallback
  const bankRate = fredResult?.bankRate?.value ?? FALLBACK_DATA.bankRate;
  const cpi = fredResult?.cpi?.value ?? FALLBACK_DATA.cpi;
  const gilt10Y = fredResult?.gilt10Y?.value ?? FALLBACK_DATA.gilt10Y;
  const bund10Y = fredResult?.bund10Y?.value ?? FALLBACK_DATA.bund10Y;
  const gbpUsd = fredResult?.gbpUsd?.value ?? FALLBACK_DATA.gbpUsd;
  const unemployment = fredResult?.unemployment?.value ?? FALLBACK_DATA.unemployment;
  const gdpGrowth = fredResult?.gdp?.value ?? FALLBACK_DATA.gdpGrowth;
  const ecbRate = fredResult?.ecbRate?.value ?? 2.0;

  const gilt2Y = BENCHMARK_GILT_2Y;
  const gilt5Y = BENCHMARK_GILT_5Y;
  const ukDeSpread = Math.round((gilt10Y - bund10Y) * 100); // bp
  const carryCalc = calcCarry(gilt5Y, bankRate);

  const dataDate = fredResult?.gilt10Y?.date ?? new Date().toISOString().slice(0, 10);

  const metrics = [
    {
      label: "BoE Bank Rate",
      value: bankRate.toFixed(2),
      change: 0,
      unit: "%",
      sub: "下次会议：2026年6月18日（预估）",
      trend: "neutral" as const,
    },
    {
      label: "UK CPI YoY",
      value: cpi.toFixed(1),
      change: 0,
      unit: "%",
      sub: cpi > 2.5 ? "高于2%目标，降息空间受限" : "通胀趋于受控",
      trend: cpi > 2.5 ? ("up" as const) : ("neutral" as const),
    },
    {
      label: "2Y Gilt",
      value: gilt2Y.toFixed(2),
      change: 0,
      unit: "%",
      sub: `政策利率敏感，BoE定价锚`,
      trend: "up" as const,
    },
    {
      label: "5Y Gilt",
      value: gilt5Y.toFixed(2),
      change: 0,
      unit: "%",
      sub: `核心 carry + repricing 期限`,
      trend: "up" as const,
    },
    {
      label: "10Y Gilt",
      value: gilt10Y.toFixed(2),
      change: 0,
      unit: "%",
      sub: `长端 fiscal & term premium`,
      trend: "up" as const,
    },
    {
      label: "UK-DE 10Y Spread",
      value: ukDeSpread.toString(),
      change: 0,
      unit: "bp",
      sub: `UK ${gilt10Y.toFixed(2)}% vs DE ${bund10Y.toFixed(2)}%`,
      trend: "up" as const,
    },
    {
      label: "GBP/USD",
      value: gbpUsd.toFixed(4),
      change: 0,
      unit: "",
      sub: "汇率对冲成本参考",
      trend: "neutral" as const,
    },
    {
      label: "Hedged Carry (5Y)",
      value: `+${carryCalc.hedgedCarry}`,
      change: 0,
      unit: "bp",
      sub: `${gilt5Y.toFixed(2)}% yield - ${bankRate.toFixed(2)}% hedge ≈ ${carryCalc.hedgedCarry}bp`,
      trend: "up" as const,
    },
  ];

  const macroFactors = buildMacroFactors(cpi, unemployment, gdpGrowth);

  const freshnessStatus: "实时" | "部分实时" | "降级模式" =
    fredStatus === "ok" ? "实时" : "降级模式";

  // Fallback 时序数据（无 FRED 时使用）—— 基于 fallback 值构造简化时序
  const fallbackTimeSeries = {
    cpi: generateFallbackHistory(cpi, "2025-06"),
    bankRate: generateFallbackHistory(bankRate, "2025-06"),
    gilt10Y: generateFallbackHistory(gilt10Y, "2025-06"),
    bund10Y: generateFallbackHistory(bund10Y, "2025-06"),
    ecbRate: generateFallbackHistory(ecbRate, "2025-06"),
  };

  const response = {
    success: true,
    dataDate,
    dataSource: apiKey
      ? "FRED: BOERUKM, IRLTLT01GBM156N, IRLTLT01DEM156N, DEXUSUK, CPALTT01GBM659N, UNRTUKA, GBRGDPQDSNAQ, ECBDFR · 2Y/5Y Gilt 参考 Trading Economics"
      : "FRED 无 API Key — 使用内置 benchmark 数据 · 2Y/5Y Gilt 参考 Trading Economics",
    metrics,
    bankRate,
    cpi,
    gilt2Y,
    gilt5Y,
    gilt10Y,
    bund10Y,
    ukDeSpread,
    gbpUsd,
    unemployment,
    gdpGrowth,
    ecbRate,
    carryCalc,
    macroFactors,
    timeSeries: fredStatus === "ok" ? timeSeries : fallbackTimeSeries,
    updatedAt: new Date().toISOString(),
    freshness: {
      status: freshnessStatus,
      fredStatus,
    },
  };

  return NextResponse.json(response);
}

// ============================================================
// Fallback 历史时序生成器（无 FRED API Key 时）
// ============================================================

function generateFallbackHistory(latest: number, startMonth: string) {
  const result: { date: string; value: number }[] = [];
  const [y, m] = startMonth.split("-").map(Number);
  for (let i = 0; i < 12; i++) {
    let month = m + i;
    let year = y;
    if (month > 12) { month -= 12; year += 1; }
    const dateStr = `${year}-${String(month).padStart(2, "0")}-01`;
    // 轻微波动使 fallback 图表不至于完全平整
    const jitter = (Math.sin(i * 0.8) * 0.15);
    result.push({ date: dateStr, value: parseFloat((latest + jitter).toFixed(2)) });
  }
  return result;
}
