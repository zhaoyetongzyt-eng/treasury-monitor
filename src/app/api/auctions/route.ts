import { NextResponse } from "next/server";

// ============================================================
// 国债拍卖数据 API
// 数据源：Treasury FiscalData API (auctions_query)
// 返回最近已出结果的拍卖 + 自动评级 + 发行结构概要
// ============================================================

/** 标的品种中文映射
 *  覆盖范围：标准期限 + Reopening 再开放品种（期限含月份后缀，如 "9-Year 8-Month"）
 *  Treasury 再开放：10Y 约在发行后 4/8 个月再开，30Y 约在 2/5/8/11 个月再开
 */
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
  // Notes / TIPS reopenings（含月份后缀）
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

interface RawAuction {
  security_type: string;
  security_term: string;
  offering_amt: string | number;
  high_yield: string | number | null;
  high_discnt_rate: string | number | null;
  high_investment_rate: string | number | null;
  avg_med_yield: string | number | null;
  bid_to_cover_ratio: string | number | null;
  auction_date: string;
  issue_date: string;
  maturity_date: string;
  total_accepted: string | number | null;
}

/** 标准期限排序权重（短→长；Reopening 与对应标准期限同权） */
const TERM_ORDER: Record<string, number> = {
  "27天国库券": 1,
  "42天国库券": 1,
  "现金管理票据": 1,
  "4周国库券": 2,
  "6周国库券": 2,
  "8周国库券": 3,
  "13周国库券": 4,
  "17周国库券": 5,
  "26周国库券": 6,
  "52周国库券": 7,
  "2年期国债": 8,
  "约2年期国债(再开)": 8,
  "3年期国债": 9,
  "5年期国债": 10,
  "7年期国债": 11,
  "10年期国债": 12,
  "约10年期国债(再开)": 12,
  "约20年期国债(再开)": 13,
  "20年期国债": 13,
  "30年期国债": 14,
  "约30年期国债(再开)": 14,
};

export async function GET() {
  try {
    const url =
      "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/auctions_query" +
      "?sort=-auction_date" +
      "&page[size]=100" +
      "&filter=auction_date:gte:2026-01-01" +
      "&format=json";

    const res = await fetch(url, {
      next: { revalidate: 600 }, // 10分钟缓存（原1小时；拍卖结果当日更新后可在10分钟内刷新）
      headers: { "User-Agent": "TreasuryMonitor/1.0" },
    });

    if (!res.ok) {
      throw new Error(`Treasury API returned ${res.status}`);
    }

    const data = await res.json();
    const rawRecords: RawAuction[] = data.data || [];
    const today = new Date().toISOString().slice(0, 10); // "2026-05-26"

    // ============================================================
    // 辅助：判断一条记录是「已完成」还是「尚未拍卖」
    // ============================================================
    function isCompleted(r: RawAuction): boolean {
      const type = r.security_type?.trim();
      if (type !== "Bill" && type !== "Note" && type !== "Bond") return false;
      if (!SECURITY_TERM_MAP[r.security_term]) return false;

      const btc = Number(r.bid_to_cover_ratio);
      if (isNaN(btc) || btc <= 0) return false;

      // 中标利率必须 > 0
      if (type === "Bill") {
        const invRate = Number(r.high_investment_rate);
        const discRate = Number(r.high_discnt_rate);
        if ((isNaN(invRate) || invRate <= 0) && (isNaN(discRate) || discRate <= 0)) return false;
      } else {
        const hy = Number(r.high_yield);
        if (isNaN(hy) || hy <= 0) return false;
      }
      return true;
    }

    function isUpcoming(r: RawAuction): boolean {
      const type = r.security_type?.trim();
      if (type !== "Bill" && type !== "Note" && type !== "Bond") return false;
      if (!SECURITY_TERM_MAP[r.security_term]) return false;

      // 拍卖日期在未来（含今天，当天可能尚未出结果）
      if (!r.auction_date || r.auction_date < today) return false;

      // 尚未出结果：bid_to_cover 为空 或 中标利率为 0
      const btc = Number(r.bid_to_cover_ratio);
      if (!isNaN(btc) && btc > 0) {
        // 有投标倍数但还需检查利率是否真实
        if (type === "Bill") {
          const invRate = Number(r.high_investment_rate);
          const discRate = Number(r.high_discnt_rate);
          if ((!isNaN(invRate) && invRate > 0) || (!isNaN(discRate) && discRate > 0)) return false;
        } else {
          const hy = Number(r.high_yield);
          if (!isNaN(hy) && hy > 0) return false;
        }
      }
      return true;
    }

    // ============================================================
    // 1. 已完成拍卖
    // ============================================================
    const completed = rawRecords.filter(isCompleted);

    // 去重：每个期限只保留最新的一场
    const seenCompleted = new Set<string>();
    const uniqueCompleted: RawAuction[] = [];
    for (const r of completed) {
      const term = SECURITY_TERM_MAP[r.security_term];
      if (!seenCompleted.has(term)) {
        seenCompleted.add(term);
        uniqueCompleted.push(r);
      }
    }

    // 映射为 AuctionRecord
    const auctions = uniqueCompleted.map((r) => {
      const term = SECURITY_TERM_MAP[r.security_term];
      const offeringAmt = Number(r.offering_amt) / 1_000_000_000; // 转为十亿美元

      // Bills: 使用 high_investment_rate > high_discnt_rate
      // Notes/Bonds: 使用 high_yield > avg_med_yield
      let yield_ = 0;
      if (r.security_type === "Bill") {
        const invRate = Number(r.high_investment_rate);
        const discRate = Number(r.high_discnt_rate);
        yield_ = !isNaN(invRate) && invRate > 0 ? invRate : !isNaN(discRate) ? discRate : 0;
      } else {
        const hy = Number(r.high_yield);
        const amy = Number(r.avg_med_yield);
        yield_ = !isNaN(hy) && hy > 0 ? hy : !isNaN(amy) && amy > 0 ? amy : 0;
      }

      const btc = Number(r.bid_to_cover_ratio);

      return {
        securityType: r.security_type,
        securityTerm: term,
        offeringAmount: Math.round(offeringAmt * 10) / 10,
        highYield: Math.round(yield_ * 1000) / 1000,
        bidToCover: Math.round(btc * 100) / 100,
        rating: autoRating(btc),
        auctionDate: r.auction_date,
        issueDate: r.issue_date,
        maturityDate: r.maturity_date,
      };
    });

    // 按期限从短到长排序
    auctions.sort((a, b) => {
      return (TERM_ORDER[a.securityTerm] ?? 99) - (TERM_ORDER[b.securityTerm] ?? 99);
    });

    // 发行结构概要
    // dataFreshness 应取所有已完成拍卖中的最新日期（而非排序后第一条的日期）
    const auctionDates = auctions.map((a) => a.auctionDate).filter(Boolean);
    const latestDate =
      auctionDates.length > 0
        ? auctionDates.sort().reverse()[0]
        : null;

    const issuance = {
      totalAuctioned: auctions.reduce((s, a) => s + a.offeringAmount, 0),
      recordCount: auctions.length,
      avgBidToCover:
        auctions.length > 0
          ? Math.round((auctions.reduce((s, a) => s + a.bidToCover, 0) / auctions.length) * 100) / 100
          : 0,
      dataFreshness: latestDate,
    };

    // ============================================================
    // 2. 即将拍卖公告
    // ============================================================
    const upcomingRaw = rawRecords.filter(isUpcoming);

    // 去重：每个期限只保留最近的一场
    const seenUpcoming = new Set<string>();
    const uniqueUpcoming: RawAuction[] = [];
    for (const r of upcomingRaw) {
      const term = SECURITY_TERM_MAP[r.security_term];
      if (!seenUpcoming.has(term)) {
        seenUpcoming.add(term);
        uniqueUpcoming.push(r);
      }
    }

    // 映射为 UpcomingAuction（轻量版，无需 yield/btc）
    const upcoming = uniqueUpcoming
      .map((r) => {
        const offeringAmt = Number(r.offering_amt) / 1_000_000_000;
        return {
          securityType: r.security_type,
          securityTerm: SECURITY_TERM_MAP[r.security_term],
          offeringAmount: Math.round(offeringAmt * 10) / 10,
          auctionDate: r.auction_date,
          issueDate: r.issue_date,
          maturityDate: r.maturity_date,
        };
      })
      // 按拍卖日期从近到远排序
      .sort((a, b) => a.auctionDate.localeCompare(b.auctionDate));

    return NextResponse.json({
      success: true,
      auctions,
      upcoming,
      issuance,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Auction API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch auction data from Treasury" },
      { status: 500 }
    );
  }
}
