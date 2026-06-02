"use client";

import { useState, useEffect } from "react";
import ModuleHeader from "@/components/layout/ModuleHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { USTHolder, ForeignHolderDetail, USTFlowSummary, MarginalFlowData, MarginalFlowItem } from "@/types";

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
  marginalFlows: {
    "1M": MarginalFlowData;
    "3M": MarginalFlowData;
    "12M": MarginalFlowData;
  };
  keySignals: { type: "warning" | "info" | "positive"; title: string; desc: string }[];
}

// ============================================================
// 辅助函数
// ============================================================

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
// 分区标题组件
// ============================================================

function SectionDivider({ color, label, labelEn }: { color: string; label: string; labelEn: string }) {
  const colorMap: Record<string, { bg: string; border: string; dot: string; text: string; subtext: string }> = {
    blue: { bg: "bg-blue-50", border: "border-blue-200", dot: "bg-blue-500", text: "text-blue-700", subtext: "text-blue-400" },
    amber: { bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-500", text: "text-amber-700", subtext: "text-amber-400" },
    purple: { bg: "bg-purple-50", border: "border-purple-200", dot: "bg-purple-500", text: "text-purple-700", subtext: "text-purple-400" },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className="flex items-center gap-3 mb-4 mt-2">
      <div className="h-px flex-1 bg-gray-200" />
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${c.bg} ${c.border}`}>
        <span className={`w-3 h-3 rounded-full ${c.dot}`} />
        <span className={`text-sm font-semibold ${c.text}`}>{label}</span>
        <span className={`text-xs ${c.subtext}`}>{labelEn}</span>
      </div>
      <div className="h-px flex-1 bg-gray-200" />
    </div>
  );
}

// ============================================================
// 子组件
// ============================================================

/** 第一层：存量结构面板 */
function Layer1StockStructure({ summary, fedLatest }: { summary: USTFlowSummary; fedLatest: USTHoldersResponse["fedLatest"] }) {
  const items = [
    { label: "可流通美债总存量", value: summary.totalOutstanding, unit: "万亿美元", color: "text-gray-900", source: summary.totalOutstandingSource },
    { label: "市场自由流通量", value: summary.marketFloat, unit: "万亿美元", color: "text-teal-700", isEstimated: true, source: summary.marketFloatSource },
    { label: "外国持有", value: summary.foreignHoldings, unit: "万亿美元", color: "text-blue-700", source: summary.foreignHoldingsSource },
    { label: "美联储持有", value: summary.fedHoldings, unit: "万亿美元", color: "text-purple-700", sub: "SOMA / FRED TREAST", source: summary.fedHoldingsSource },
    { label: "国内私人部门持有", value: summary.domesticHoldings, unit: "万亿美元", color: "text-amber-700", isEstimated: true, source: summary.domesticHoldingsSource },
  ];

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 to-slate-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">美债持有人结构：谁持有存量？</CardTitle>
        <p className="text-xs text-gray-400">
          可流通美债总存量截至 2026-04-30（Treasury MSPD 面值）· 其余数据截至 2026-05-20 · 包含美联储 SOMA 持有
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 lg:grid-cols-5 gap-3">
          {items.map((item) => (
            <div key={item.label} className="text-center p-2 rounded-lg bg-white/70" title={item.source}>
              <p className="text-xs text-gray-500 mb-1">{item.label}{item.isEstimated ? "*" : ""}</p>
              <p className={`text-lg font-bold font-mono ${item.color}`}>
                {item.value}
                <span className="text-xs font-normal ml-0.5">{item.unit}</span>
              </p>
              {item.sub && <p className="text-[10px] text-gray-400 mt-0.5">{item.sub}</p>}
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-gray-400 mb-1">
          * 市场自由流通量 = 可流通美债总存量 − 美联储 SOMA 持仓（混合口径）。国内私人部门 = 总存量 − 外国 − 美联储（估算残差项，含银行、基金、家庭、养老金、ETF 等）。
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
          <a href="https://fiscaldata.treasury.gov/datasets/monthly-statement-public-debt/" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:text-blue-800 underline underline-offset-2">Treasury MSPD ↗</a>
          <a href="https://ticdata.treasury.gov/resource-center/data-chart-center/tic/Documents/slt_table5.html" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:text-blue-800 underline underline-offset-2">TIC Table 5 ↗</a>
          <a href="https://fred.stlouisfed.org/series/TREAST" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:text-blue-800 underline underline-offset-2">FRED TREAST ↗</a>
          <a href="https://www.federalreserve.gov/releases/z1/" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:text-blue-800 underline underline-offset-2">Z.1 L.210 ↗</a>
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
          <span>来源：Federal Reserve Z.1 L.210 · 季频 · {z1Date} · 期末余额 · 非季调 · 可流通美债（扣除溢价/折价）</span>
          <a
            href="https://www.federalreserve.gov/releases/z1/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline underline-offset-2"
          >
            原始数据 ↗
          </a>
        </p>
        <p className="text-[10px] text-gray-400 mt-1">
          * 银行机构 = U.S.-chartered depository institutions + Credit unions · ** 私人养老金与保险 = Property-casualty insurance companies + Life insurance companies + Private pension funds · 其他 = L.210 Total assets − 上述七类合计 · 变动 = 2025:Q4 持仓水平 − 2024:Q4 持仓水平 · 单位为十亿美元（Billions USD）
        </p>
      </CardContent>
    </Card>
  );
}

/** 第二层：边际流向（1M/3M/12M 切换） */
function Layer2MarginalFlow({ marginalFlows }: { marginalFlows: USTHoldersResponse["marginalFlows"] }) {
  const periods = ["1M", "3M", "12M"] as const;
  const periodLabels: Record<string, string> = {
    "1M": "1月",
    "3M": "3月",
    "12M": "12月",
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">近期持仓边际变化：谁的余额在增加/减少？</CardTitle>
        <p className="text-xs text-gray-400">
          按 1个月、3个月、12个月观察主要持有人变化；TIC、FRED、Z.1 频率与估值口径不同，不可直接加总。
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="1M">
          <TabsList>
            {periods.map((p) => (
              <TabsTrigger key={p} value={p}>{periodLabels[p]}</TabsTrigger>
            ))}
          </TabsList>

          {/* ====== 1M：最新边际信号（TIC + FRED 独立卡片，不对比） ====== */}
          <TabsContent value="1M" className="mt-3">
            <p className="text-xs text-gray-500 mb-3">
              外资为 TIC 月度期末持仓变化；Fed 为 FRED/H.4.1 周度持仓变化。二者时间窗口不同，仅用于观察最新边际方向。
            </p>

            {marginalFlows["1M"].signals ? (
              <div className="grid grid-cols-2 gap-4">
                {marginalFlows["1M"].signals!.map((signal) => (
                  <div
                    key={signal.label}
                    className={`p-3 rounded-lg border ${
                      signal.change >= 0
                        ? "bg-red-50 border-red-100"
                        : "bg-green-50 border-green-100"
                    }`}
                  >
                    <p className="text-xs text-gray-500 mb-1">{signal.label}</p>
                    <p className={`text-lg font-bold font-mono ${signal.change >= 0 ? "text-red-600" : "text-green-600"}`}>
                      {signal.change >= 0 ? "+" : ""}{signal.change.toFixed(0)}B
                    </p>
                    <div className="mt-2 space-y-0.5 text-[10px] text-gray-400">
                      <p>频率：{signal.frequency}</p>
                      <p>截止：{signal.dataDate}</p>
                    </div>
                    <p className="mt-1.5 text-[10px] text-gray-500 leading-relaxed">{signal.note}</p>
                    <p className="mt-0.5 text-[9px] text-gray-400 truncate" title={signal.source}>
                      来源：{signal.source}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">暂无数据</p>
            )}

            {marginalFlows["1M"].footnote && (
              <p className="mt-3 text-[10px] text-gray-400">{marginalFlows["1M"].footnote}</p>
            )}
          </TabsContent>

          {/* ====== 3M：Z.1 Q4 2025 vs Q3 2025 季度环比 ====== */}
          <TabsContent value="3M" className="mt-3">
            <p className="text-xs text-gray-500 mb-3">
              Z.1 季度持仓变化：2025Q4 vs 2025Q3 · 仅使用 Z.1 L.210 季频数据（市值口径，不混用 TIC）
            </p>

            {marginalFlows["3M"].flows && marginalFlows["3M"].flows.length > 0 ? (
              <div>
                {/* 持仓余额增加部门 */}
                <div className="p-3 rounded-lg bg-red-50 border border-red-100 mb-3">
                  <p className="text-xs text-gray-500 mb-2">
                    持仓余额增加部门（{marginalFlows["3M"].flows.filter(f => f.isBuyer && !f.isResidual).length} 类）
                  </p>
                  <div className="space-y-1">
                    {marginalFlows["3M"].flows.filter(f => f.isBuyer && !f.isResidual).map((f) => (
                      <div key={f.category} className="flex justify-between text-xs" title={f.source}>
                        <span className="text-gray-600">{f.category}</span>
                        <span className="font-mono text-red-600">+{f.change.toFixed(0)}B</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 未单列部门与统计差异（残差项） */}
                {marginalFlows["3M"].residualItem && (
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">未单列部门与统计差异</p>
                    <p className={`text-lg font-bold font-mono ${marginalFlows["3M"].residualItem.change >= 0 ? "text-red-600" : "text-green-600"}`}>
                      {marginalFlows["3M"].residualItem.change >= 0 ? "+" : ""}{marginalFlows["3M"].residualItem.change.toFixed(0)}B
                    </p>
                    <p className="mt-1 text-[10px] text-gray-500 leading-relaxed">
                      {marginalFlows["3M"].residualItem.residualNote}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">暂无数据</p>
            )}

            {marginalFlows["3M"].footnote && (
              <p className="mt-3 text-[10px] text-gray-400">{marginalFlows["3M"].footnote}</p>
            )}
          </TabsContent>

          {/* ====== 12M：Z.1 Q4 2025 vs Q4 2024 年度同比 ====== */}
          <TabsContent value="12M" className="mt-3">
            <p className="text-xs text-gray-500 mb-3">
              Z.1 年度持仓变化：2025Q4 vs 2024Q4 · 该口径为期末余额同比变化，不能等同于全年净交易流量
            </p>

            {marginalFlows["12M"].flows && marginalFlows["12M"].flows.length > 0 ? (
              <div>
                {/* 持仓余额增加部门 */}
                <div className="p-3 rounded-lg bg-red-50 border border-red-100 mb-3">
                  <p className="text-xs text-gray-500 mb-2">
                    持仓余额增加部门（{marginalFlows["12M"].flows.filter(f => f.isBuyer && !f.isResidual).length} 类）
                  </p>
                  <div className="space-y-1">
                    {marginalFlows["12M"].flows.filter(f => f.isBuyer && !f.isResidual).map((f) => (
                      <div key={f.category} className="flex justify-between text-xs" title={f.source}>
                        <span className="text-gray-600">{f.category}</span>
                        <span className="font-mono text-red-600">+{f.change.toFixed(0)}B</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 同比余额下降部门 */}
                {marginalFlows["12M"].flows.filter(f => !f.isBuyer && !f.isResidual).length > 0 ? (
                  <div className="p-3 rounded-lg bg-green-50 border border-green-100 mb-3">
                    <p className="text-xs text-gray-500 mb-2">
                      同比余额下降部门（{marginalFlows["12M"].flows.filter(f => !f.isBuyer && !f.isResidual).length} 类）
                    </p>
                    <div className="space-y-1">
                      {marginalFlows["12M"].flows.filter(f => !f.isBuyer && !f.isResidual).map((f) => (
                        <div key={f.category} className="flex justify-between text-xs" title={f.source}>
                          <span className="text-gray-600">{f.category}</span>
                          <span className="font-mono text-green-600">{f.change.toFixed(0)}B</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 mb-3">同比余额下降部门：暂无主要聚合部门</p>
                )}

                {/* 残差项 */}
                {marginalFlows["12M"].residualItem && (
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">未单列部门与统计差异</p>
                    <p className={`text-lg font-bold font-mono ${marginalFlows["12M"].residualItem.change >= 0 ? "text-red-600" : "text-green-600"}`}>
                      {marginalFlows["12M"].residualItem.change >= 0 ? "+" : ""}{marginalFlows["12M"].residualItem.change.toFixed(0)}B
                    </p>
                    <p className="mt-1 text-[10px] text-gray-500 leading-relaxed">
                      {marginalFlows["12M"].residualItem.residualNote}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">暂无数据</p>
            )}

            {marginalFlows["12M"].footnote && (
              <p className="mt-3 text-[10px] text-gray-400">{marginalFlows["12M"].footnote}</p>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-3">
          <a href="https://ticdata.treasury.gov/resource-center/data-chart-center/tic/Documents/slt_table5.html" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:text-blue-800 underline underline-offset-2">TIC Table 5 ↗</a>
          <a href="https://fred.stlouisfed.org/series/TREAST" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:text-blue-800 underline underline-offset-2">FRED TREAST ↗</a>
          <a href="https://www.federalreserve.gov/releases/z1/" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:text-blue-800 underline underline-offset-2">Z.1 L.210 ↗</a>
        </div>
      </CardContent>
    </Card>
  );
}

/** 第三层：年度持仓结构变化（原 BuySellSplit 改造） */
function Layer3AnnualChange({ holders, z1Date, z1PublicationDate }: { holders: USTHolder[]; z1Date: string; z1PublicationDate: string }) {
  // 重命名"家庭部门" → "家庭与非营利部门（含残差）"
  const renamedHolders = holders.map((h) =>
    h.category === "家庭部门" ? { ...h, category: "家庭与非营利部门（含残差）" } : h
  );

  const buyers = renamedHolders.filter((h) => h.trend === "增持");
  const sellers = renamedHolders.filter((h) => h.trend === "减持");

  const totalBuyerChange = buyers.reduce((sum, h) => sum + h.change, 0);
  const totalSellerChange = sellers.reduce((sum, h) => sum + h.change, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">年度持仓结构变化：谁吸收了新增供给？</CardTitle>
        <p className="text-xs text-gray-400">
          Z.1 {z1Date} vs Q4 2024 · 各部门美债持仓余额变化，非交易流量 · {z1PublicationDate} 发布
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* 持仓余额增加部门 */}
          <div className="p-3 rounded-lg bg-red-50 border border-red-100">
            <p className="text-xs text-gray-500 mb-2">持仓余额增加部门（{buyers.length} 类）</p>
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

          {/* 持仓余额减少部门 */}
          <div className="p-3 rounded-lg bg-green-50 border border-green-100">
            <p className="text-xs text-gray-500 mb-2">持仓余额减少部门（{sellers.length} 类）</p>
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

        {/* 结论 */}
        <div className="mt-3 p-3 rounded-lg bg-blue-50 text-left space-y-1">
          <p className="text-xs font-medium text-blue-800">2025年美债供给吸收结构</p>
          <p className="text-xs text-blue-700 leading-relaxed">
            货币市场基金（+${holders.find(h => h.category === "货币市场基金")?.change.toFixed(0)}B）、
            家庭与非营利部门（+${holders.find(h => h.category === "家庭部门")?.change.toFixed(0)}B）、
            外国部门（+${holders.find(h => h.category === "外国部门 / Rest of world")?.change.toFixed(0)}B）与
            共同基金（+${holders.find(h => h.category === "共同基金")?.change.toFixed(0)}B）
            为全年主要持仓增加部门；美联储 Z.1 市值口径下持仓小幅变动（+${holders.find(h => h.category === "美联储 / Monetary authority")?.change.toFixed(0)}B），
            2026年5月边际上已转为滚续与储备管理购买。
          </p>
          <p className="text-[10px] text-blue-500 mt-1">
            注：以上变动 = Q4 2025 持仓水平 − Q4 2024 持仓水平（Z.1 L.210 期末余额、非季调、可流通美债扣除溢价/折价）。此为各部门美债持仓余额的结构性变化，反映的是持仓存量的跨期增减，而非当期交易流量。外资 TIC 月频数据与 Z.1 季频数据口径不同（TIC 为面值，Z.1 为市值），不可直接混用。所有部门持仓变动之和与总存量变动存在统计误差（"其他"为残差项）。
          </p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-2">
          <a href="https://www.federalreserve.gov/releases/z1/" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:text-blue-800 underline underline-offset-2">Z.1 L.210 Q4 2025 ↗</a>
          <a href="https://www.federalreserve.gov/releases/z1/20250313/html/l210.htm" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:text-blue-800 underline underline-offset-2">Z.1 L.210 Q4 2024 ↗</a>
          <a href="https://ticdata.treasury.gov/resource-center/data-chart-center/tic/Documents/slt_table5.html" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:text-blue-800 underline underline-offset-2">TIC Table 5 ↗</a>
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
          number="03"
          title="UST 持有人结构"
          titleEn="UST Holder Structure"
          description="追踪美债主要持有人结构与边际变化：外资、美联储、银行、基金、货币市场基金、家庭与非营利部门等各类主体如何吸收新增供给，以及持仓结构的跨期演变。"
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
          number="03"
          title="UST 持有人结构"
          titleEn="UST Holder Structure"
          description="追踪美债主要持有人结构与边际变化。"
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
        number="03"
        title="UST 持有人结构"
        titleEn="UST Holder Structure"
        description="追踪美债主要持有人结构与边际变化：外资、美联储、银行、基金、货币市场基金、家庭与非营利部门等各类主体如何吸收新增供给，以及持仓结构的跨期演变。"
      />

      <div className="space-y-5">
        {/* ================================================================ */}
        {/* ★ 第一层：存量结构 */}
        {/* ================================================================ */}
        <SectionDivider color="blue" label="第一层：存量结构" labelEn="Stock Structure" />

        <Layer1StockStructure summary={data.flowSummary} fedLatest={data.fedLatest} />

        {/* 持有者结构表格 — 第一层详细展开 */}
        <HolderTable holders={data.holders} z1Date={data.z1Date} />

        {/* ================================================================ */}
        {/* ★ 第二层：边际流向 */}
        {/* ================================================================ */}
        <SectionDivider color="amber" label="第二层：边际流向" labelEn="Marginal Flow" />

        <Layer2MarginalFlow marginalFlows={data.marginalFlows} />

        {/* 海外前10持仓 — 第二层外资视角补充 */}
        <ForeignHoldersTable holders={data.foreignTop10} dataDate="2026-03" />

        {/* ================================================================ */}
        {/* ★ 第三层：年度结构变化 */}
        {/* ================================================================ */}
        <SectionDivider color="purple" label="第三层：年度结构变化" labelEn="Annual Structure Change" />

        <Layer3AnnualChange holders={data.holders} z1Date={data.z1Date} z1PublicationDate={data.z1PublicationDate} />

        {/* ================================================================ */}
        {/* ★ 关键信号 */}
        {/* ================================================================ */}
        <KeySignals signals={data.keySignals} />
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
