import { NextResponse } from "next/server";

// TFF 报告字段索引（1-based，逗号分隔 CSV）
// 1:合约名称, 2:报告日期(YYMMDD), 3:报告日期(YYYY-MM-DD)
// 4:CFTC合约代码, 5:交易所, 6:地区代码, 7:商品代码
// 8:总持仓
// 9-11:  Dealer Long/Short/Spreading
// 12-14: Asset Manager Long/Short/Spreading
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

// ===== 内置最新数据（fallback）=====
// 数据日期: 2026-05-19 (CFTC 周报)
// 如实时拉取失败则使用此数据
const FALLBACK_RAW_CONTRACTS = [
  {
    name: "UST 2Y NOTE",
    tenor: "2Y",
    oi: 4938650,
    amNet: 2796776 - 656100,       // 2,140,676
    lfNet: 417004 - 2295636,       // -1,878,632
    dealerNet: 136019 - 560193,    // -424,174
    otherNet: 478514 - 225327,     // 253,187
  },
  {
    name: "UST 5Y NOTE",
    tenor: "5Y",
    oi: 6977994,
    amNet: 3988576 - 1116124,      // 2,872,452
    lfNet: 546941 - 2853388,       // -2,306,447
    dealerNet: 111364 - 678430,    // -567,066
    otherNet: 562954 - 185947,     // 377,007
  },
  {
    name: "UST 10Y NOTE",
    tenor: "10Y",
    oi: 5833268,
    amNet: 3191475 - 924224,       // 2,267,251
    lfNet: 413821 - 2366558,       // -1,952,737
    dealerNet: 163775 - 652818,    // -489,043
    otherNet: 487561 - 159490,     // 328,071
  },
  {
    name: "ULTRA UST 10Y",
    tenor: "Ultra 10Y",
    oi: 2615042,
    amNet: 1257556 - 655076,       // 602,480
    lfNet: 182813 - 458963,        // -276,150
    dealerNet: 79058 - 311291,     // -232,233
    otherNet: 73347 - 120019,      // -46,672
  },
  {
    name: "UST BOND",
    tenor: "Bond",
    oi: 1879052,
    amNet: 1079268 - 584170,       // 495,098
    lfNet: 122422 - 448805,        // -326,383
    dealerNet: 24125 - 249827,     // -225,702
    otherNet: 41854 - 98110,       // -56,256
  },
  {
    name: "ULTRA UST BOND",
    tenor: "Ultra Bond",
    oi: 2534806,
    amNet: 1602662 - 523293,       // 1,079,369
    lfNet: 75517 - 961580,         // -886,063
    dealerNet: 26281 - 222973,     // -196,692
    otherNet: 120128 - 46604,      // 73,524
  },
];

// Treasury contract identification patterns
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

  const dealerNet = rawContracts.reduce((s, c) => s + c.dealerNet, 0);
  const otherNet = rawContracts.reduce((s, c) => s + c.otherNet, 0);

  positions.push({
    category: "基差交易/做市商",
    segment: "现券-期货",
    netPosition: dealerNet > 0 ? "净多头" : "净空头",
    netContracts: dealerNet + otherNet,
    percentile: 75,
    remark: Math.abs(dealerNet + otherNet) > 500000 ? "规模庞大·需关注" : "",
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

// 从 CFTC 实时拉取
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
  const lines = text.split("\n").filter((l) => l.trim());

  const contracts: RawTFFRecord[] = [];

  for (const line of lines) {
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
  // fields[2] 已是 YYYY-MM-DD 格式，直接使用，不再做 YYMMDD→YYYY-MM-DD 转换
  const dataDate = contracts[0]?.reportDate || "unknown";

  return buildResponse(rawContracts, dataDate, "CFTC 实时");
}

export async function GET() {
  try {
    return NextResponse.json(await fetchLive());
  } catch (err) {
    console.warn("[CFTC] Live fetch failed, using fallback:", (err as Error).message);

    // 使用内置最新数据
    return NextResponse.json(buildResponse(FALLBACK_RAW_CONTRACTS, "2026-05-19", "内置数据(CFTC 2026-05-19)"));
  }
}
