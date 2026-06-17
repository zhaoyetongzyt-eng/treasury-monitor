import { NextResponse } from "next/server";

// ============================================================
// 国债拍卖数据 API
// 数据源：TreasuryDirect TA_WS (Web Service)
// - /securities/auctioned → 已完成拍卖
// - /securities/announced → 即将拍卖
// 返回最近已出结果的拍卖 + 自动评级 + 发行结构概要
//
// 注：原 FiscalData API (api.fiscaldata.treasury.gov) 已宕机，
//     已切换为 TreasuryDirect TA_WS，数据字段一致、无需认证。
// ============================================================

const TD_BASE = "https://www.treasurydirect.gov/TA_WS/securities";

/** 标的品种中文映射 */
const SECURITY_TERM_MAP: Record<string, string> = {
  // Bills
  "4-Week": "4周国库券",
  "8-Week": "8周国库券",
  "13-Week": "13周国库券",
  "17-Week": "17周国库券",
  "26-Week": "26周国库券",
  "52-Week": "52周国库券",
  "6-Week": "6周国库券",
  "27-Day": "27天国库券",
  "42-Day": "42天国库券",
  "CMB": "现金管理票据",
  // Notes (standard)
  "2-Year": "2年期国债",
  "3-Year": "3年期国债",
  "5-Year": "5年期国债",
  "7-Year": "7年期国债",
  "10-Year": "10年期国债",
  // Notes reopenings
  "1-Year 11-Month": "约2年期国债(再开)",
  "1-Year 10-Month": "约2年期国债(再开)",
  "9-Year 11-Month": "约10年期国债(再开)",
  "9-Year 10-Month": "约10年期国债(再开)",
  "9-Year 9-Month": "约10年期国债(再开)",
  "9-Year 8-Month": "约10年期国债(再开)",
  "9-Year 7-Month": "约10年期国债(再开)",
  "9-Year 6-Month": "约10年期国债(再开)",
  "9-Year 5-Month": "约10年期国债(再开)",
  "9-Year 4-Month": "约10年期国债(再开)",
  // Bonds (standard)
  "20-Year": "20年期国债",
  "30-Year": "30年期国债",
  // Bonds reopenings
  "29-Year 11-Month": "约30年期国债(再开)",
  "29-Year 10-Month": "约30年期国债(再开)",
  "29-Year 9-Month": "约30年期国债(再开)",
  "29-Year 8-Month": "约30年期国债(再开)",
  "29-Year 7-Month": "约30年期国债(再开)",
  "29-Year 6-Month": "约30年期国债(再开)",
  "29-Year 5-Month": "约30年期国债(再开)",
  "19-Year 11-Month": "约20年期国债(再开)",
  "19-Year 10-Month": "约20年期国债(再开)",
  "19-Year 9-Month": "约20年期国债(再开)",
  "19-Year 8-Month": "约20年期国债(再开)",
  "19-Year 7-Month": "约20年期国债(再开)",
  "19-Year 6-Month": "约20年期国债(再开)",
  "19-Year 5-Month": "约20年期国债(再开)",
};

/** 自动评级：基于投标倍数 */
function autoRating(bidToCover: number): string {
  if (bidToCover >= 2.6) return "强劲";
  if (bidToCover >= 2.4) return "稳健";
  if (bidToCover >= 2.1) return "中性";
  if (bidToCover >= 1.9) return "中性偏弱";
  if (bidToCover >= 1.7) return "偏软";
  return "疲弱·尾部";
}

/** TreasuryDirect 原始数据结构（已竞拍） */
interface TdAuctionedItem {
  securityType: string;
  securityTerm: string;
  offeringAmount: string;
  highYield: string;
  highDiscountRate: string;
  highInvestmentRate: string;
  averageMedianYield: string;
  bidToCoverRatio: string;
  auctionDate: string;
  issueDate: string;
  maturityDate: string;
  totalAccepted: string;
}

/** TreasuryDirect 原始数据结构（已公告未竞拍） */
interface TdAnnouncedItem {
  securityType: string;
  securityTerm: string;
  offeringAmount: string;
  auctionDate: string;
  issueDate: string;
  maturityDate: string;
}

/** 标准期限排序权重（短→长；Reopening 与对应标准期限同权） */
const TERM_ORDER: Record<string, number> = {
  "27天国库券": 1, "42天国库券": 1, "现金管理票据": 1,
  "4周国库券": 2, "6周国库券": 2, "8周国库券": 3,
  "13周国库券": 4, "17周国库券": 5, "26周国库券": 6,
  "52周国库券": 7,
  "2年期国债": 8, "约2年期国债(再开)": 8,
  "3年期国债": 9,
  "5年期国债": 10,
  "7年期国债": 11,
  "10年期国债": 12, "约10年期国债(再开)": 12,
  "约20年期国债(再开)": 13, "20年期国债": 13,
  "30年期国债": 14, "约30年期国债(再开)": 14,
};

export async function GET() {
  try {
    const today = new Date().toISOString().slice(0, 10); // "2026-06-10"

    // ============================================================
    // 并行拉取：已竞拍 + 已公告
    // ============================================================
    const [auctionedRes, announcedRes] = await Promise.all([
      fetch(`${TD_BASE}/auctioned`, {
        next: { revalidate: 600 },
        headers: { "User-Agent": "TreasuryMonitor/1.0" },
      }),
      fetch(`${TD_BASE}/announced`, {
        next: { revalidate: 600 },
        headers: { "User-Agent": "TreasuryMonitor/1.0" },
      }),
    ]);

    // ---- 已竞拍数据 ----
    let auctionedData: TdAuctionedItem[] = [];
    if (auctionedRes.ok) {
      auctionedData = await auctionedRes.json();
    }

    // ---- 已公告数据 ----
    let announcedData: TdAnnouncedItem[] = [];
    if (announcedRes.ok) {
      announcedData = await announcedRes.json();
    }

    // ============================================================
    // 1. 已完成拍卖（2026-01-01 起）
    // ============================================================
    const completed = auctionedData.filter((r) => {
      const type = r.securityType?.trim();
      if (type !== "Bill" && type !== "Note" && type !== "Bond") return false;
      if (!SECURITY_TERM_MAP[r.securityTerm]) return false;

      const btc = Number(r.bidToCoverRatio);
      if (isNaN(btc) || btc <= 0) return false;

      const auctionDate = (r.auctionDate || "").slice(0, 10);
      if (!auctionDate || auctionDate < "2026-01-01") return false;

      if (type === "Bill") {
        const invRate = Number(r.highInvestmentRate);
        const discRate = Number(r.highDiscountRate);
        if ((isNaN(invRate) || invRate <= 0) && (isNaN(discRate) || discRate <= 0)) return false;
      } else {
        const hy = Number(r.highYield);
        if (isNaN(hy) || hy <= 0) return false;
      }
      return true;
    });

    // ── 按品种计算 YTD 平均投标倍数（去重前，用全部拍卖）──
    const termYtdSums: Record<string, { sum: number; count: number }> = {};
    for (const r of completed) {
      const term = SECURITY_TERM_MAP[r.securityTerm];
      const btc = Number(r.bidToCoverRatio);
      if (!termYtdSums[term]) termYtdSums[term] = { sum: 0, count: 0 };
      termYtdSums[term].sum += btc;
      termYtdSums[term].count += 1;
    }
    const termAvgBidToCover: Record<string, number> = {};
    for (const [term, acc] of Object.entries(termYtdSums)) {
      termAvgBidToCover[term] = Math.round((acc.sum / acc.count) * 100) / 100;
    }

    // 去重：每个品种只保留最新的一场
    const seenCompleted = new Set<string>();
    const uniqueCompleted: TdAuctionedItem[] = [];
    for (const r of completed) {
      const term = SECURITY_TERM_MAP[r.securityTerm];
      if (!seenCompleted.has(term)) {
        seenCompleted.add(term);
        uniqueCompleted.push(r);
      }
    }

    const auctions = uniqueCompleted.map((r) => {
      const term = SECURITY_TERM_MAP[r.securityTerm];
      const offeringAmt = Number(r.offeringAmount) / 1_000_000_000;

      let yield_ = 0;
      if (r.securityType === "Bill") {
        const invRate = Number(r.highInvestmentRate);
        const discRate = Number(r.highDiscountRate);
        yield_ = !isNaN(invRate) && invRate > 0 ? invRate : !isNaN(discRate) ? discRate : 0;
      } else {
        const hy = Number(r.highYield);
        const amy = Number(r.averageMedianYield);
        yield_ = !isNaN(hy) && hy > 0 ? hy : !isNaN(amy) && amy > 0 ? amy : 0;
      }

      const btc = Number(r.bidToCoverRatio);
      const auctionDate = (r.auctionDate || "").slice(0, 10);

      return {
        securityType: r.securityType,
        securityTerm: term,
        offeringAmount: Math.round(offeringAmt * 10) / 10,
        highYield: Math.round(yield_ * 1000) / 1000,
        bidToCover: Math.round(btc * 100) / 100,
        rating: autoRating(btc),
        auctionDate,
        issueDate: (r.issueDate || "").slice(0, 10),
        maturityDate: (r.maturityDate || "").slice(0, 10),
        isLatest: false,
      };
    });

    // 按品种分组标记最新日期
    const bills = auctions.filter((a) => a.securityType === "Bill");
    const notesBonds = auctions.filter((a) => a.securityType === "Note" || a.securityType === "Bond");

    const markLatest = (group: typeof auctions) => {
      const latestDate = group.map((a) => a.auctionDate).filter(Boolean).sort().reverse()[0] || null;
      if (latestDate) {
        for (const a of group) {
          if (a.auctionDate === latestDate) a.isLatest = true;
        }
      }
    };

    markLatest(bills);
    markLatest(notesBonds);

    const sortGroup = (group: typeof auctions) => {
      group.sort((a, b) => {
        if (a.isLatest && !b.isLatest) return -1;
        if (!a.isLatest && b.isLatest) return 1;
        return (TERM_ORDER[a.securityTerm] ?? 99) - (TERM_ORDER[b.securityTerm] ?? 99);
      });
    };

    sortGroup(bills);
    sortGroup(notesBonds);

    auctions.length = 0;
    auctions.push(...bills, ...notesBonds);

    const issuance = {
      totalAuctioned: auctions.reduce((s, a) => s + a.offeringAmount, 0),
      recordCount: auctions.length,
      avgBidToCover:
        auctions.length > 0
          ? Math.round((auctions.reduce((s, a) => s + a.bidToCover, 0) / auctions.length) * 100) / 100
          : 0,
      dataFreshness: auctions.map((a) => a.auctionDate).filter(Boolean).sort().reverse()[0] || null,
      termAvgBidToCover,
    };

    // ============================================================
    // 2. 即将拍卖（auctionDate >= today，且未在 auctioned 中出现）
    // ============================================================
    const upcoming = announcedData
      .filter((r) => {
        const type = r.securityType?.trim();
        if (type !== "Bill" && type !== "Note" && type !== "Bond") return false;
        if (!SECURITY_TERM_MAP[r.securityTerm]) return false;
        const ad = (r.auctionDate || "").slice(0, 10);
        if (!ad || ad < today) return false;
        return true;
      })
      .map((r) => {
        const offeringAmt = Number(r.offeringAmount) / 1_000_000_000;
        return {
          securityType: r.securityType,
          securityTerm: SECURITY_TERM_MAP[r.securityTerm],
          offeringAmount: Math.round(offeringAmt * 10) / 10,
          auctionDate: (r.auctionDate || "").slice(0, 10),
          issueDate: (r.issueDate || "").slice(0, 10),
          maturityDate: (r.maturityDate || "").slice(0, 10),
        };
      })
      .sort((a, b) => a.auctionDate.localeCompare(b.auctionDate));

    return NextResponse.json({
      success: true,
      auctions,
      upcoming,
      issuance,
      updatedAt: new Date().toISOString(),
      dataSource: "TreasuryDirect TA_WS",
    });
  } catch (error) {
    console.error("Auction API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch auction data from TreasuryDirect" },
      { status: 500 }
    );
  }
}
