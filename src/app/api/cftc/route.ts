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
// 数据日期: 2026-05-26 (CFTC 周报, Positions as of 2026-05-26)
// 来源：CFTC FinFutWk.txt Futures Only 段，净头寸 = Long - Short，不含 Spreading
// 长端 = 10Y Note + Ultra 10Y + UST Bond + Ultra UST Bond 合计
// 前端 = 2Y Note + 5Y Note 合计
const FALLBACK_RAW_CONTRACTS = [
  {
    name: "UST 2Y NOTE",
    tenor: "2Y",
    oi: 4960871,
    // AM Long=2,616,897  Short=625,592  → Net +1,991,305
    amNet: 1991305,
    // LF Long=365,442  Short=2,137,999  → Net -1,772,557
    lfNet: -1772557,
    // Dealer Long=146,868  Short=526,285  → Net -379,417
    dealerNet: -379417,
    // Other Long=312,399  Short=206,303  → Net +106,096
    otherNet: 106096,
  },
  {
    name: "UST 5Y NOTE",
    tenor: "5Y",
    oi: 6847723,
    // AM Long=3,831,544  Short=1,123,717  → Net +2,707,827
    amNet: 2707827,
    // LF Long=454,592  Short=2,525,945  → Net -2,071,353
    lfNet: -2071353,
    // Dealer Long=81,991  Short=778,447  → Net -696,456
    dealerNet: -696456,
    // Other Long=204,237  Short=208,537  → Net -4,300
    otherNet: -4300,
  },
  {
    name: "UST 10Y NOTE",
    tenor: "10Y",
    oi: 6254472,
    // AM Long=2,960,165  Short=889,822  → Net +2,070,343
    amNet: 2070343,
    // LF Long=405,403  Short=2,411,383  → Net -2,005,980
    lfNet: -2005980,
    // Dealer Long=181,479  Short=640,445  → Net -458,966
    dealerNet: -458966,
    // Other Long=283,168  Short=180,334  → Net +102,834
    otherNet: 102834,
  },
  {
    name: "ULTRA UST 10Y",
    tenor: "Ultra 10Y",
    oi: 2733278,
    // AM Long=1,218,366  Short=622,270  → Net +596,096
    amNet: 596096,
    // LF Long=154,813  Short=394,539  → Net -239,726
    lfNet: -239726,
    // Dealer Long=59,141  Short=317,237  → Net -258,096
    dealerNet: -258096,
    // Other Long=143,579  Short=123,020  → Net +20,559
    otherNet: 20559,
  },
  {
    name: "UST BOND",
    tenor: "Bond",
    oi: 2004616,
    // AM Long=1,065,732  Short=595,133  → Net +470,599
    amNet: 470599,
    // LF Long=124,095  Short=444,841  → Net -320,746
    lfNet: -320746,
    // Dealer Long=19,782  Short=240,995  → Net -221,213
    dealerNet: -221213,
    // Other Long=93,675  Short=105,667  → Net -11,992
    otherNet: -11992,
  },
  {
    name: "ULTRA UST BOND",
    tenor: "Ultra Bond",
    oi: 2533780,
    // AM Long=1,597,085  Short=530,827  → Net +1,066,258
    amNet: 1066258,
    // LF Long=83,709  Short=954,722  → Net -871,013
    lfNet: -871013,
    // Dealer Long=26,747  Short=218,757  → Net -192,010
    dealerNet: -192010,
    // Other Long=45,129  Short=36,252  → Net +8,877
    otherNet: 8877,
  },
];

// 汇总验证（注释保留用于下次更新验证）：
// AM 长端 = 2,070,343 + 596,096 + 470,599 + 1,066,258 = +4,203,296 ✓
// AM 前端 = 1,991,305 + 2,707,827 = +4,699,132 ✓
// LF 长端 = -2,005,980 + -239,726 + -320,746 + -871,013 = -3,437,465 ✓
// LF 前端 = -1,772,557 + -2,071,353 = -3,843,910 ✓

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
    remark: "",
  });
  positions.push({
    category: "资产管理人",
    segment: "前端(2Y/5Y)",
    netPosition: amFrontNet > 0 ? "净多头" : "净空头",
    netContracts: amFrontNet,
    remark: "",
  });

  const lfFrontNet = amFront.reduce((s, c) => s + c.lfNet, 0);
  const lfBackNet = amBack.reduce((s, c) => s + c.lfNet, 0);

  positions.push({
    category: "杠杆基金",
    segment: "长端(10Y/30Y)",
    netPosition: lfBackNet > 0 ? "净多头" : "净空头",
    netContracts: lfBackNet,
    remark: lfBackNet < -200000 ? "接近极值" : "",
  });
  positions.push({
    category: "杠杆基金",
    segment: "前端(2Y/5Y)",
    netPosition: lfFrontNet > 0 ? "净多头" : "净空头",
    netContracts: lfFrontNet,
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

    return NextResponse.json(buildResponse(FALLBACK_RAW_CONTRACTS, "2026-05-26", "内置数据(CFTC 2026-05-26)"));
  }
}
