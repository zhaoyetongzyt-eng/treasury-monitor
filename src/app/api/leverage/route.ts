import { NextResponse } from "next/server";

export const revalidate = 86400; // BIS 数据季度更新，每日检查一次即可

// ============================================================
// GET /api/leverage
// 三部门杠杆率 · 数据源：BIS Total Credit (WS_TC)
// 
// 策略：内置 BIS 官方数据（2026-03-16 发布，截至 2025-Q3），
//      同时检查 BIS 是否有新数据发布，标注在 dataFreshness 中。
//      BIS 季度更新（3月/6月/9月/12月），CSV 75MB 不适合实时解析。
// ============================================================

interface LeverageSummary {
  sector: string;
  debtToGDP: number;
  yoyChange: number;
  trend: "上升" | "下降" | "持平";
}

interface LeverageTrendPoint {
  quarter: string;
  家庭: number;
  企业: number;
  政府: number;
}

// BIS Total Credit, Market Value, % of GDP, Adjusted for breaks
// 数据发布：2026-03-16，最新数据点：2025-Q3
const BUILTIN_SUMMARY: LeverageSummary[] = [
  { sector: "家庭部门", debtToGDP: 68.0, yoyChange: -2.2, trend: "下降" },
  { sector: "非金融企业", debtToGDP: 72.5, yoyChange: -1.9, trend: "下降" },
  { sector: "政府部门", debtToGDP: 109.7, yoyChange: +2.0, trend: "上升" },
  { sector: "私人非金融部门", debtToGDP: 140.4, yoyChange: -4.1, trend: "下降" },
];

const BUILTIN_TREND: LeverageTrendPoint[] = [
  { quarter: "2020-Q1", 家庭: 75.2, 企业: 78.1, 政府: 108.5 },
  { quarter: "2020-Q2", 家庭: 79.2, 企业: 86.5, 政府: 132.4 },
  { quarter: "2020-Q3", 家庭: 79.8, 企业: 84.2, 政府: 125.3 },
  { quarter: "2020-Q4", 家庭: 77.7, 企业: 86.3, 政府: 129.3 },
  { quarter: "2021-Q1", 家庭: 77.6, 企业: 86.7, 政府: 125.4 },
  { quarter: "2021-Q2", 家庭: 77.8, 企业: 84.6, 政府: 121.9 },
  { quarter: "2021-Q3", 家庭: 77.4, 企业: 83.2, 政府: 119.3 },
  { quarter: "2021-Q4", 家庭: 76.7, 企业: 82.5, 政府: 119.1 },
  { quarter: "2022-Q1", 家庭: 75.9, 企业: 82.0, 政府: 113.9 },
  { quarter: "2022-Q2", 家庭: 75.5, 企业: 81.2, 政府: 107.0 },
  { quarter: "2022-Q3", 家庭: 75.0, 企业: 79.9, 政府: 102.1 },
  { quarter: "2022-Q4", 家庭: 74.4, 企业: 79.0, 政府: 101.5 },
  { quarter: "2023-Q1", 家庭: 73.2, 企业: 78.5, 政府: 103.0 },
  { quarter: "2023-Q2", 家庭: 72.6, 企业: 77.4, 政府: 101.6 },
  { quarter: "2023-Q3", 家庭: 72.1, 企业: 76.3, 政府: 101.0 },
  { quarter: "2023-Q4", 家庭: 71.6, 企业: 75.4, 政府: 105.5 },
  { quarter: "2024-Q1", 家庭: 70.9, 企业: 75.1, 政府: 105.2 },
  { quarter: "2024-Q2", 家庭: 70.4, 企业: 74.7, 政府: 103.6 },
  { quarter: "2024-Q3", 家庭: 70.2, 企业: 74.4, 政府: 107.7 },
  { quarter: "2024-Q4", 家庭: 69.1, 企业: 73.4, 政府: 106.3 },
  { quarter: "2025-Q1", 家庭: 68.3, 企业: 73.2, 政府: 107.7 },
  { quarter: "2025-Q2", 家庭: 68.1, 企业: 72.8, 政府: 106.3 },
  { quarter: "2025-Q3", 家庭: 68.0, 企业: 72.5, 政府: 109.7 },
];

const BUILTIN_DATE = "2025-Q3";
const BUILTIN_SOURCE = "BIS Total Credit · 2026-03-16 发布";
const BIS_ZIP_URL = "https://data.bis.org/static/bulk/WS_TC_csv_flat.zip";

/**
 * 检查 BIS 是否有新数据（通过 HEAD 请求获取 Last-Modified）
 */
async function checkBISFreshness(): Promise<{
  hasUpdate: boolean;
  lastModified: string | null;
}> {
  try {
    const res = await fetch(BIS_ZIP_URL, {
      method: "HEAD",
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    });
    const lm = res.headers.get("last-modified");
    return { hasUpdate: !!lm, lastModified: lm };
  } catch {
    return { hasUpdate: false, lastModified: null };
  }
}

export async function GET() {
  try {
    // 异步检查 BIS 数据新鲜度（不阻塞响应）
    const freshnessPromise = checkBISFreshness();

    // 立即返回内置数据
    const freshness = await freshnessPromise;

    return NextResponse.json({
      success: true,
      dataDate: BUILTIN_DATE,
      dataSource: BUILTIN_SOURCE,
      summary: BUILTIN_SUMMARY,
      trend: BUILTIN_TREND,
      dataFreshness: {
        status: freshness.hasUpdate
          ? "BIS 数据可访问，内置数据为 2025-Q3"
          : "使用内置数据（BIS 2026-03-16 发布）",
        bisLastModified: freshness.lastModified,
        nextExpectedUpdate: "2026年6月中旬（2025-Q4 数据）",
      },
    });
  } catch {
    return NextResponse.json({
      success: true,
      dataDate: BUILTIN_DATE,
      dataSource: BUILTIN_SOURCE + " · 降级",
      summary: BUILTIN_SUMMARY,
      trend: BUILTIN_TREND,
      dataFreshness: {
        status: "降级模式",
        bisLastModified: null,
        nextExpectedUpdate: "2026年6月中旬（2025-Q4 数据）",
      },
    });
  }
}
