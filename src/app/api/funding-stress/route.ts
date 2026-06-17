import { NextResponse } from "next/server";

// ============================================================
// Funding Stress / 资金面压力 API
// 数据源：
//   - NY Fed Markets API（SOFR / TGCR / EFFR / ON RRP / SRF，无需 key）
//   - FRED API（IORB，需 key，无 key 时用内置 fallback）
// ============================================================

const NYFED_BASE = "https://markets.newyorkfed.org/api";

interface NyFedRate {
  effectiveDate: string;
  percentRate: number;
  volumeInBillions: number;
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

/** NY Fed 操作记录 */
interface NyFedOperation {
  operationId: string;
  operationDate: string;
  operationType: "Repo" | "Reverse Repo";
  operationMethod: string;
  totalAmtAccepted: number;
  settlementType: string;
  term: string;
  note?: string;
  details?: Array<{
    securityType: string;
    amtAccepted?: number;
    percentOfferingRate?: number;
    percentStopOutRate?: number;
    percentWeightedAverageRate?: number;
  }>;
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

/** 从 lastTwoWeeks 中提取 ON RRP / SRF 数据 */
async function fetchRepoOperations(): Promise<{
  onRrp: { amount: number; rate: number; date: string } | null;
  onRrpPrev: { amount: number } | null;
  srf: { amount: number; rate: number; date: string } | null;
  srfPrev: { amount: number } | null;
}> {
  const result = { onRrp: null as any, onRrpPrev: null as any, srf: null as any, srfPrev: null as any };

  try {
    const url = `${NYFED_BASE}/rp/all/all/results/lastTwoWeeks.json`;
    const res = await fetch(url, {
      headers: { "User-Agent": "TreasuryMonitor/1.0" },
      cache: "no-store",
    });
    if (!res.ok) return result;
    const json = await res.json();
    const ops: NyFedOperation[] = json?.repo?.operations ?? [];

    // ── ON RRP：Reverse Repo + Fixed Rate ──
    const reverseRepoOps = ops.filter(
      (o) => o.operationType === "Reverse Repo" && o.operationMethod === "Fixed Rate"
    );
    reverseRepoOps.sort((a, b) => b.operationDate.localeCompare(a.operationDate));

    if (reverseRepoOps.length >= 1) {
      const latest = reverseRepoOps[0];
      const offeringRate = latest.details?.[0]?.percentOfferingRate ?? 3.50;
      result.onRrp = {
        amount: latest.totalAmtAccepted / 1e9,
        rate: offeringRate,
        date: latest.operationDate,
      };
    }
    if (reverseRepoOps.length >= 2) {
      result.onRrpPrev = { amount: reverseRepoOps[1].totalAmtAccepted / 1e9 };
    }

    // ── SRF：Repo + Full Allotment（排除 SVE），按日汇总 ──
    // NY Fed 每日 SRF 分上午/下午两次操作，需按日合并总量
    const srfOps = ops.filter(
      (o) =>
        o.operationType === "Repo" &&
        o.operationMethod === "Full Allotment" &&
        !(o.note ?? "").includes("Small Value Exercise")
    );

    // 按日汇总：key = operationDate, value = { totalAmt, latestRate, opCount }
    const srfByDate = new Map<string, { totalAmt: number; latestRate: number }>();
    for (const op of srfOps) {
      const existing = srfByDate.get(op.operationDate);
      const rate = op.details?.[0]?.percentStopOutRate ?? 3.75;
      if (existing) {
        existing.totalAmt += op.totalAmtAccepted;
        existing.latestRate = rate; // 取当天最后一次的利率
      } else {
        srfByDate.set(op.operationDate, { totalAmt: op.totalAmtAccepted, latestRate: rate });
      }
    }

    const srfDates = Array.from(srfByDate.keys()).sort((a, b) => b.localeCompare(a));

    if (srfDates.length >= 1) {
      const latest = srfByDate.get(srfDates[0])!;
      result.srf = {
        amount: latest.totalAmt / 1e9,
        rate: latest.latestRate,
        date: srfDates[0],
      };
    }
    if (srfDates.length >= 2) {
      result.srfPrev = { amount: srfByDate.get(srfDates[1])!.totalAmt / 1e9 };
    }

    return result;
  } catch (e) {
    console.error("Repo operations fetch error:", e instanceof Error ? e.message : String(e));
    return result;
  }
}

export async function GET() {
  try {
    // ── 并行获取 SOFR / TGCR / EFFR + 操作数据 ──────────
    const [sofrData, tgcrData, effrData, repoOpsData] = await Promise.all([
      fetchNyFedRateWithPrev("/rates/secured/sofr/last/2.json"),
      fetchNyFedRateWithPrev("/rates/secured/tgcr/last/2.json"),
      fetchNyFedRateWithPrev("/rates/unsecured/effr/last/2.json"),
      fetchRepoOperations(),
    ]);

    // ── ON RRP / SRF ─────────────────────────────────
    const onRrpAmount = repoOpsData.onRrp?.amount ?? null;
    const onRrpRate = repoOpsData.onRrp?.rate ?? null;
    const onRrpPrevAmount = repoOpsData.onRrpPrev?.amount ?? null;
    const srfAmount = repoOpsData.srf?.amount ?? null;
    const srfRate = repoOpsData.srf?.rate ?? null;
    const srfPrevAmount = repoOpsData.srfPrev?.amount ?? null;

    // ── IORB（FRED 优先，无 key 时 fallback） ──────────
    const fredApiKey = process.env.FRED_API_KEY || null;
    let iorbRate: number | null = null;

    if (fredApiKey) {
      const iorb = await fetchFredSeries("IORB", fredApiKey);
      if (iorb) iorbRate = iorb.latest;
    }

    // Fallback IORB（美联储管理的利率，仅在 FOMC 会议时变动）
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

    const sofrMinusOnRrp = (sofr !== null && onRrpRate !== null)
      ? Math.round((sofr - onRrpRate) * 100)
      : null;

    // bp 日变动
    const changeSofr = sofrData
      ? Math.round((sofrData.percentRate - sofrData.prevPercentRate) * 100)
      : null;
    const changeTgcr = tgcrData
      ? Math.round((tgcrData.percentRate - tgcrData.prevPercentRate) * 100)
      : null;
    const changeOnRrp = (onRrpAmount !== null && onRrpPrevAmount !== null)
      ? Math.round((onRrpAmount - onRrpPrevAmount) * 1000) / 1000
      : null;
    const changeSrf = (srfAmount !== null && srfPrevAmount !== null)
      ? Math.round((srfAmount - srfPrevAmount) * 1000) / 1000
      : null;

    // ── 信号判断 ─────────────────────────────────────
    type Signal = "funding_stable" | "mild_pressure" | "funding_stress" | "liquidity_declining";
    let signal: Signal = "funding_stable";
    let signalLabel = "Funding Stable";
    let signalColor: "emerald" | "amber" | "red" = "emerald";

    if (sofrMinusEffr !== null) {
      if (sofrMinusEffr > 10) {
        signal = "funding_stress";
        signalLabel = "Funding Stress Rising";
        signalColor = "red";
      } else if (sofrMinusEffr >= 5) {
        signal = "mild_pressure";
        signalLabel = "Mild Pressure";
        signalColor = "amber";
      }
    }

    // ON RRP 快速下降预警
    let onRrpWarning: string | null = null;
    if (onRrpAmount !== null && onRrpPrevAmount !== null) {
      const pctChange = onRrpPrevAmount > 0
        ? (onRrpAmount - onRrpPrevAmount) / onRrpPrevAmount
        : 0;
      if (pctChange < -0.10) {
        onRrpWarning = "ON RRP 快速下降 — 闲置流动性缓冲减少";
      }
    }

    // SOFR 明显高于 IORB
    let sofriorbWarning: string | null = null;
    if (sofrMinusIorb !== null && sofrMinusIorb > 5) {
      sofriorbWarning = "SOFR 高于 IORB — 银行体系边际流动性压力上升";
    }

    // SOFR–ON RRP 利差 25bp 警示
    let sofrOnrrpWarning: string | null = null;
    if (sofrMinusOnRrp !== null) {
      if (sofrMinusOnRrp >= 50) {
        sofrOnrrpWarning = `SOFR–ON RRP 利差 ${sofrMinusOnRrp}bp（远超 25bp 阈值）— 准备金充裕度显著下降`;
      } else if (sofrMinusOnRrp >= 25) {
        sofrOnrrpWarning = `SOFR–ON RRP 利差 ${sofrMinusOnRrp}bp（触及 25bp 阈值）— 准备金充裕度下降，关注 SRF 使用量`;
      }
    }

    return NextResponse.json({
      success: true,
      date: sofrData?.effectiveDate ?? null,
      sofr,
      tgcr,
      effr,
      onRrpAmount,         // $ Billions
      onRrpRate,           // %
      iorbRate,
      srfAmount,           // $ Billions
      srfRate,             // %
      sofrMinusEffr,       // bp
      sofrMinusIorb,       // bp
      sofrMinusOnRrp,      // bp
      changeSofr,          // bp
      changeTgcr,          // bp
      changeOnRrp,         // $ Billions
      changeSrf,           // $ Billions
      signal,
      signalLabel,
      signalColor,
      onRrpWarning,
      sofriorbWarning,
      sofrOnrrpWarning,
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
