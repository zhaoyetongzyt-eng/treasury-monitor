import { NextResponse } from "next/server";

// ============================================================
// Funding Stress / 资金面压力 API
// 数据源：
//   - NY Fed Markets API（SOFR / TGCR / EFFR / ON RRP，无需 key）
//   - FRED API（IORB，需 key，无 key 时用内置 fallback）
// ============================================================

const NYFED_BASE = "https://markets.newyorkfed.org/api";

interface NyFedRate {
  effectiveDate: string;
  percentRate: number;
  volumeInBillions: number;
}

async function fetchNyFedRate(endpoint: string): Promise<NyFedRate | null> {
  const url = `${NYFED_BASE}${endpoint}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "TreasuryMonitor/1.0" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = await res.json();
  const rates = json?.refRates;
  if (!rates || rates.length < 2) return null;
  return {
    effectiveDate: rates[0].effectiveDate,
    percentRate: rates[0].percentRate,
    volumeInBillions: rates[0].volumeInBillions,
  };
}

interface NyFedRateWithPrev extends NyFedRate {
  prevPercentRate: number;
}

async function fetchNyFedRateWithPrev(endpoint: string): Promise<NyFedRateWithPrev | null> {
  const url = `${NYFED_BASE}${endpoint}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "TreasuryMonitor/1.0" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = await res.json();
  const rates = json?.refRates;
  if (!rates || rates.length < 2) return null;
  return {
    effectiveDate: rates[0].effectiveDate,
    percentRate: rates[0].percentRate,
    volumeInBillions: rates[0].volumeInBillions,
    prevPercentRate: rates[1].percentRate,
  };
}

async function fetchFredSeries(seriesId: string, apiKey: string) {
  const url = `https://api.stlouisfed.org/fred/series/observations` +
    `?series_id=${seriesId}&api_key=${apiKey}&file_type=json` +
    `&sort_order=desc&limit=2`;
  const res = await fetch(url, {
    headers: { "User-Agent": "TreasuryMonitor/1.0" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = await res.json();
  const obs = json?.observations;
  if (!obs || obs.length < 2) return null;
  const latest = parseFloat(obs[0].value);
  const previous = parseFloat(obs[1].value);
  if (isNaN(latest) || isNaN(previous)) return null;
  return { latest, previous };
}

export async function GET() {
  try {
    // ── 并行获取 SOFR / TGCR / EFFR（JSON API） ──────────
    const [sofrData, tgcrData, effrData] = await Promise.all([
      fetchNyFedRateWithPrev("/rates/secured/sofr/last/2.json"),
      fetchNyFedRateWithPrev("/rates/secured/tgcr/last/2.json"),
      fetchNyFedRateWithPrev("/rates/unsecured/effr/last/2.json"),
    ]);

    // ── 获取 ON RRP 数据（CSV API） ─────────────────────
    let onRrpAmount: number | null = null;
    let onRrpPrevAmount: number | null = null;
    let onRrpDebug: string | null = null;

    try {
      // 使用 JSON API 获取 ON RRP 数据
      const today = new Date();
      const endDate = today.toISOString().slice(0, 10);
      const startDate = new Date(today.getTime() - 7 * 86400000).toISOString().slice(0, 10);
      const rrpUrl = `${NYFED_BASE}/rp/reverserepo/propositions/search.json` +
        `?startDate=${startDate}&endDate=${endDate}`;

      const rrpRes = await fetch(rrpUrl, {
        headers: { "User-Agent": "TreasuryMonitor/1.0" },
        cache: "no-store",
      });

      if (!rrpRes.ok) {
        const errBody = await rrpRes.text().catch(() => "");
        onRrpDebug = `fetch failed: ${rrpRes.status}, url=${rrpUrl.slice(0, 80)}, body: ${errBody.slice(0, 200)}`;
      } else {
        const json = await rrpRes.json();
        const operations = json?.repo?.operations;
        onRrpDebug = `json received: ${operations ? operations.length : 0} operations`;

        if (operations && operations.length >= 1) {
          // totalAmtAccepted 是美元金额，转为 $Billions
          const amt = operations[0].totalAmtAccepted / 1e9;
          onRrpAmount = Math.round(amt * 1000) / 1000; // 3 decimal places
          onRrpDebug += `, latest=${operations[0].operationDate} amt=${onRrpAmount}B`;
        }
        if (operations && operations.length >= 2) {
          const prevAmt = operations[1].totalAmtAccepted / 1e9;
          onRrpPrevAmount = Math.round(prevAmt * 1000) / 1000;
        }
      }
    } catch (e) {
      console.error("ON RRP fetch/parse error:", e instanceof Error ? e.message : String(e));
    }

    // ── IORB（FRED 优先，无 key 时 fallback） ──────────
    const fredApiKey = process.env.FRED_API_KEY || null;
    let iorbRate: number | null = null;
    let iorbPrevRate: number | null = null;

    if (fredApiKey) {
      const iorb = await fetchFredSeries("IORB", fredApiKey);
      if (iorb) {
        iorbRate = iorb.latest;
        iorbPrevRate = iorb.previous;
      }
    }

    // Fallback IORB（美联储管理的利率，仅在 FOMC 会议时变动）
    // 当前值需要根据最近一次 FOMC 决策更新
    // 最后更新: 2026-06-03, IORB = 3.65%（Fed target range 3.50–3.75%）
    if (iorbRate === null) iorbRate = 3.65;

    // ── 计算价差 ─────────────────────────────────────
    const sofr = sofrData?.percentRate ?? null;
    const effr = effrData?.percentRate ?? null;
    const tgcr = tgcrData?.percentRate ?? null;

    const sofrMinusEffr = (sofr !== null && effr !== null)
      ? Math.round((sofr - effr) * 100)
      : null;

    const sofrMinusIorb = (sofr !== null && iorbRate !== null)
      ? Math.round((sofr - iorbRate) * 100)
      : null;

    // bp 日变动
    const changeSofr = sofrData
      ? Math.round((sofrData.percentRate - sofrData.prevPercentRate) * 100)
      : null;
    const changeTgcr = tgcrData
      ? Math.round((tgcrData.percentRate - tgcrData.prevPercentRate) * 100)
      : null;
    const changeOnRrp = (onRrpAmount !== null && onRrpPrevAmount !== null)
      ? Math.round((onRrpAmount - onRrpPrevAmount) * 10) / 10  // 保留 1 位小数
      : null;

    // ── 信号判断 ─────────────────────────────────────
    type Signal = "funding_stable" | "mild_pressure" | "funding_stress" | "liquidity_declining";
    let signal: Signal = "funding_stable";
    let signalLabel = "Funding Stable";
    let signalColor = "emerald";

    if (sofrMinusEffr !== null) {
      if (sofrMinusEffr > 10) {
        signal = "funding_stress";
        signalLabel = "Funding Stress Rising";
        signalColor = "red";
      } else if (sofrMinusEffr >= 5) {
        signal = "mild_pressure";
        signalLabel = "Mild Pressure";
        signalColor = "amber";
      } else {
        signal = "funding_stable";
        signalLabel = "Funding Stable";
        signalColor = "emerald";
      }
    }

    // 独立检测 ON RRP 快速下降（额外预警）
    let onRrpWarning: string | null = null;
    if (onRrpAmount !== null && onRrpPrevAmount !== null) {
      const pctChange = onRrpPrevAmount > 0
        ? (onRrpAmount - onRrpPrevAmount) / onRrpPrevAmount
        : 0;
      if (pctChange < -0.10) { // 日降幅超过 10%
        onRrpWarning = "ON RRP 快速下降 — 闲置流动性缓冲减少";
      }
    }

    // SOFR 明显高于 IORB 的独立预警
    let sofriorbWarning: string | null = null;
    if (sofrMinusIorb !== null && sofrMinusIorb > 5) {
      sofriorbWarning = "SOFR 高于 IORB — 银行体系边际流动性压力上升";
    }

    return NextResponse.json({
      success: true,
      date: sofrData?.effectiveDate ?? null,
      sofr,
      tgcr,
      effr,
      onRrpAmount,         // $ Billions
      iorbRate,
      sofrMinusEffr,       // bp
      sofrMinusIorb,       // bp
      changeSofr,          // bp
      changeTgcr,          // bp
      changeOnRrp,         // $ Billions (1 decimal)
      signal,
      signalLabel,
      signalColor,
      onRrpWarning,
      sofriorbWarning,
      dataSource: fredApiKey
        ? "NY Fed + FRED"
        : "NY Fed（IORB 为内置 fallback 值，非实时）",
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Funding Stress API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch funding stress data" },
      { status: 500 }
    );
  }
}
