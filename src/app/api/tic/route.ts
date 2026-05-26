import { NextResponse } from "next/server";

interface TICHoldingItem {
  country: string;
  amount: number;          // 十亿美元
  trend: string;           // 上升/下降/平稳
  change: number;          // 月环比变动（十亿美元）
  isMajor: boolean;        // 是否主要持有国（>300B）
}

interface TICApiResponse {
  success: boolean;
  dataDate: string;        // 最新数据月份
  previousDate: string;    // 上一个月
  dataSource: string;
  holdings: TICHoldingItem[];
  summary: {
    total: number;
    officialTotal: number;
    officialBills: number;
    officialBondsNotes: number;
  };
  updatedAt: string;
  error?: string;
}

// ===== 内置最新数据（fallback）=====
// 数据月份: 2026-03（TIC 月报通常滞后 2 个月）
// 来源: https://ticdata.treasury.gov/.../slt_table5.html
const FALLBACK_HOLDINGS: TICHoldingItem[] = [
  { country: "Japan", amount: 1191.6, trend: "下降", change: -47.7, isMajor: true },
  { country: "United Kingdom", amount: 926.9, trend: "上升", change: 29.6, isMajor: true },
  { country: "China, Mainland", amount: 652.3, trend: "下降", change: -41.0, isMajor: true },
  { country: "Cayman Islands", amount: 459.4, trend: "上升", change: 16.4, isMajor: true },
  { country: "Belgium", amount: 454.0, trend: "平稳", change: -0.7, isMajor: true },
  { country: "Canada", amount: 439.4, trend: "下降", change: -6.9, isMajor: true },
  { country: "Luxembourg", amount: 432.0, trend: "下降", change: -13.7, isMajor: true },
  { country: "France", amount: 393.0, trend: "平稳", change: -2.1, isMajor: true },
  { country: "Ireland", amount: 355.2, trend: "上升", change: 4.6, isMajor: true },
  { country: "Taiwan", amount: 300.8, trend: "下降", change: -12.7, isMajor: true },
  { country: "Switzerland", amount: 286.4, trend: "平稳", change: -0.3, isMajor: true },
  { country: "Hong Kong", amount: 278.2, trend: "上升", change: 9.0, isMajor: false },
  { country: "Singapore", amount: 274.3, trend: "下降", change: -5.7, isMajor: false },
  { country: "Norway", amount: 217.4, trend: "下降", change: -5.6, isMajor: false },
  { country: "India", amount: 183.0, trend: "下降", change: -7.6, isMajor: false },
  { country: "Brazil", amount: 168.0, trend: "平稳", change: -2.6, isMajor: false },
  { country: "Saudi Arabia", amount: 149.6, trend: "下降", change: -10.8, isMajor: false },
  { country: "Korea, South", amount: 136.8, trend: "下降", change: -4.1, isMajor: false },
  { country: "United Arab Emirates", amount: 114.1, trend: "下降", change: -5.8, isMajor: false },
  { country: "Germany", amount: 112.5, trend: "上升", change: 3.7, isMajor: false },
];

const FALLBACK_SUMMARY = {
  total: 9348.7,
  officialTotal: 3902.2,
  officialBills: 441.0,
  officialBondsNotes: 3461.2,
};

// 主要国家 / 地区标记
const MAJOR_HOLDERS = new Set([
  "japan", "china, mainland", "united kingdom", "belgium",
  "luxembourg", "ireland", "switzerland", "cayman islands",
  "canada", "france", "taiwan", "hong kong", "brazil",
  "india", "singapore",
]);

function isMajorHolder(country: string): boolean {
  return MAJOR_HOLDERS.has(country.toLowerCase().trim());
}

function determineTrend(change: number): string {
  if (change > 5) return "上升";
  if (change < -5) return "下降";
  return "平稳";
}

// 从 Treasury.gov 实时拉取 TIC 数据（HTML 表格解析）
async function fetchLive(): Promise<TICApiResponse> {
  const url = "https://ticdata.treasury.gov/resource-center/data-chart-center/tic/Documents/slt_table5.html";
  const resp = await fetch(url, {
    next: { revalidate: 3600 },
    headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
  });

  if (!resp.ok) {
    throw new Error(`TIC returned ${resp.status}`);
  }

  const html = await resp.text();

  // 提取所有 <td> 内容
  const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  const cells: string[] = [];
  let match;
  while ((match = tdRegex.exec(html)) !== null) {
    cells.push(match[1].trim());
  }

  // 找表头行确定列数：Country | YYYY-MM | YYYY-MM | ...
  const headerIdx = cells.findIndex((c) => c === "Country" || c === "Country\n");
  if (headerIdx < 0) {
    throw new Error("Could not find Country header in TIC data");
  }

  // 表头后面紧接着是日期列
  const dates: string[] = [];
  for (let i = headerIdx + 1; i < cells.length; i++) {
    const cell = cells[i];
    if (/^\d{4}-\d{2}$/.test(cell)) {
      dates.push(cell);
    } else {
      break;
    }
  }

  if (dates.length < 2) {
    throw new Error("Could not parse date columns from TIC data");
  }

  const latestDate = dates[0];
  const previousDate = dates[1];
  const numDateCols = dates.length;

  // 逐行解析：跳过表头行（Country + dates），从第一个数据行开始
  let dataStart = headerIdx + numDateCols + 1;
  const holdings: TICHoldingItem[] = [];
  let summaryTotal = 0;
  let summaryOfficial = 0;
  let summaryBills = 0;
  let summaryBondsNotes = 0;

  while (dataStart + 1 < cells.length) {
    const firstField = cells[dataStart];

    // 跳过空行
    if (!firstField) {
      dataStart += numDateCols + 1;
      continue;
    }

    // 汇总行
    if (firstField === "Grand Total") {
      summaryTotal = parseFloat(cells[dataStart + 1]?.replace(/,/g, "") || "0");
      dataStart += numDateCols + 1;
      continue;
    }
    if (firstField.includes("Of Which: Foreign Official")) {
      // "Of Which: Foreign Official" 可能跨行
      if (firstField.includes("Treasury Bills") || firstField.includes("T-Bills")) {
        summaryBills = parseFloat(cells[dataStart + 1]?.replace(/,/g, "") || "0");
      } else if (firstField.includes("T-Bonds") || firstField.includes("Bonds &amp; Notes")) {
        summaryBondsNotes = parseFloat(cells[dataStart + 1]?.replace(/,/g, "") || "0");
      } else {
        summaryOfficial = parseFloat(cells[dataStart + 1]?.replace(/,/g, "") || "0");
      }
      dataStart += numDateCols + 1;
      continue;
    }
    if (firstField === "All Other") {
      dataStart += numDateCols + 1;
      continue;
    }

    // Notes / 脚注行
    if (firstField.includes("Notes") || firstField.includes("data in this table") ||
        firstField.includes("Estimated foreign holdings") || firstField === "Link:") {
      break;
    }

    // 检查是否是"of which:" 行（Foreign Official 的子行）
    if (firstField.includes("of which:") || firstField.includes("Of Which:")) {
      dataStart += numDateCols + 1;
      continue;
    }

    // 数据行
    const countryName = firstField.replace(/^\d+\.?\s*/, "").trim();
    if (!countryName || countryName.length < 2) {
      dataStart += numDateCols + 1;
      continue;
    }

    const latestAmount = parseFloat(cells[dataStart + 1]?.replace(/,/g, "") || "0");
    const prevAmount = parseFloat(cells[dataStart + 2]?.replace(/,/g, "") || "0");

    if (isNaN(latestAmount) || latestAmount === 0) {
      dataStart += numDateCols + 1;
      continue;
    }

    const change = Math.round((latestAmount - prevAmount) * 10) / 10;

    holdings.push({
      country: countryName,
      amount: latestAmount,
      trend: determineTrend(change),
      change,
      isMajor: isMajorHolder(countryName),
    });

    dataStart += numDateCols + 1;
  }

  if (holdings.length === 0) {
    throw new Error("No country holdings parsed from TIC data");
  }

  holdings.sort((a, b) => b.amount - a.amount);

  return {
    success: true,
    dataDate: latestDate,
    previousDate,
    dataSource: "Treasury.gov 实时",
    holdings,
    summary: {
      total: summaryTotal,
      officialTotal: summaryOfficial,
      officialBills: summaryBills,
      officialBondsNotes: summaryBondsNotes,
    },
    updatedAt: new Date().toISOString(),
  };
}

export async function GET() {
  try {
    return NextResponse.json(await fetchLive());
  } catch (err) {
    console.warn("[TIC] Live fetch failed, using fallback:", (err as Error).message);

    return NextResponse.json({
      success: true,
      dataDate: "2026-03",
      previousDate: "2026-02",
      dataSource: "内置数据(TIC 2026-03)",
      holdings: FALLBACK_HOLDINGS,
      summary: FALLBACK_SUMMARY,
      updatedAt: new Date().toISOString(),
    } as TICApiResponse);
  }
}
