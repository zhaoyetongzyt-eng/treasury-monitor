import { NextResponse } from "next/server";

// ============================================================
// 宏观经济基本面 API
// 数据源：FRED API（需 key，无 key 时 fallback 为内置最新值）
//
// 指标：
//   - Real GDP QoQ SAAR: A191RL1Q225SBEA
//   - Core PCE YoY: 从 PCEPILFE 月度指数计算
//   - CPI YoY: 从 CPIAUCSL 月度指数计算
//   - Unemployment Rate: UNRATE
//   - Nonfarm Payrolls MoM: 从 PAYEMS 计算
//   - Federal Deficit % GDP: FYFSGDA188S (年度)
// ============================================================

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";

interface FredObs {
  date: string;
  value: string;
}

interface SeriesResult {
  obs: FredObs[];
  error?: boolean;
}

async function fetchFredSeries(
  seriesId: string,
  apiKey: string,
  limit: number,
  sortOrder: "desc" | "asc" = "desc"
): Promise<SeriesResult> {
  const url =
    `${FRED_BASE}?series_id=${seriesId}&api_key=${apiKey}` +
    `&file_type=json&sort_order=${sortOrder}&limit=${limit}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "TreasuryMonitor/1.0" },
    cache: "no-store",
  });
  if (!res.ok) return { obs: [], error: true };
  const json = await res.json();
  return { obs: json?.observations ?? [], error: false };
}

function parseVal(obs: FredObs): number | null {
  const v = parseFloat(obs.value);
  return isNaN(v) ? null : v;
}

export async function GET() {
  const fredApiKey = process.env.FRED_API_KEY || null;

  // ── Fallback：无 API key 时使用的内置最新值（手动更新）──
  // 最后更新: 2026-06-17（用户核对纠正）
  const FALLBACK = {
    gdpQoQ: 1.6,          // Q1 2026: +1.6% SAAR (BEA 二次估计)
    gdpDate: "2026-Q1",
    corePceYoY: 3.3,       // Apr 2026: 3.3% YoY (BEA PCE)
    corePceDate: "2026-04",
    cpiYoY: 4.2,           // May 2026: 4.2% YoY (BLS Headline CPI, 333.979 vs 320.620)
    cpiDate: "2026-05",
    unemployment: 4.3,     // May 2026: 4.3% (BLS)
    nfpMoM: 172,           // May 2026: +172K (BLS)
    employmentDate: "2026-05",
    deficitPctGDP: -5.8,   // FY 2025: -5.77% GDP (FRED FYFSGDA188S)
    deficitDate: "2025-FY",
  };

  if (!fredApiKey) {
    return NextResponse.json({
      success: true,
      date: FALLBACK.gdpDate,
      gdpQoQ: FALLBACK.gdpQoQ,
      gdpDate: FALLBACK.gdpDate,
      corePceYoY: FALLBACK.corePceYoY,
      corePceDate: FALLBACK.corePceDate,
      cpiYoY: FALLBACK.cpiYoY,
      cpiDate: FALLBACK.cpiDate,
      unemployment: FALLBACK.unemployment,
      nfpMoM: FALLBACK.nfpMoM,
      employmentDate: FALLBACK.employmentDate,
      deficitPctGDP: FALLBACK.deficitPctGDP,
      deficitDate: FALLBACK.deficitDate,
      updatedAt: new Date().toISOString(),
      dataSource: "Fallback (无 FRED API Key — 内置值，非实时)",
    });
  }

  try {
    // ── 并行获取所有 FRED 序列 ──────────────────────────
    const [
      gdpData,        // A191RL1Q225SBEA: Real GDP QoQ SAAR (6 obs → 1.5 years)
      pceData,        // PCEPILFE: Core PCE index (14 obs → 14 months for YoY)
      cpiData,        // CPIAUCSL: CPI index (14 obs)
      unrateData,     // UNRATE: Unemployment rate (2 obs → latest + prev)
      nfpData,        // PAYEMS: Nonfarm payrolls (2 obs → latest + prev)
      deficitData,    // FYFSGDA188S: Federal deficit % GDP (1 obs)
    ] = await Promise.all([
      fetchFredSeries("A191RL1Q225SBEA", fredApiKey!, 6),
      fetchFredSeries("PCEPILFE", fredApiKey!, 14),
      fetchFredSeries("CPIAUCSL", fredApiKey!, 14),
      fetchFredSeries("UNRATE", fredApiKey!, 2),
      fetchFredSeries("PAYEMS", fredApiKey!, 2),
      fetchFredSeries("FYFSGDA188S", fredApiKey!, 1),
    ]);

    // ── GDP: 取最新一季 ─────────────────────────────
    const gdp = gdpData.obs.length > 0 ? parseVal(gdpData.obs[0]) : FALLBACK.gdpQoQ;
    const gdpDate = gdpData.obs.length > 0 ? gdpData.obs[0].date : FALLBACK.gdpDate;

    // ── Core PCE YoY: (latest / 12mo_ago - 1) * 100 ──
    let corePceYoY = FALLBACK.corePceYoY;
    let corePceDate = FALLBACK.corePceDate;
    if (pceData.obs.length >= 13) {
      const latest = parseVal(pceData.obs[0]);
      const prev = parseVal(pceData.obs[12]); // 12 months back
      if (latest !== null && prev !== null && prev > 0) {
        corePceYoY = Math.round((latest / prev - 1) * 1000) / 10;
      }
      corePceDate = pceData.obs[0].date;
    }

    // ── CPI YoY ───────────────────────────────────────
    let cpiYoY = FALLBACK.cpiYoY;
    let cpiDate = FALLBACK.cpiDate;
    if (cpiData.obs.length >= 13) {
      const latest = parseVal(cpiData.obs[0]);
      const prev = parseVal(cpiData.obs[12]);
      if (latest !== null && prev !== null && prev > 0) {
        cpiYoY = Math.round((latest / prev - 1) * 1000) / 10;
      }
      cpiDate = cpiData.obs[0].date;
    }

    // ── Unemployment Rate ─────────────────────────────
    const un = unrateData.obs.length > 0 ? parseVal(unrateData.obs[0]) : FALLBACK.unemployment;

    // ── NFP MoM change (已存储为千人) ──────────────────
    let nfpMoM = FALLBACK.nfpMoM;
    if (nfpData.obs.length >= 2) {
      const cur = parseVal(nfpData.obs[0]);
      const prev = parseVal(nfpData.obs[1]);
      if (cur !== null && prev !== null) {
        nfpMoM = Math.round(cur - prev);
      }
    }
    const empDate =
      unrateData.obs.length > 0 ? unrateData.obs[0].date : FALLBACK.employmentDate;

    // ── Deficit % GDP ─────────────────────────────────
    const defVal =
      deficitData.obs.length > 0 ? parseVal(deficitData.obs[0]) : FALLBACK.deficitPctGDP;
    const defDate =
      deficitData.obs.length > 0 ? deficitData.obs[0].date : FALLBACK.deficitDate;

    return NextResponse.json({
      success: true,
      date: empDate,
      gdpQoQ: gdp,
      gdpDate,
      corePceYoY,
      corePceDate,
      cpiYoY,
      cpiDate,
      unemployment: un,
      nfpMoM,
      employmentDate: empDate,
      deficitPctGDP: defVal,
      deficitDate: defDate,
      updatedAt: new Date().toISOString(),
      dataSource: "FRED (Federal Reserve Economic Data)",
    });
  } catch (error) {
    console.error("Fundamentals API error:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to fetch fundamentals data",
      ...FALLBACK,
      updatedAt: new Date().toISOString(),
      dataSource: "Error fallback",
    });
  }
}
