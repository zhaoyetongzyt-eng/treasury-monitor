import { NextResponse } from "next/server";

// ============================================================
// 国债收益率 API
// 数据源：Treasury.gov 每日收益率曲线 CSV
// 返回：10Y / 30Y / 2s10s 利差 + 日变动
// ============================================================

const CSV_URL =
  "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/2026/all?type=daily_treasury_yield_curve";

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
