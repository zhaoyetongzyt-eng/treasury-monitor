import { NextResponse } from "next/server";

// ============================================================
// CFTC 期货持仓 API
// 数据源：CFTC Traders in Financial Futures, Futures Only
// FinFutWk.txt 包含两段：
//   - Futures Only（正确列布局：8=OI, 9-11=Dealer, 12-14=AM, 15-17=LF, 18-20=Other）
//   - TFF OLD FORMAT（不同列布局，必须跳过）
// 本路由正确过滤旧格式段，并以内置 fallback 兜底。
// ============================================================

// TFF Futures Only 字段索引（1-based）
// 1:合约名称, 2:报告日期(YYMMDD), 3:报告日期(YYYY-MM-DD)
// 4:CFTC合约代码, 5:交易所, 6:地区代码, 7:商品代码
// 8:总持仓
// 9-11:  Dealer Intermediary Long/Short/Spreading
// 12-14: Asset Manager Institutional Long/Short/Spreading
// 15-17: Leveraged Funds Long/Short/Spreading
// 18-20: Other Reportables Long/Short/Spreading

interface RawTFFRecord {
  name: string;
  reportDate: string;
  oi: number;
  dealerLong: number;
  dealerShort: number;
  dealerSpread: number;
  amLong: number;
  amShort: number;
  amSpread: number;
  lfLong: number;
  lfShort: number;
  lfSpread: number;
  otherLong: number;
  otherShort: number;
  otherSpread: number;
}

interface CFTCPositionItem {
  category: string;
  segment: string;
  netPosition: string;
  netContracts: number;
  percentile: number;
  remark: string;
}

interface CFTCApiResponse {
  success: boolean;
  dataDate: string;
  dataSource: string;
  positions: CFTCPositionItem[];
  raw: {
    contracts: {
      name: string;
      tenor: string;
      oi: number;
      amNet: number;
      lfNet: number;
      dealerNet: number;
      otherNet: number;
    }[];
  };
  updatedAt: string;
  error?: string;
}

// ===== 内置最新数据（fallback，每周手动更新）=====
// 数据日期: 2026-05-19 (CFTC 周报, Positions as of 2026-05-19)
// 来源：CFTC FinFutWk.txt Futures Only 段，净头寸 = Long - Short，不含 Spreading
// 长端 = 10Y Note + Ultra 10Y + UST Bond + Ultra UST Bond 合计
// 前端 = 2Y Note + 5Y Note 合计
const FALLBACK_RAW_CONTRACTS = [
  {
    name: "UST 2Y NOTE",
    tenor: "2Y",
    oi: 4938650,
    // AM Long=2,796,776  Short=656,100  → Net +2,140,676
    amNet: 2140676,
    // LF Long=417,004  Short=2,295,636  → Net -1,878,632
    lfNet: -1878632,
    // Dealer Long=136,019  Short=560,193  → Net -424,174
    dealerNet: -424174,
    // Other Long=478,514  Short=225,327  → Net +253,187
    otherNet: 253187,
  },
  {
    name: "UST 5Y NOTE",
    tenor: "5Y",
    oi: 6977994,
    // AM Long=3,988,576  Short=1,116,124  → Net +2,872,452
    amNet: 2872452,
    // LF Long=546,941  Short=2,853,388  → Net -2,306,447
    lfNet: -2306447,
    dealerNet: -567066,
    otherNet: 377007,
  },
  {
    name: "UST 10Y NOTE",
    tenor: "10Y",
    oi: 5833268,
    // AM Long=3,191,475  Short=924,224  → Net +2,267,251
    amNet: 2267251,
    // LF Long=413,821  Short=2,366,558  → Net -1,952,737
    lfNet: -1952737,
    dealerNet: -489043,
    otherNet: 328071,
  },
  {
    name: "ULTRA UST 10Y",
    tenor: "Ultra 10Y",
    oi: 2615042,
    // AM Long=1,257,556  Short=655,076  → Net +602,480
    amNet: 602480,
    // LF Long=182,813  Short=458,963  → Net -276,150
    lfNet: -276150,
    dealerNet: -232233,
    otherNet: -46672,
  },
  {
    name: "UST BOND",
    tenor: "Bond",
    oi: 1879052,
    // AM Long=1,079,268  Short=584,170  → Net +495,098
    amNet: 495098,
    // LF Long=122,422  Short=448,805  → Net -326,383
    lfNet: -326383,
    dealerNet: -225702,
    otherNet: -56256,
  },
  {
    name: "ULTRA UST BOND",
    tenor: "Ultra Bond",
    oi: 2534806,
    // AM Long=1,602,662  Short=523,293  → Net +1,079,369
    amNet: 1079369,
    // LF Long=75,517  Short=961,580  → Net -886,063
    lfNet: -886063,
    dealerNet: -196692,
    otherNet: 73524,
  },
];

// 汇总验证（注释保留用于下次更新验证）：
// AM 长端 = 2,267,251 + 602,480 + 495,098 + 1,079,369 = +4,444,198 ✓
// AM 前端 = 2,140,676 + 2,872,452 = +5,013,128 ✓
// LF 长端 = -1,952,737 + -276,150 + -326,383 + -886,063 = -3,441,333 ✓
// LF 前端 = -1,878,632 + -2,306,447 = -4,185,079 ✓

// Treasury contract identification patterns（仅匹配 CBT 国债期货）
const TREASURY_PATTERNS = [
  /2.?YR/i, /2.?YEAR/i,
  /5.?YR/i, /5.?YEAR/i,
  /10.?YR/i, /10.?YEAR/i,
  /ULTRA.?10/i,
  /ULTRA.?UST/i,
  /UST.?BOND/i,
  /UST/i,
  /TREASURY/i,
];

function isTreasuryContract(name: string): boolean {
  const upper = name.toUpperCase();
  if (!upper.includes("CBT") && !upper.includes("BOARD OF TRADE")) return false;
  return TREASURY_PATTERNS.some((p) => p.test(name));
}

function determineTenor(name: string): string {
  const u = name.toUpperCase();
  if (/2.?YR|2.?YEAR/.test(u)) return "2Y";
  if (/5.?YR|5.?YEAR/.test(u)) return "5Y";
  if (/ULTRA.?10/.test(u)) return "Ultra 10Y";
  if (/10.?YR|10.?YEAR|MICRO.?10/.test(u)) return "10Y";
  if (/ULTRA.*BOND/.test(u)) return "Ultra Bond";
  if (/BOND/.test(u)) return "Bond";
  return "其他";
}

function csvSplit(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === "," && !inQuote) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseNumber(s: string): number {
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

function determineSegment(tenor: string): string {
  if (tenor === "2Y" || tenor === "5Y") return "前端(2Y/5Y)";
  return "长端(10Y/30Y)";
}

/** 自定义历史分位估算（非 CFTC 官方字段）
 *  基于当前净头寸/总持仓的绝对值，用分段线性映射到 1-99。
 *  这是启发式近似值，非严格的历史滚动分位。 */
function estimatePercentile(rawContracts: ReturnType<typeof buildRawContracts>): Map<string, Record<string, number>> {
  const ratios: { key: string; ratio: number }[] = [];

  for (const c of rawContracts) {
    ratios.push({
      key: `AssetManager_${determineSegment(c.tenor)}`,
      ratio: c.amNet / c.oi,
    });
  }

  for (const c of rawContracts) {
    ratios.push({
      key: `LeveragedFunds_${determineSegment(c.tenor)}`,
      ratio: -c.lfNet / c.oi,
    });
  }

  const result = new Map<string, Record<string, number>>();

  for (const r of ratios) {
    const absRatio = Math.abs(r.ratio);
    let pct: number;
    if (absRatio > 0.3) pct = 90 + Math.min(10, (absRatio - 0.3) * 50);
    else if (absRatio > 0.2) pct = 75 + (absRatio - 0.2) * 150;
    else if (absRatio > 0.1) pct = 50 + (absRatio - 0.1) * 250;
    else pct = 10 + absRatio * 400;
    pct = Math.min(99, Math.max(1, Math.round(pct)));

    if (!result.has(r.key)) result.set(r.key, {});
    result.get(r.key)!["percentile"] = pct;
  }

  return result;
}

function buildRawContracts(contracts: RawTFFRecord[]) {
  return contracts.map((c) => ({
    name: c.name,
    tenor: determineTenor(c.name),
    oi: c.oi,
    amNet: c.amLong - c.amShort,
    lfNet: c.lfLong - c.lfShort,
    dealerNet: c.dealerLong - c.dealerShort,
    otherNet: c.otherLong - c.otherShort,
  }));
}

function buildResponse(rawContracts: ReturnType<typeof buildRawContracts>, dataDate: string, dataSource: string) {
  const percentiles = estimatePercentile(rawContracts);

  const positions: CFTCPositionItem[] = [];

  const amFront = rawContracts.filter((c) => determineSegment(c.tenor) === "前端(2Y/5Y)");
  const amBack = rawContracts.filter((c) => determineSegment(c.tenor) === "长端(10Y/30Y)");

  const amFrontNet = amFront.reduce((s, c) => s + c.amNet, 0);
  const amBackNet = amBack.reduce((s, c) => s + c.amNet, 0);

  positions.push({
    category: "资产管理人",
    segment: "长端(10Y/30Y)",
    netPosition: amBackNet > 0 ? "净多头" : "净空头",
    netContracts: amBackNet,
    percentile: percentiles.get(`AssetManager_长端(10Y/30Y)`)?.percentile ?? 50,
    remark: "",
  });
  positions.push({
    category: "资产管理人",
    segment: "前端(2Y/5Y)",
    netPosition: amFrontNet > 0 ? "净多头" : "净空头",
    netContracts: amFrontNet,
    percentile: percentiles.get(`AssetManager_前端(2Y/5Y)`)?.percentile ?? 50,
    remark: "",
  });

  const lfFrontNet = amFront.reduce((s, c) => s + c.lfNet, 0);
  const lfBackNet = amBack.reduce((s, c) => s + c.lfNet, 0);

  positions.push({
    category: "杠杆基金",
    segment: "长端(10Y/30Y)",
    netPosition: lfBackNet > 0 ? "净多头" : "净空头",
    netContracts: lfBackNet,
    percentile: percentiles.get(`LeveragedFunds_长端(10Y/30Y)`)?.percentile ?? 50,
    remark: lfBackNet < -200000 ? "接近极值" : "",
  });
  positions.push({
    category: "杠杆基金",
    segment: "前端(2Y/5Y)",
    netPosition: lfFrontNet > 0 ? "净多头" : "净空头",
    netContracts: lfFrontNet,
    percentile: percentiles.get(`LeveragedFunds_前端(2Y/5Y)`)?.percentile ?? 50,
    remark: lfFrontNet < -300000 ? "接近极值" : "",
  });

  // Dealer/Intermediary（全期限汇总）
  // 注意：CFTC Dealer Intermediary ≠ "基差交易/做市商"，仅为期货中介分类
  const dealerNet = rawContracts.reduce((s, c) => s + c.dealerNet, 0);

  positions.push({
    category: "Dealer/Intermediary",
    segment: "全期限",
    netPosition: dealerNet > 0 ? "净多头" : "净空头",
    netContracts: dealerNet,
    percentile: 50,
    remark: Math.abs(dealerNet) > 500000 ? "规模庞大·需关注" : "非基差交易直接映射",
  });

  return {
    success: true,
    dataDate,
    dataSource,
    positions,
    raw: {
      contracts: rawContracts.sort(
        (a, b) => ["2Y", "5Y", "10Y", "Ultra 10Y", "Bond", "Ultra Bond"].indexOf(a.tenor) -
                   ["2Y", "5Y", "10Y", "Ultra 10Y", "Bond", "Ultra Bond"].indexOf(b.tenor)
      ),
    },
    updatedAt: new Date().toISOString(),
  } as CFTCApiResponse;
}

// ============================================================
// 从 CFTC 实时拉取
// ============================================================
async function fetchLive(): Promise<CFTCApiResponse> {
  const url = "https://www.cftc.gov/dea/newcot/FinFutWk.txt";
  const resp = await fetch(url, {
    next: { revalidate: 3600 },
    headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
  });

  if (!resp.ok) {
    throw new Error(`CFTC returned ${resp.status}`);
  }

  const text = await resp.text();
  const lines = text.split("\n");

  const contracts: RawTFFRecord[] = [];

  // 状态机：检测 OLD FORMAT 分段并跳过
  // FinFutWk.txt 结构：
  //   [Futures Only 段头] → 正确列布局
  //   ... 数据行 ...
  //   [TFF OLD FORMAT 段头] → 不同列布局，跳过
  let inOldFormat = false;

  for (const line of lines) {
    // 检测 OLD FORMAT 段头
    if (/OLD\s*FORMAT/i.test(line)) {
      inOldFormat = true;
      continue;
    }
    if (inOldFormat) continue;

    // 仅解析 CBT 交易所的国债期货合约
    if (!line.includes("CHICAGO BOARD OF TRADE") && !line.includes("CBT")) continue;

    const name = line.match(/"([^"]+)"/)?.[1] || "";
    if (!isTreasuryContract(name)) continue;

    const fields = csvSplit(line);

    contracts.push({
      name: name.replace(/\s*-\s*CHICAGO BOARD OF TRADE/i, "").trim(),
      reportDate: fields[2] || "",
      oi: parseNumber(fields[7]),
      dealerLong: parseNumber(fields[8]),
      dealerShort: parseNumber(fields[9]),
      dealerSpread: parseNumber(fields[10]),
      amLong: parseNumber(fields[11]),
      amShort: parseNumber(fields[12]),
      amSpread: parseNumber(fields[13]),
      lfLong: parseNumber(fields[14]),
      lfShort: parseNumber(fields[15]),
      lfSpread: parseNumber(fields[16]),
      otherLong: parseNumber(fields[17]),
      otherShort: parseNumber(fields[18]),
      otherSpread: parseNumber(fields[19]),
    });
  }

  if (contracts.length === 0) {
    throw new Error("No Treasury contracts found");
  }

  const rawContracts = buildRawContracts(contracts);
  const dataDate = contracts[0]?.reportDate || "unknown";

  return buildResponse(rawContracts, dataDate, "CFTC 周频·实时拉取");
}

export async function GET() {
  try {
    return NextResponse.json(await fetchLive());
  } catch (err) {
    console.warn("[CFTC] Live fetch failed, using fallback:", (err as Error).message);

    return NextResponse.json(buildResponse(FALLBACK_RAW_CONTRACTS, "2026-05-19", "内置数据(CFTC 2026-05-19)"));
  }
}
