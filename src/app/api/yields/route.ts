import { NextResponse } from "next/server";

// ============================================================
// 国债收益率 + TIPS 实际利率 & 通胀预期 API
// 数据源：
//   - Treasury.gov 每日收益率曲线 CSV（名义利率）
//   - FRED API（TIPS 实际利率 & 盈亏平衡通胀）
// 返回：10Y/30Y/2s10s + 实际利率/通胀预期 + 日变动
// ============================================================

const CSV_URL =
  "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/2026/all?type=daily_treasury_yield_curve";

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
    const res = await fetch(CSV_URL, {
      next: { revalidate: 3600 },
      headers: { "User-Agent": "TreasuryMonitor/1.0" },
    });

    if (!res.ok) {
      throw new Error(`Treasury CSV returned ${res.status}`);
    }

    const text = await res.text();
    const lines = text.trim().split("\n");

    if (lines.length < 3) {
      throw new Error("CSV has insufficient data rows");
    }

    // CSV 列: Date(0),1 Mo(1),1.5 Mo(2),2 Mo(3),3 Mo(4),4 Mo(5),
    //          6 Mo(6),1 Yr(7),2 Yr(8),3 Yr(9),5 Yr(10),7 Yr(11),
    //          10 Yr(12),20 Yr(13),30 Yr(14)
    // 数据行从 lines[1] 开始，按日期降序排列

    const parseRow = (line: string) => {
      const fields = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
      return {
        date: fields[0]?.replace(/"/g, "").trim(),
        yield2Y: parseFloat(fields[8]),
        yield10Y: parseFloat(fields[12]),
        yield30Y: parseFloat(fields[14]),
      };
    };

    const latest = parseRow(lines[1]);
    const previous = lines.length > 2 ? parseRow(lines[2]) : null;

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
    const change10Y = previous ? Math.round((latest.yield10Y - previous.yield10Y) * 100) : null;
    const change30Y = previous ? Math.round((latest.yield30Y - previous.yield30Y) * 100) : null;
    const change2s10s = (previous && !isNaN(latest.yield2Y) && !isNaN(previous.yield2Y))
      ? Math.round(((latest.yield10Y - latest.yield2Y) - (previous.yield10Y - previous.yield2Y)) * 100)
      : null;

    // ── FRED TIPS 实际利率 & 盈亏平衡通胀 ──────────────────
    const fredApiKey = process.env.FRED_API_KEY || null;
    let realYield10Y: number | null = null;
    let breakeven10Y: number | null = null;
    let breakeven5Y: number | null = null;
    let changeReal10Y: number | null = null;
    let changeBE10Y: number | null = null;
    let changeBE5Y: number | null = null;

    if (fredApiKey) {
      // 并行获取 FRED series
      const [dfii10, t5yifr] = await Promise.all([
        fetchFredSeries("DFII10", fredApiKey),
        fetchFredSeries("T5YIFR", fredApiKey),
      ]);

      if (dfii10) {
        realYield10Y = dfii10.latest;
        changeReal10Y = Math.round((dfii10.latest - dfii10.previous) * 100);
        // 10Y Breakeven = Nominal - TIPS（保持与 Treasury.gov 数据同源一致）
        breakeven10Y = Math.round((latest.yield10Y - dfii10.latest) * 100) / 100;
        changeBE10Y = change10Y !== null ? change10Y - changeReal10Y : null;
      }

      if (t5yifr) {
        breakeven5Y = t5yifr.latest;
        changeBE5Y = Math.round((t5yifr.latest - t5yifr.previous) * 100);
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
