import { NextResponse } from "next/server";

// ============================================================
// 市场情绪面 API
// 数据源：FRED API（需 key，无 key 时 fallback 为内置最新值）
//
// 指标：
//   - VIX: VIXCLS (CBOE Volatility Index)
//   - HY OAS: BAMLH0A0HYM2 (ICE BofA US High Yield OAS)
//   - 10Y Term Premium: THREEFYTP10 (ACM Term Premium)
//   - 5Y5Y Forward BE: T5YIFR (5Y5Y Forward Breakeven Inflation)
//   - 10Y-3M Spread: T10Y3M (10-Year minus 3-Month Treasury)
//   - Broad Dollar Index: DTWEXBGS (Trade-Weighted Broad USD)
//   - MOVE Index: Attempt FRED (BAMLMOVE, may be unavailable)
//   - 10Y Realized Vol: Calculated from DGS10 last 60 days (20d annualized bp)
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
  // 最后更新: 2026-06-17
  const FALLBACK = {
    vix: 16.20,                 // VIXCLS 收盘
    vixDate: "2026-06-15",
    hyOas: 2.66,                // ICE BofA US HY OAS Level (%)
    hyOasDate: "2026-06-15",
    termPremium10Y: 77,         // THREEFYTP10 (FRED ACM), 0.767% → 77bp
    tpDate: "2026-06-12",
    fwdBE5Y5Y: 2.22,            // T5YIFR 5Y5Y Forward BE (%)
    fwdBEDate: "2026-06-16",
    spread10Y3M: 64,            // T10Y3M, 6/16 FRED +64bp
    spreadDate: "2026-06-16",
    dxyBroad: 119.5,            // DTWEXBGS Nominal Broad USD
    dxyDate: "2026-06-12",
    moveIndex: 67.3,            // ICE BofA MOVE Index (2026-06-17)
    moveDate: "2026-06-17",
    realVol10Y: 82,             // 10Y 20d realized vol (bp/yr, 自算: DGS10日变动std×√252)
    realVolDate: null,
  };

  if (!fredApiKey) {
    return NextResponse.json({
      success: true,
      date: FALLBACK.vixDate,
      vix: FALLBACK.vix,
      vixDate: FALLBACK.vixDate,
      hyOas: FALLBACK.hyOas,
      hyOasDate: FALLBACK.hyOasDate,
      termPremium10Y: FALLBACK.termPremium10Y,
      tpDate: FALLBACK.tpDate,
      fwdBE5Y5Y: FALLBACK.fwdBE5Y5Y,
      fwdBEDate: FALLBACK.fwdBEDate,
      spread10Y3M: FALLBACK.spread10Y3M,
      spreadDate: FALLBACK.spreadDate,
      dxyBroad: FALLBACK.dxyBroad,
      dxyDate: FALLBACK.dxyDate,
      moveIndex: FALLBACK.moveIndex,
      moveDate: FALLBACK.moveDate,
      realVol10Y: FALLBACK.realVol10Y,
      realVolDate: FALLBACK.realVolDate,
      updatedAt: new Date().toISOString(),
      dataSource: "Fallback (无 FRED API Key — 内置值，非实时)",
    });
  }

  try {
    // ── 并行获取所有 FRED 序列 ──────────────────────────
    const [
      vixData,          // VIXCLS (1 obs)
      hyOasData,        // BAMLH0A0HYM2 (1 obs)
      tpData,           // THREEFYTP10 (1 obs)
      fwdBEData,        // T5YIFR (1 obs)
      spreadData,       // T10Y3M (1 obs)
      dxyData,          // DTWEXBGS (1 obs)
      moveData,         // BAMLMOVE attempt (1 obs, may fail)
      dgs10Daily,       // DGS10 (60 obs → realized vol)
    ] = await Promise.all([
      fetchFredSeries("VIXCLS", fredApiKey!, 1),
      fetchFredSeries("BAMLH0A0HYM2", fredApiKey!, 1),
      fetchFredSeries("THREEFYTP10", fredApiKey!, 1),
      fetchFredSeries("T5YIFR", fredApiKey!, 1),
      fetchFredSeries("T10Y3M", fredApiKey!, 1),
      fetchFredSeries("DTWEXBGS", fredApiKey!, 1),
      fetchFredSeries("BAMLMOVE", fredApiKey!, 1),
      fetchFredSeries("DGS10", fredApiKey!, 60),
    ]);

    // ── VIX ──────────────────────────────────────────
    const vix = vixData.obs.length > 0 ? parseVal(vixData.obs[0]) : FALLBACK.vix;
    const vixDate = vixData.obs.length > 0 ? vixData.obs[0].date : FALLBACK.vixDate;

    // ── HY OAS ───────────────────────────────────────
    const hyOas = hyOasData.obs.length > 0 ? parseVal(hyOasData.obs[0]) : FALLBACK.hyOas;
    const hyOasDate = hyOasData.obs.length > 0 ? hyOasData.obs[0].date : FALLBACK.hyOasDate;

    // ── 10Y Term Premium (ACM) ──────────────────────
    // THREEFYTP10 is already in percentage points, convert to bp
    let tp: number | null = FALLBACK.termPremium10Y;
    let tpDate = FALLBACK.tpDate;
    if (tpData.obs.length > 0) {
      const raw = parseVal(tpData.obs[0]);
      if (raw !== null) tp = Math.round(raw * 100); // % → bp
      tpDate = tpData.obs[0].date;
    }

    // ── 5Y5Y Forward Breakeven ──────────────────────
    const fwdBE = fwdBEData.obs.length > 0 ? parseVal(fwdBEData.obs[0]) : FALLBACK.fwdBE5Y5Y;
    const fwdBEDate = fwdBEData.obs.length > 0 ? fwdBEData.obs[0].date : FALLBACK.fwdBEDate;

    // ── 10Y-3M Spread ───────────────────────────────
    // T10Y3M is already in percentage points, convert to bp
    let spread: number | null = FALLBACK.spread10Y3M;
    let spreadDate = FALLBACK.spreadDate;
    if (spreadData.obs.length > 0) {
      const raw = parseVal(spreadData.obs[0]);
      if (raw !== null) spread = Math.round(raw * 100); // % → bp
      spreadDate = spreadData.obs[0].date;
    }

    // ── Broad USD Index ──────────────────────────────
    const dxy = dxyData.obs.length > 0 ? parseVal(dxyData.obs[0]) : FALLBACK.dxyBroad;
    const dxyDate = dxyData.obs.length > 0 ? dxyData.obs[0].date : FALLBACK.dxyDate;

    // ── MOVE Index (attempt, may not be on FRED) ─────
    const move = (moveData.obs.length > 0 && !moveData.error)
      ? parseVal(moveData.obs[0]) : FALLBACK.moveIndex;
    const moveDate = (moveData.obs.length > 0 && !moveData.error)
      ? moveData.obs[0].date : FALLBACK.moveDate;

    // ── 10Y Realized Volatility (20-day, annualized) ──
    let realVol10Y: number | null = FALLBACK.realVol10Y;
    let realVolDate: string | null = FALLBACK.realVolDate;
    if (dgs10Daily.obs.length >= 21) {
      // Compute daily bp changes
      const changes: number[] = [];
      for (let i = 0; i < dgs10Daily.obs.length - 1; i++) {
        const cur = parseVal(dgs10Daily.obs[i]);
        const prev = parseVal(dgs10Daily.obs[i + 1]);
        if (cur !== null && prev !== null) {
          changes.push((cur - prev) * 100); // bp change
        }
      }
      // Last 20 changes → std * √252
      if (changes.length >= 20) {
        const recent = changes.slice(0, 20);
        const mean = recent.reduce((s, v) => s + v, 0) / recent.length;
        const variance = recent.reduce((s, v) => s + (v - mean) ** 2, 0) / recent.length;
        const dailyStd = Math.sqrt(variance);
        realVol10Y = Math.round(dailyStd * Math.sqrt(252));
      }
      realVolDate = dgs10Daily.obs[0]?.date ?? null;
    }

    return NextResponse.json({
      success: true,
      date: vixDate,
      vix,
      vixDate,
      hyOas,
      hyOasDate,
      termPremium10Y: tp,
      tpDate,
      fwdBE5Y5Y: fwdBE,
      fwdBEDate,
      spread10Y3M: spread,
      spreadDate,
      dxyBroad: dxy,
      dxyDate,
      moveIndex: move,
      moveDate,
      realVol10Y,
      realVolDate,
      updatedAt: new Date().toISOString(),
      dataSource: "FRED (Federal Reserve Economic Data)",
    });
  } catch (error) {
    console.error("Sentiment API error:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to fetch sentiment data",
      ...FALLBACK,
      updatedAt: new Date().toISOString(),
      dataSource: "Error fallback",
    });
  }
}
