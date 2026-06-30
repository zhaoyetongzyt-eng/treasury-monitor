import { NextResponse } from "next/server";

// ============================================================
// 国债收益率 + TIPS 实际利率 & 通胀预期 API
// 数据源：
//   - Treasury.gov 每日收益率曲线 CSV（名义利率）
//   - Treasury.gov TIPS Real Yield Curve CSV（实际利率，无需 API key）
//   - FRED API（优先，需 key，作为 TIPS 数据的高质量替代）
// 返回：10Y/30Y/2s10s + 实际利率/通胀预期 + 日变动
// ============================================================

const NOMINAL_CSV_URL =
  "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/2026/all?type=daily_treasury_yield_curve";

const TIPS_CSV_URL =
  "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/2026/all?type=daily_treasury_real_yield_curve";

/**
 * 从 FRED API 获取一个 series 的最近两条 observations
 */
async function fetchFredSeries(seriesId: string, apiKey: string) {
  const url = `https://api.stlouisfed.org/fred/series/observations` +
    `?series_id=${seriesId}&api_key=${apiKey}&file_type=json` +
    `&sort_order=desc&limit=2`;
  const res = await fetch(url, {
    next: { revalidate: 3600 },
    headers: { "User-Agent": "TreasuryMonitor/1.0" },
  });
  if (!res.ok) return null;
  const json = await res.json();
  const obs = json?.observations;
  if (!obs || obs.length < 2) return null;
  const latest = parseFloat(obs[0].value);
  const previous = parseFloat(obs[1].value);
  if (isNaN(latest) || isNaN(previous)) return null;
  return { latest, previous, date: obs[0].date };
}

export async function GET() {
  try {
    const fetchOpts = {
      next: { revalidate: 3600 },
      headers: { "User-Agent": "TreasuryMonitor/1.0" },
    };

    // ── 并行获取名义利率 + TIPS 实际利率 CSV ──────────────
    const [nomRes, tipsRes] = await Promise.all([
      fetch(NOMINAL_CSV_URL, fetchOpts),
      fetch(TIPS_CSV_URL, fetchOpts),
    ]);

    if (!nomRes.ok) {
      throw new Error(`Treasury CSV returned ${nomRes.status}`);
    }

    const nomText = await nomRes.text();
    const nomLines = nomText.trim().split("\n");

    if (nomLines.length < 3) {
      throw new Error("Nominal CSV has insufficient data rows");
    }

    // CSV 列: Date(0),1 Mo(1),1.5 Mo(2),2 Mo(3),3 Mo(4),4 Mo(5),
    //          6 Mo(6),1 Yr(7),2 Yr(8),3 Yr(9),5 Yr(10),7 Yr(11),
    //          10 Yr(12),20 Yr(13),30 Yr(14)
    // 数据行从 lines[1] 开始，按日期降序排列

    const parseNominalRow = (line: string) => {
      const fields = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
      return {
        date: fields[0]?.replace(/"/g, "").trim(),
        yield2Y: parseFloat(fields[8]),
        yield5Y: parseFloat(fields[10]),
        yield10Y: parseFloat(fields[12]),
        yield30Y: parseFloat(fields[14]),
      };
    };

    const latest = parseNominalRow(nomLines[1]);
    const previous = nomLines.length > 2 ? parseNominalRow(nomLines[2]) : null;

    if (isNaN(latest.yield10Y) || isNaN(latest.yield30Y)) {
      throw new Error("Could not parse yield values from CSV");
    }

    // 2s10s 利差
    const spread2s10s = isNaN(latest.yield2Y)
      ? null
      : Math.round((latest.yield10Y - latest.yield2Y) * 100) / 100;

    // 5s30s 利差
    const spread5s30s = Math.round((latest.yield30Y - latest.yield10Y) * 100) / 100;

    // bp 变化：用原始小数直接算 bp 差值，避免四舍五入丢失精度
    // 例：4.56 - 4.57 = -0.01 → -1bp（不是 0bp）
    const change2Y = previous ? Math.round((latest.yield2Y - previous.yield2Y) * 100) : null;
    const change5Y = previous && !isNaN(latest.yield5Y) && !isNaN(previous.yield5Y)
      ? Math.round((latest.yield5Y - previous.yield5Y) * 100) : null;
    const change10Y = previous ? Math.round((latest.yield10Y - previous.yield10Y) * 100) : null;
    const change30Y = previous ? Math.round((latest.yield30Y - previous.yield30Y) * 100) : null;
    const change2s10s = (previous && !isNaN(latest.yield2Y) && !isNaN(previous.yield2Y))
      ? Math.round(((latest.yield10Y - latest.yield2Y) - (previous.yield10Y - previous.yield2Y)) * 100)
      : null;

    // ── 解析 TIPS 实际利率 CSV ────────────────────────────
    // 列: Date(0), 5 YR(1), 7 YR(2), 10 YR(3), 20 YR(4), 30 YR(5)
    let tipsLatest5Y: number | null = null;
    let tipsLatest10Y: number | null = null;
    let tipsPrev5Y: number | null = null;
    let tipsPrev10Y: number | null = null;

    if (tipsRes.ok) {
      const tipsText = await tipsRes.text();
      const tipsLines = tipsText.trim().split("\n");
      if (tipsLines.length >= 3) {
        const parseTipsRow = (line: string) => {
          const fields = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
          return {
            y5: parseFloat(fields[1]),
            y10: parseFloat(fields[3]),
          };
        };
        const tLatest = parseTipsRow(tipsLines[1]);
        tipsLatest5Y = isNaN(tLatest.y5) ? null : tLatest.y5;
        tipsLatest10Y = isNaN(tLatest.y10) ? null : tLatest.y10;
        if (tipsLines.length > 2) {
          const tPrev = parseTipsRow(tipsLines[2]);
          tipsPrev5Y = isNaN(tPrev.y5) ? null : tPrev.y5;
          tipsPrev10Y = isNaN(tPrev.y10) ? null : tPrev.y10;
        }
      }
    }

    // ── FRED TIPS（优先）或 Treasury TIPS CSV（备选）──────────────────
    const fredApiKey = process.env.FRED_API_KEY || null;
    let realYield10Y: number | null = null;
    let breakeven10Y: number | null = null;
    let breakeven5Y: number | null = null;
    let changeReal10Y: number | null = null;
    let changeBE10Y: number | null = null;
    let changeBE5Y: number | null = null;

    if (fredApiKey) {
      // 有 FRED key 时优先使用 FRED 数据
      const [dfii10, t5yifr] = await Promise.all([
        fetchFredSeries("DFII10", fredApiKey),
        fetchFredSeries("T5YIFR", fredApiKey),
      ]);

      if (dfii10) {
        realYield10Y = dfii10.latest;
        changeReal10Y = Math.round((dfii10.latest - dfii10.previous) * 100);
        breakeven10Y = Math.round((latest.yield10Y - dfii10.latest) * 100) / 100;
        changeBE10Y = change10Y !== null ? change10Y - changeReal10Y : null;
      }

      if (t5yifr) {
        breakeven5Y = t5yifr.latest;
        changeBE5Y = Math.round((t5yifr.latest - t5yifr.previous) * 100);
      }
    } else if (tipsLatest10Y !== null) {
      // 无 FRED key，使用 Treasury TIPS CSV
      realYield10Y = tipsLatest10Y;
      breakeven10Y = Math.round((latest.yield10Y - tipsLatest10Y) * 100) / 100;

      if (tipsPrev10Y !== null) {
        changeReal10Y = Math.round((tipsLatest10Y - tipsPrev10Y) * 100);
        changeBE10Y = change10Y !== null ? change10Y - changeReal10Y : null;
      }

      // 5Y Breakeven = 名义5Y - TIPS 5Y
      if (tipsLatest5Y !== null && !isNaN(latest.yield5Y)) {
        breakeven5Y = Math.round((latest.yield5Y - tipsLatest5Y) * 100) / 100;
        if (tipsPrev5Y !== null && change5Y !== null) {
          const changeTips5Y = Math.round((tipsLatest5Y - tipsPrev5Y) * 100);
          changeBE5Y = change5Y - changeTips5Y;
        }
      }
    }

    return NextResponse.json({
      success: true,
      date: latest.date,
      yield2Y: latest.yield2Y,
      yield10Y: latest.yield10Y,
      yield30Y: latest.yield30Y,
      spread2s10s,        // 10Y - 2Y (百分点)
      spread5s30s,        // 30Y - 10Y (百分点)
      change2Y,           // 整数 bp（基于原始小数差值）
      change10Y,
      change30Y,
      change2s10s,
      previousDate: previous?.date ?? null,
      // Real Yield & Breakeven
      realYield10Y,
      breakeven10Y,
      breakeven5Y,
      changeReal10Y,
      changeBE10Y,
      changeBE5Y,
      realMinusBei10Y: (realYield10Y !== null && breakeven10Y !== null)
        ? Math.round((realYield10Y - breakeven10Y) * 100) / 100
        : null,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Yields API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch yield curve data" },
      { status: 500 }
    );
  }
}
