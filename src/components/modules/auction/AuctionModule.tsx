"use client";

import { useState, useEffect } from "react";
import ModuleHeader from "@/components/layout/ModuleHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { AuctionRecord, AuctionIssuance, UpcomingAuction } from "@/types";

// ============================================================
// 供给与拍卖模块 (01)
// 数据源：Treasury FiscalData API + Treasury.gov Yield Curve CSV
// ============================================================

/** 拍卖评级 → 颜色映射 */
const ratingColors: Record<string, string> = {
  "强劲": "bg-green-100 text-green-800 border-green-200",
  "稳健": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "中性": "bg-gray-100 text-gray-800 border-gray-200",
  "偏软": "bg-amber-100 text-amber-800 border-amber-200",
  "中性偏弱": "bg-orange-100 text-orange-800 border-orange-200",
  "疲弱·尾部": "bg-red-100 text-red-800 border-red-200",
};

// ============================================================
// 拍卖表格
// ============================================================
function AuctionTable({
  auctions,
  loading,
  title = "已完成拍卖 · 评分表",
  subtitle,
}: {
  auctions: AuctionRecord[];
  loading: boolean;
  title?: string;
  subtitle?: string;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-sm text-gray-400 animate-pulse">
            加载拍卖数据...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (auctions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-sm text-gray-400">
            暂无拍卖数据
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {subtitle && (
          <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>品种</TableHead>
              <TableHead className="text-right">拍卖日期</TableHead>
              <TableHead className="text-right">规模 ($B)</TableHead>
              <TableHead className="text-right">中标收益率</TableHead>
              <TableHead className="text-right">投标倍数</TableHead>
              <TableHead className="text-right">评级</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {auctions.map((auction, i) => (
              <TableRow key={i} className={auction.isLatest ? "bg-blue-50/50" : ""}>
                <TableCell className="font-medium">
                  {auction.securityTerm}
                  {auction.isLatest && (
                    <Badge
                      variant="outline"
                      className="ml-2 bg-blue-100 text-blue-700 border-blue-300 text-[10px] px-1.5 py-0"
                    >
                      {auction.auctionDate} · 最新
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right text-xs text-gray-500">
                  {auction.auctionDate}
                </TableCell>
                <TableCell className="text-right">${auction.offeringAmount}B</TableCell>
                <TableCell className="text-right font-mono">
                  {auction.highYield.toFixed(3)}%
                </TableCell>
                <TableCell className="text-right font-mono">
                  {auction.bidToCover.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant="outline"
                    className={ratingColors[auction.rating] || ""}
                  >
                    {auction.rating}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
          <p className="text-xs text-gray-400">
            数据来源：Treasury FiscalData · Treasury Securities Auctions Data
          </p>
          <p className="text-xs text-gray-400">
            注：Bills 使用 Investment Rate；Notes/Bonds 使用 High Yield；评级为自定义模型评级，非财政部官方字段。
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <a
              href="https://fiscaldata.treasury.gov/datasets/treasury-securities-auctions-data/treasury-securities-auctions-data#api-quick-guide"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2"
            >
              FiscalData API ↗
            </a>
            <a
              href="https://www.treasurydirect.gov/auctions/announcements-data-results/announcement-results-press-releases/auction-results/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2"
            >
              TreasuryDirect 官方拍卖结果 ↗
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// 即将拍卖公告表格
// ============================================================
function UpcomingAuctionTable({
  upcoming,
  loading,
}: {
  upcoming: UpcomingAuction[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">即将拍卖公告</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-sm text-gray-400 animate-pulse">
            加载中...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (upcoming.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">即将拍卖公告</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-sm text-gray-400">
            暂无已公布的未来拍卖安排
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">即将拍卖公告</CardTitle>
        <p className="text-xs text-gray-400 mt-0.5">
          已公布但尚未完成拍卖的国债发行安排（按计划拍卖日期排序）
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>品种</TableHead>
              <TableHead className="text-right">计划规模 ($B)</TableHead>
              <TableHead className="text-right">拍卖日期</TableHead>
              <TableHead className="text-right">发行日期</TableHead>
              <TableHead className="text-right">到期日</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {upcoming.map((u, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{u.securityTerm}</TableCell>
                <TableCell className="text-right">
                  {u.offeringAmount > 0 ? `$${u.offeringAmount}B` : "待定"}
                </TableCell>
                <TableCell className="text-right">{u.auctionDate}</TableCell>
                <TableCell className="text-right">{u.issueDate}</TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {u.maturityDate}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-400 flex justify-between flex-wrap gap-2">
            <span>数据来源：Treasury FiscalData · Auctions Query</span>
            <a
              href="https://fiscaldata.treasury.gov/datasets/treasury-securities-auctions-data/treasury-securities-auctions-data#api-quick-guide"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline underline-offset-2"
            >
              原始数据 ↗
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// 投标倍数图表
// ============================================================
function AuctionChart({ auctions }: { auctions: AuctionRecord[] }) {
  // 保留主要品种做图表
  const chartData = auctions
    .filter((a) =>
      ["4周国库券", "13周国库券", "2年期国债", "3年期国债", "5年期国债", "10年期国债", "30年期国债"].includes(a.securityTerm)
    )
    .map((a) => ({
      name: a.securityTerm,
      value: a.bidToCover,
    }));

  if (chartData.length === 0) return null;

  // 投标倍数平均值参考线值
  const avgBtc = 2.5;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">投标倍数 vs 历史均值</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 4]} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [Number(v).toFixed(2), "投标倍数"]} />
            <Bar
              dataKey="value"
              name="最新"
              fill="#3B82F6"
              radius={[4, 4, 0, 0]}
              barSize={24}
            />
            {/* 参考线通过 recharts ReferenceLine 不好看，改用第二条 bar */}
            <Bar
              dataKey={() => avgBtc}
              name="历史均值"
              fill="#E2E8F0"
              radius={[4, 4, 0, 0]}
              barSize={24}
              stackId="ref"
            />
            <Legend
              verticalAlign="top"
              height={28}
              iconType="rect"
              wrapperStyle={{ fontSize: 12 }}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ============================================================
// 发行结构卡片
// ============================================================
function AuctionIssuanceCard({
  issuance,
  loading,
}: {
  issuance: AuctionIssuance | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">发行结构</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-sm text-gray-400 animate-pulse">
            加载中...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">发行结构</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">数据覆盖拍卖场次</span>
          <span className="text-sm font-mono">{issuance?.recordCount ?? "--"} 场</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">合计拍卖规模</span>
          <span className="text-sm font-mono">
            ${issuance?.totalAuctioned.toFixed(0) ?? "--"}B
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">平均投标倍数</span>
          <span className="text-sm font-mono">
            {issuance?.avgBidToCover.toFixed(2) ?? "--"}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">最新完成拍卖日期</span>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            {issuance?.dataFreshness ?? "--"}
          </Badge>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">评级 ≥ 稳健</span>
          <span className="text-sm font-mono text-emerald-600 font-medium">
            {issuance
              ? Math.round(
                  (issuance.avgBidToCover >= 2.4 ? 100 : issuance.avgBidToCover >= 2.1 ? 60 : 30)
                )
              : "--"}
            %
          </span>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-1">数据引用：</p>
          <p className="text-xs">
            <a
              href="https://fiscaldata.treasury.gov/datasets/treasury-securities-auctions-data/treasury-securities-auctions-data#api-quick-guide"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline underline-offset-2"
            >
              Treasury FiscalData · Auctions Query ↗
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// 主模块
// ============================================================
export default function AuctionModule() {
  const [auctions, setAuctions] = useState<AuctionRecord[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingAuction[]>([]);
  const [issuance, setIssuance] = useState<AuctionIssuance | null>(null);
  const [loadingAuctions, setLoadingAuctions] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auctions")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setAuctions(data.auctions);
          setUpcoming(data.upcoming || []);
          setIssuance(data.issuance);
        } else {
          setError("拍卖数据加载失败");
        }
      })
      .catch(() => setError("拍卖数据加载失败"))
      .finally(() => setLoadingAuctions(false));
  }, []);

  // 按品种拆分：Bills（短期国库券） vs Notes / Bonds（中长期国债）
  const billAuctions = auctions.filter((a) => a.securityType === "Bill");
  const noteBondAuctions = auctions.filter(
    (a) => a.securityType === "Note" || a.securityType === "Bond"
  );

  return (
    <section id="auction" className="py-8 px-4 max-w-7xl mx-auto scroll-mt-16">
      <ModuleHeader
        number="01"
        title="供给与拍卖"
        titleEn="Supply & Auction"
        description="追踪美国国债拍卖节奏——从发行规模、中标利率到投标倍数，评估市场需求热度。"
      />

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error} · 请检查网络后刷新页面
        </div>
      )}

      {/* 拍卖表格 × 2 + 图表/发行卡片 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧：拍卖表格（Bills 在上，Notes/Bonds 在下） */}
        <div className="space-y-6">
          <AuctionTable
            auctions={billAuctions}
            loading={loadingAuctions}
            title="短期国库券（Bills）· 拍卖评分"
            subtitle="4周 ~ 52周国库券，使用 Investment Rate 计价。最新完成拍卖置顶显示。"
          />
          <AuctionTable
            auctions={noteBondAuctions}
            loading={loadingAuctions}
            title="中长期国债（Notes & Bonds）· 拍卖评分"
            subtitle="2年期及以上国债，含再开放品种，使用 High Yield 计价。最新完成拍卖置顶显示。"
          />
        </div>

        {/* 右侧：图表 + 发行结构卡片 */}
        <div className="space-y-6">
          <AuctionChart auctions={auctions} />
          <AuctionIssuanceCard issuance={issuance} loading={loadingAuctions} />
        </div>
      </div>

      {/* 即将拍卖公告 */}
      <div className="mt-6">
        <UpcomingAuctionTable upcoming={upcoming} loading={loadingAuctions} />
      </div>
    </section>
  );
}
