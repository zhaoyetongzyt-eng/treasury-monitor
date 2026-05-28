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
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { CFTCPosition, TICHolding } from "@/types";

// ============================================================
// 颜色工具（中国惯例：涨红跌绿）
// ============================================================
const positionColor = (pos: string) => {
  if (pos === "净多头") return "bg-emerald-900/30 text-emerald-300 border-emerald-700/40";
  if (pos === "净空头") return "bg-red-100 text-red-800 border-red-700/30";
  return "bg-gray-100 text-slate-200 border-slate-600/30";
};

const trendColor = (trend: string) => {
  if (trend === "上升") return "text-red-600";
  if (trend === "下降") return "text-emerald-600";
  return "text-slate-400";
};

// ============================================================
// 加载骨架
// ============================================================
function SkeletonRow() {
  return (
    <TableRow>
      <TableCell><div className="h-4 w-20 bg-slate-700/40 rounded animate-pulse" /></TableCell>
      <TableCell><div className="h-4 w-16 bg-slate-700/40 rounded animate-pulse" /></TableCell>
      <TableCell className="text-right"><div className="h-4 w-16 bg-slate-700/40 rounded animate-pulse ml-auto" /></TableCell>
      <TableCell className="text-right"><div className="h-4 w-20 bg-slate-700/40 rounded animate-pulse ml-auto" /></TableCell>
    </TableRow>
  );
}

// ============================================================
// CFTC 持仓表格
// ============================================================
function CFTCTable({
  data,
  isLoading,
  dataDate,
  dataSource,
}: {
  data: CFTCPosition[];
  isLoading: boolean;
  dataDate: string;
  dataSource: string;
}) {
  const chartData = data.map((d) => ({
    name: `${d.category}\n${d.segment}`,
    net: d.netContracts,
    fill: d.netPosition === "净多头" ? "#10b981" : "#ef4444",
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* 图表 */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">净持仓分布</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[220px] bg-gray-100 rounded-lg animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 80, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} fontSize={11} />
                <YAxis type="category" dataKey="name" fontSize={11} width={80} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, background: "rgba(15,23,42,0.9)", border: "1px solid rgba(148,163,184,0.15)", color: "#e2e8f0" }}
                  formatter={(v) => [Number(v).toLocaleString() + " 手", "净头寸"]}
                />
                <Bar dataKey="net" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 表格 */}
      <Card className="lg:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">CFTC 期货持仓明细（TFF · Futures Only · 周频）</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>持仓分类</TableHead>
                <TableHead>期限段</TableHead>
                <TableHead className="text-right">净持仓方向</TableHead>
                <TableHead className="text-right">净头寸</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                : data.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{row.category}</TableCell>
                      <TableCell>{row.segment}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={positionColor(row.netPosition)}>
                          {row.netPosition}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        <span className={row.netContracts > 0 ? "text-red-600" : row.netContracts < 0 ? "text-emerald-600" : ""}>
                          {row.netContracts > 0 ? "+" : ""}
                          {(row.netContracts / 1000).toFixed(0)}k
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
          {!isLoading && (
            <div className="mt-3 pt-3 border-t border-slate-700/40 space-y-1">
              <p className="text-xs text-slate-500">
                来源：CFTC Traders in Financial Futures, Futures Only。周频 · 数据截至 {dataDate}
              </p>
              <p className="text-xs text-slate-500">
                注：净头寸 = Long − Short，不含 Spreading。长端为 10Y Note、Ultra 10Y、UST Bond、Ultra UST Bond 合计；
                前端为 2Y Note、5Y Note 合计。
                Dealer/Intermediary 为 CFTC 中介分类，非基差交易直接映射。
              </p>
              <a
                href="https://www.cftc.gov/dea/newcot/FinFutWk.txt"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2"
              >
                原始数据 ↗ (CFTC FinFutWk.txt)
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// TIC 持仓表格
// ============================================================
function TICTable({
  data,
  isLoading,
  dataDate,
  dataSource,
}: {
  data: TICHolding[];
  isLoading: boolean;
  dataDate: string;
  dataSource: string;
}) {
  const displayData = data.slice(0, 12);
  const chartData = displayData.map((d) => ({
    name: d.country,
    amount: d.amount,
    change: d.change,
  })).sort((a, b) => b.amount - a.amount);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* 图表 */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">前12持仓国/地区</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[280px] bg-gray-100 rounded-lg animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 70, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `$${v}B`} fontSize={11} />
                <YAxis type="category" dataKey="name" fontSize={11} width={70} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, background: "rgba(15,23,42,0.9)", border: "1px solid rgba(148,163,184,0.15)", color: "#e2e8f0" }}
                  formatter={(v, n) => {
                    const val = Number(v);
                    return [`$${val}B`, String(n) === "amount" ? "持仓规模" : "月变动"];
                  }}
                />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.change > 0 ? "#ef4444" : entry.change < 0 ? "#10b981" : "#94a3b8"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 表格 */}
      <Card className="lg:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">海外持仓 TIC（月频）</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>国家/地区</TableHead>
                <TableHead className="text-right">持仓规模</TableHead>
                <TableHead className="text-right">月变动</TableHead>
                <TableHead className="text-right">趋势</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                : displayData.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">
                        {row.country}
                        {row.isMajor && (
                          <span className="ml-1 text-xs text-blue-500" title="主要持有国">
                            ●
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">${row.amount}B</TableCell>
                      <TableCell
                        className={`text-right font-mono ${
                          row.change > 0 ? "text-red-600" : row.change < 0 ? "text-emerald-600" : "text-slate-400"
                        }`}
                      >
                        {row.change > 0 ? "+" : ""}
                        {row.change}B
                      </TableCell>
                      <TableCell className={`text-right ${trendColor(row.trend)}`}>
                        {row.trend}
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
          {!isLoading && (
            <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs text-slate-500">
                来源：Treasury TIC SLT Table 5 · 月频 · {dataDate}
              </p>
              <div className="flex items-center gap-3">
                {dataSource && <p className="text-xs text-gray-300">{dataSource}</p>}
                <a
                  href="https://ticdata.treasury.gov/resource-center/data-chart-center/tic/Documents/slt_table5.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2"
                >
                  原始数据 ↗
                </a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// 主组件
// ============================================================
export default function HoldingsModule() {
  const [cftcData, setCftcData] = useState<CFTCPosition[]>([]);
  const [ticData, setTicData] = useState<TICHolding[]>([]);
  const [cftcLoading, setCftcLoading] = useState(true);
  const [ticLoading, setTicLoading] = useState(true);
  const [cftcError, setCftcError] = useState<string | null>(null);
  const [ticError, setTicError] = useState<string | null>(null);
  const [cftcDate, setCftcDate] = useState<string>("");
  const [ticDate, setTicDate] = useState<string>("");
  const [cftcSource, setCftcSource] = useState<string>("");
  const [ticSource, setTicSource] = useState<string>("");

  useEffect(() => {
    // 并行拉取 CFTC 和 TIC 数据
    Promise.all([
      fetch("/api/cftc").then((r) => r.json()),
      fetch("/api/tic").then((r) => r.json()),
    ])
      .then(([cftcJson, ticJson]) => {
        // CFTC
        if (cftcJson.success && Array.isArray(cftcJson.positions)) {
          setCftcData(cftcJson.positions);
          setCftcDate(cftcJson.dataDate || "");
          setCftcSource(cftcJson.dataSource || "");
        } else {
          setCftcError(cftcJson.error || "CFTC 数据加载失败");
        }

        // TIC
        if (ticJson.success && Array.isArray(ticJson.holdings)) {
          setTicData(ticJson.holdings);
          setTicDate(ticJson.dataDate || "");
          setTicSource(ticJson.dataSource || "");
        } else {
          setTicError(ticJson.error || "TIC 数据加载失败");
        }
      })
      .catch((err) => {
        if (cftcLoading) setCftcError(`请求失败: ${err.message}`);
        if (ticLoading) setTicError(`请求失败: ${err.message}`);
      })
      .finally(() => {
        setCftcLoading(false);
        setTicLoading(false);
      });
  }, []);

  return (
    <section id="holdings" className="py-8 px-4 max-w-7xl mx-auto scroll-mt-16">
      <ModuleHeader
        number="02"
        title="持仓与资金流"
        titleEn="Holdings & Fund Flows"
        description="监控期货市场资管机构与杠杆基金的持仓博弈，以及海外官方/私人部门的美债配置动向。"
      />

      <div className="space-y-8">
        {/* CFTC 部分 */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-semibold text-slate-300">
              A. 期货持仓格局
            </h3>
            {cftcDate && (
              <Badge variant="outline" className="text-xs">
                截至 {cftcDate}
              </Badge>
            )}
            {!cftcLoading && !cftcError && (
              <Badge className="text-xs bg-blue-900/20 text-blue-700 border-blue-200">
                周频
              </Badge>
            )}
          </div>

          {cftcError ? (
            <Card className="border-red-700/30 bg-red-900/20">
              <CardContent className="py-6 text-center text-red-600 text-sm">
                {cftcError}
                <br />
                <span className="text-xs text-red-400 mt-1 block">
                  CFTC 数据每周二更新，当前可能暂时不可用
                </span>
              </CardContent>
            </Card>
          ) : (
            <CFTCTable data={cftcData} isLoading={cftcLoading} dataDate={cftcDate} dataSource={cftcSource} />
          )}
        </div>

        {/* TIC 部分 */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-semibold text-slate-300">
              B. 海外持仓结构
            </h3>
            {ticDate && (
              <Badge variant="outline" className="text-xs">
                {ticDate}
              </Badge>
            )}
            {!ticLoading && !ticError && (
              <Badge className="text-xs bg-amber-900/20 text-amber-700 border-amber-200">
                {ticSource.includes("内置") ? "内置·滞后" : "滞后约6周"}
              </Badge>
            )}
          </div>

          {ticError ? (
            <Card className="border-red-700/30 bg-red-900/20">
              <CardContent className="py-6 text-center text-red-600 text-sm">
                {ticError}
                <br />
                <span className="text-xs text-red-400 mt-1 block">
                  TIC 数据每月中旬更新，当前可能尚未发布
                </span>
              </CardContent>
            </Card>
          ) : (
            <TICTable data={ticData} isLoading={ticLoading} dataDate={ticDate} dataSource={ticSource} />
          )}
        </div>
      </div>
    </section>
  );
}
