import { NextResponse } from "next/server";

// ============================================================
// 货币政策面 API
// 数据源：FRED API（需 key，无 key 时 fallback 为内置最新值）
//
// 指标：
//   - FFR Target Range: DFEDTARU (Upper) + DFEDTARL (Lower)
//   - Effective FFR: DFF
//   - IORB Rate: IORB
//   - ON RRP Award Rate: RRPONTSYAWARD
//   - Fed Balance Sheet: WALCL (Wednesday Level, weekly)
//   - QT Pace: 从 WALCL 最近4周变化推算月均
//   - Policy Expectations: 2Y - FFR, 10Y - FFR spreads
//   - 5Y-30Y Spread: DGS5 - DGS30 (curve shape signal)
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
  // FOMC 降息至 3.50-3.75%，下次会议 2026-07-29
  const FALLBACK = {
    ffTargetUpper: 3.75,
    ffTargetLower: 3.50,
    ffTargetDate: "2026-06-17",
    ffEffective: 3.63,
    iorbRate: 3.65,
    onRrpRate: 3.50,
    fedBalanceSheet: 6.725,    // $ Trillion
    fedBsDate: "2026-06-17",
    fedBs4WkAgo: 6.75,
    qtMonthlyPace: -45,       // $ Billion/month（估算）
    twoYMinusFFR: 42,         // 2Y - FFR ≈ +42bp
    tenYMinusFFR: 84,         // 10Y - FFR ≈ +84bp
    spread5s30s: 75,          // 30Y - 5Y ≈ 70–80bp
    spread5s30sDate: null,
  };

  if (!fredApiKey) {
    return NextResponse.json({
      success: true,
      date: FALLBACK.ffTargetDate,
      ffTargetUpper: FALLBACK.ffTargetUpper,
      ffTargetLower: FALLBACK.ffTargetLower,
      ffTargetDate: FALLBACK.ffTargetDate,
      ffEffective: FALLBACK.ffEffective,
      iorbRate: FALLBACK.iorbRate,
      onRrpRate: FALLBACK.onRrpRate,
      fedBalanceSheet: FALLBACK.fedBalanceSheet,
      fedBsDate: FALLBACK.fedBsDate,
      fedBs4WkAgo: FALLBACK.fedBs4WkAgo,
      qtMonthlyPace: FALLBACK.qtMonthlyPace,
      twoYMinusFFR: FALLBACK.twoYMinusFFR,
      tenYMinusFFR: FALLBACK.tenYMinusFFR,
      spread5s30s: FALLBACK.spread5s30s,
      spread5s30sDate: FALLBACK.spread5s30sDate,
      updatedAt: new Date().toISOString(),
      dataSource: "Fallback (无 FRED API Key — 内置值，非实时)",
    });
  }

  try {
    // ── 并行获取所有 FRED 序列 ──────────────────────────
    const [
      ffTargetUpperData,  // DFEDTARU (1 obs → latest)
      ffTargetLowerData,  // DFEDTARL (1 obs)
      ffEffData,          // DFF (1 obs)
      iorbData,           // IORB (1 obs)
      onRrpData,          // RRPONTSYAWARD (1 obs)
      walclData,          // WALCL (5 obs → latest + 4 weeks ago)
      // 2Y/10Y from DGS2/DGS10 (1 obs each)
      dgs2Data,
      dgs10Data,
      dgs5Data,
      dgs30Data,
    ] = await Promise.all([
      fetchFredSeries("DFEDTARU", fredApiKey!, 1),
      fetchFredSeries("DFEDTARL", fredApiKey!, 1),
      fetchFredSeries("DFF", fredApiKey!, 1),
      fetchFredSeries("IORB", fredApiKey!, 1),
      fetchFredSeries("RRPONTSYAWARD", fredApiKey!, 1),
      fetchFredSeries("WALCL", fredApiKey!, 5),
      fetchFredSeries("DGS2", fredApiKey!, 1),
      fetchFredSeries("DGS10", fredApiKey!, 1),
      fetchFredSeries("DGS5", fredApiKey!, 1),
      fetchFredSeries("DGS30", fredApiKey!, 1),
    ]);

    // ── FFR Target Range ─────────────────────────────
    const upper = ffTargetUpperData.obs.length > 0
      ? parseVal(ffTargetUpperData.obs[0]) : FALLBACK.ffTargetUpper;
    const lower = ffTargetLowerData.obs.length > 0
      ? parseVal(ffTargetLowerData.obs[0]) : FALLBACK.ffTargetLower;
    const targetDate = ffTargetUpperData.obs.length > 0
      ? ffTargetUpperData.obs[0].date : FALLBACK.ffTargetDate;

    // ── Effective FFR ────────────────────────────────
    const effr = ffEffData.obs.length > 0
      ? parseVal(ffEffData.obs[0]) : FALLBACK.ffEffective;

    // ── IORB ─────────────────────────────────────────
    const iorb = iorbData.obs.length > 0
      ? parseVal(iorbData.obs[0]) : FALLBACK.iorbRate;

    // ── ON RRP Rate ──────────────────────────────────
    const onRrp = onRrpData.obs.length > 0
      ? parseVal(onRrpData.obs[0]) : FALLBACK.onRrpRate;

    // ── Fed Balance Sheet (weekly, 取最近两值算4周变化) ─
    let fedBs: number | null = FALLBACK.fedBalanceSheet;
    let fedBsDate = FALLBACK.fedBsDate;
    let fedBs4Wk = FALLBACK.fedBs4WkAgo;
    let qtPace: number | null = FALLBACK.qtMonthlyPace;

    if (walclData.obs.length >= 5) {
      const latest = parseVal(walclData.obs[0]);    // most recent Wed
      const wk4 = parseVal(walclData.obs[4]);        // ~4 weeks ago
      if (latest !== null) {
        fedBs = Math.round(latest / 1000 * 100) / 100;  // Millions → Trillions
        fedBsDate = walclData.obs[0].date;
      }
      if (wk4 !== null) {
        fedBs4Wk = Math.round(wk4 / 1000 * 100) / 100;
      }
      if (latest !== null && wk4 !== null) {
        // 4-week change ($B), annualize: ×(13/4) for monthly pace
        const delta4wk = (latest - wk4) / 1000; // → Billions
        qtPace = Math.round(delta4wk * (13 / 4) * 10) / 10;
      }
    }

    // ── 2Y / 10Y / 5Y / 30Y yields ────────────────────
    const y2 = dgs2Data.obs.length > 0 ? parseVal(dgs2Data.obs[0]) : null;
    const y10 = dgs10Data.obs.length > 0 ? parseVal(dgs10Data.obs[0]) : null;
    const y5 = dgs5Data.obs.length > 0 ? parseVal(dgs5Data.obs[0]) : null;
    const y30 = dgs30Data.obs.length > 0 ? parseVal(dgs30Data.obs[0]) : null;

    // ── Policy spread ────────────────────────────────
    let twoMinusFFR: number | null = FALLBACK.twoYMinusFFR;
    let tenMinusFFR: number | null = FALLBACK.tenYMinusFFR;
    if (effr !== null && y2 !== null) {
      twoMinusFFR = Math.round((y2 - effr) * 100);   // bp
    }
    if (effr !== null && y10 !== null) {
      tenMinusFFR = Math.round((y10 - effr) * 100);
    }

    // ── 5s30s spread ────────────────────────────────
    let spread5s30s: number | null = FALLBACK.spread5s30s;
    let spread5s30sDate: string | null = FALLBACK.spread5s30sDate;
    if (y5 !== null && y30 !== null) {
      spread5s30s = Math.round((y30 - y5) * 100);     // 30Y - 5Y, bp
      spread5s30sDate = dgs30Data.obs[0]?.date ?? null;
    }

    return NextResponse.json({
      success: true,
      date: targetDate,
      ffTargetUpper: upper,
      ffTargetLower: lower,
      ffTargetDate: targetDate,
      ffEffective: effr,
      iorbRate: iorb,
      onRrpRate: onRrp,
      fedBalanceSheet: fedBs,
      fedBsDate,
      fedBs4WkAgo: fedBs4Wk,
      qtMonthlyPace: qtPace,
      twoYMinusFFR: twoMinusFFR,
      tenYMinusFFR: tenMinusFFR,
      spread5s30s,
      spread5s30sDate,
      updatedAt: new Date().toISOString(),
      dataSource: "FRED (Federal Reserve Economic Data)",
    });
  } catch (error) {
    console.error("Policy API error:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to fetch policy data",
      ...FALLBACK,
      updatedAt: new Date().toISOString(),
      dataSource: "Error fallback",
    });
  }
}
