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
import JapanSubModule from "./JapanSubModule";
import type { USTHolder, ForeignHolderDetail, USTFlowSummary } from "@/types";

// ============================================================
// API 响应类型
// ============================================================
interface USTHoldersResponse {
  success: boolean;
  dataDate: string;
  z1Date: string;
  z1PublicationDate: string;
  dataSources: { name: string; url: string; description: string }[];
  holders: USTHolder[];
  foreignTop10: ForeignHolderDetail[];
  flowSummary: USTFlowSummary;
  fedLatest: {
    holdings: number;
    date: string;
    weeklyChange: number;
    fiveWeekChange: number;
    trend: string;
  };
  keySignals: { type: "warning" | "info" | "positive"; title: string; desc: string }[];
}

// ============================================================
// 辅助函数
// ============================================================

function trendColor(trend: string) {
  switch (trend) {
    case "增持":
      return "text-red-600";
    case "减持":
      return "text-green-600";
    default:
      return "text-gray-500";
  }
}

function trendBadge(trend: string) {
  switch (trend) {
    case "增持":
      return "bg-red-100 text-red-700 border-red-200";
    case "减持":
      return "bg-green-100 text-green-700 border-green-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

// ============================================================
// 子组件
// ============================================================

/** 资金流总览面板 */
function FlowOverview({ summary, fedLatest }: { summary: USTFlowSummary; fedLatest: USTHoldersResponse["fedLatest"] }) {
  const items = [
    { label: "可流通美债总量", value: summary.totalOutstanding, unit: "万亿", color: "text-gray-900" },
    { label: "外国持有", value: summary.foreignHoldings, unit: "万亿", color: "text-blue-700" },
    { label: "美联储持有", value: summary.fedHoldings, unit: "万亿", color: "text-purple-700", sub: `截至 ${fedLatest.date}` },
    { label: "国内私人持有", value: summary.domesticHoldings, unit: "万亿", color: "text-amber-700" },
    { label: "外资净流动(月)", value: summary.netForeignFlow, unit: "亿", color: summary.netForeignFlow >= 0 ? "text-red-600" : "text-green-600" },
    { label: "美联储净购买(5周)", value: summary.netFedFlow, unit: "亿", color: summary.netFedFlow >= 0 ? "text-red-600" : "text-green-600" },
  ];

  return (
    <Card className="col-span-full border-blue-200 bg-gradient-to-br from-blue-50/50 to-slate-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">资金流总览</CardTitle>
        <p className="text-xs text-gray-400">数据快照：{summary.snapshotDate} · 美联储：{fedLatest.trend}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {items.map((item) => (
            <div key={item.label} className="text-center p-2 rounded-lg bg-white/70">
              <p className="text-xs text-gray-500 mb-1">{item.label}</p>
              <p className={`text-lg font-bold font-mono ${item.color}`}>
                {typeof item.value === "number" && item.value >= 0 && item.unit === "亿" ? "+" : ""}{item.value}
                <span className="text-xs font-normal ml-0.5">{item.unit}</span>
              </p>
              {item.sub && <p className="text-[10px] text-gray-400 mt-0.5">{item.sub}</p>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** 持有者结构表格 */
function HolderTable({ holders, z1Date }: { holders: USTHolder[]; z1Date: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base">美债持有者结构</CardTitle>
            <p className="text-xs text-gray-400">按持有人类别划分 · Z.1 {z1Date} · 可流通美债</p>
          </div>
          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
            Z.1 L.210
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px]">持有人类别</TableHead>
              <TableHead className="text-right">持仓（十亿）</TableHead>
              <TableHead className="text-right">占比</TableHead>
              <TableHead className="text-right">年化变动</TableHead>
              <TableHead className="text-center">趋势</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holders.map((h) => (
              <TableRow key={h.category}>
                <TableCell className="font-medium text-sm">{h.category}</TableCell>
                <TableCell className="text-right font-mono text-sm">${h.holdings.toFixed(0)}B</TableCell>
                <TableCell className="text-right text-sm text-gray-500">{h.share}%</TableCell>
                <TableCell className={`text-right font-mono text-sm ${h.change > 0 ? "text-red-600" : h.change < 0 ? "text-green-600" : "text-gray-400"}`}>
                  {h.change > 0 ? "+" : ""}{h.change.toFixed(0)}B
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={`text-xs ${trendBadge(h.trend)}`}>
                    {h.trend}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="mt-3 text-xs text-gray-400 flex justify-between flex-wrap gap-2">
          <span>来源：Federal Reserve Z.1 L.210 · 季频 · {z1Date}</span>
          <a
            href="https://www.federalreserve.gov/releases/z1/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline underline-offset-2"
          >
            原始数据 ↗
          </a>
        </p>
      </CardContent>
    </Card>
  );
}

/** 卖出方 vs 买入方 摘要 */
function BuySellSplit({ holders }: { holders: USTHolder[] }) {
  const buyers = holders.filter((h) => h.trend === "增持");
  const sellers = holders.filter((h) => h.trend === "减持");

  const totalBuyerChange = buyers.reduce((sum, h) => sum + h.change, 0);
  const totalSellerChange = sellers.reduce((sum, h) => sum + h.change, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">买卖方对比</CardTitle>
        <p className="text-xs text-gray-400">Z.1 Q4 2025 年度变动汇总</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* 买入方 */}
          <div className="p-3 rounded-lg bg-red-50 border border-red-100">
            <p className="text-xs text-gray-500 mb-2">净增持方（{buyers.length} 类）</p>
            <p className="text-lg font-bold font-mono text-red-600">
              +${totalBuyerChange.toFixed(0)}B
            </p>
            <div className="mt-2 space-y-1">
              {buyers.map((b) => (
                <div key={b.category} className="flex justify-between text-xs">
                  <span className="text-gray-600">{b.category}</span>
                  <span className="font-mono text-red-600">+{b.change.toFixed(0)}B</span>
                </div>
              ))}
            </div>
          </div>

          {/* 卖出方 */}
          <div className="p-3 rounded-lg bg-green-50 border border-green-100">
            <p className="text-xs text-gray-500 mb-2">净减持方（{sellers.length} 类）</p>
            <p className="text-lg font-bold font-mono text-green-600">
              {totalSellerChange.toFixed(0)}B
            </p>
            <div className="mt-2 space-y-1">
              {sellers.map((s) => (
                <div key={s.category} className="flex justify-between text-xs">
                  <span className="text-gray-600">{s.category}</span>
                  <span className="font-mono text-green-600">{s.change.toFixed(0)}B</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 净效果 */}
        <div className="mt-3 p-3 rounded-lg bg-blue-50 text-center">
          <p className="text-xs text-gray-500 mb-1">净效果</p>
          <p className={`text-base font-bold font-mono ${totalBuyerChange + totalSellerChange > 0 ? "text-red-600" : "text-green-600"}`}>
            净{totalBuyerChange + totalSellerChange > 0 ? "增持" : "减持"} ${Math.abs(totalBuyerChange + totalSellerChange).toFixed(0)}B/年
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {totalBuyerChange + totalSellerChange > 0
              ? "整体需求偏强，买方力量占优"
              : "卖方力量占优，但美联储结束QT为积极信号"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/** 海外前10持仓明细 */
function ForeignHoldersTable({ holders, dataDate }: { holders: ForeignHolderDetail[]; dataDate: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base">海外前10持仓国/地区</CardTitle>
            <p className="text-xs text-gray-400">{dataDate} TIC 数据 · 月度发布</p>
          </div>
          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
            TIC
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">排名</TableHead>
              <TableHead>国家/地区</TableHead>
              <TableHead className="text-right">持仓（十亿）</TableHead>
              <TableHead className="text-right">月度变动</TableHead>
              <TableHead className="text-right">同比</TableHead>
              <TableHead className="text-center">方向</TableHead>
              <TableHead className="w-[200px]">备注</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holders.map((h) => (
              <TableRow key={h.country} className={h.rank <= 3 ? "bg-gray-50/50" : ""}>
                <TableCell className="text-sm text-gray-400">#{h.rank}</TableCell>
                <TableCell className="font-medium text-sm">{h.country}</TableCell>
                <TableCell className="text-right font-mono text-sm">${h.holdings}</TableCell>
                <TableCell className={`text-right font-mono text-sm ${h.isBuyer ? "text-red-600" : "text-green-600"}`}>
                  {h.monthlyChange > 0 ? "+" : ""}{h.monthlyChange}B ({h.monthlyChangePct > 0 ? "+" : ""}{h.monthlyChangePct}%)
                </TableCell>
                <TableCell className={`text-right text-sm ${h.yoyChangePct > 0 ? "text-red-600" : "text-green-600"}`}>
                  {h.yoyChangePct > 0 ? "+" : ""}{h.yoyChangePct}%
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={`text-xs ${h.isBuyer ? "bg-red-100 text-red-700 border-red-200" : "bg-green-100 text-green-700 border-green-200"}`}>
                    {h.isBuyer ? "买入" : "卖出"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-gray-400">{h.note || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="mt-3 text-xs text-gray-400 flex justify-between flex-wrap gap-2">
          <span>来源：Treasury TIC SLT Table 5 · 月频 · {dataDate}</span>
          <a
            href="https://ticdata.treasury.gov/resource-center/data-chart-center/tic/Documents/slt_table5.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline underline-offset-2"
          >
            原始数据 ↗
          </a>
        </p>
      </CardContent>
    </Card>
  );
}

/** 关键信号提醒 */
function KeySignals({ signals }: { signals: USTHoldersResponse["keySignals"] }) {
  const typeStyles: Record<string, string> = {
    warning: "border-amber-300 bg-amber-50",
    info: "border-blue-300 bg-blue-50",
    positive: "border-emerald-300 bg-emerald-50",
  };

  const typeLabels: Record<string, string> = {
    warning: "关注",
    info: "动向",
    positive: "积极",
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">关键信号与解读</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {signals.map((s, i) => (
          <div key={i} className={`p-3 rounded-lg border ${typeStyles[s.type]}`}>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                {typeLabels[s.type]}
              </Badge>
              <span className="text-sm font-semibold text-gray-800">{s.title}</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ============================================================
// 主模块组件
// ============================================================

export default function USTHoldersModule() {
  const [data, setData] = useState<USTHoldersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ust-holders")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setData(d);
        } else {
          setError(d.message || "数据加载失败");
        }
      })
      .catch(() => setError("无法连接到数据服务"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section id="ust-holders" className="py-8 px-4 max-w-7xl mx-auto scroll-mt-16">
        <ModuleHeader
          number="04"
          title="UST 买卖机构"
          titleEn="UST Buyers & Sellers"
          description="追踪美债市场主要买卖方的持仓变化：谁在买？谁在卖？外资、美联储、银行、基金、散户各方的边际行为及其市场含义。"
        />
        <div className="flex items-center justify-center py-20 text-sm text-gray-400">
          <span className="animate-pulse">加载持有者结构数据...</span>
        </div>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section id="ust-holders" className="py-8 px-4 max-w-7xl mx-auto scroll-mt-16">
        <ModuleHeader
          number="04"
          title="UST 买卖机构"
          titleEn="UST Buyers & Sellers"
          description="追踪美债市场主要买卖方的持仓变化。"
        />
        <div className="p-8 rounded-lg bg-red-50 border border-red-200 text-center">
          <p className="text-red-600 font-medium">数据加载失败</p>
          <p className="text-sm text-red-400 mt-1">{error}</p>
        </div>
      </section>
    );
  }

  return (
    <section id="ust-holders" className="py-8 px-4 max-w-7xl mx-auto scroll-mt-16">
      <ModuleHeader
        number="04"
        title="UST 买卖机构"
        titleEn="UST Buyers & Sellers"
        description="追踪美债市场主要买卖方的持仓变化：谁在买？谁在卖？外资、美联储、银行、基金、散户各方的边际行为及其市场含义。"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 资金流总览 */}
        <FlowOverview summary={data.flowSummary} fedLatest={data.fedLatest} />

        {/* 买卖方对比 */}
        <BuySellSplit holders={data.holders} />

        {/* 持有者结构表格 */}
        <div className="lg:col-span-2">
          <HolderTable holders={data.holders} z1Date={data.z1Date} />
        </div>

        {/* 海外前10持仓 */}
        <div className="lg:col-span-2">
          <ForeignHoldersTable holders={data.foreignTop10} dataDate="2026-03" />
        </div>

        {/* ★ 日本视角子模块 */}
        <JapanSubModule />

        {/* 关键信号 */}
        <div className="lg:col-span-2">
          <KeySignals signals={data.keySignals} />
        </div>
      </div>

      {/* 数据来源引用 */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-400 mb-2">数据引用：</p>
        <div className="flex flex-wrap gap-3">
          {data.dataSources.map((ds) => (
            <a
              key={ds.name}
              href={ds.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2"
            >
              {ds.name} ↗
            </a>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Z.1 数据截至 {data.z1Date}（{data.z1PublicationDate} 发布）· Fed 数据截至 2026-05-20 · TIC 数据截至 2026-03
        </p>
      </div>
    </section>
  );
}
