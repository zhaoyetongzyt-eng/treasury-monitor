"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine, Legend,
  ComposedChart,
} from "recharts";
import type { UKMetricsResponse } from "@/types";

// ============================================================
// 英国视角：Gilt 高息安全垫与价格重定价机会
// 数据来源：
//   - /api/uk-metrics: FRED (BOERUKM, IRLTLT01GBM156N, IRLTLT01DEM156N,
//     DEXUSUK, CPALTT01GBM659N, UNRTUKA, GBRGDPQDSNAQ)
//   2Y/5Y Gilt 参考 Trading Economics / worldgovernmentbonds.com
// ============================================================

// ============================================================
// 子组件：Dashboard 指标卡片
// ============================================================

function DashboardCards({
  metrics,
  dataDate,
  freshness,
}: {
  metrics: UKMetricsResponse["metrics"];
  dataDate: string;
  freshness: string;
}) {
  return (
    <Card className="border-blue-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">UK Gilt Dashboard · 数据快照</CardTitle>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
              <span>{dataDate}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] border ${
                freshness === "实时"
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}>
                {freshness === "实时" ? "✅ FRED 实时" : "⚠ 降级模式"}
              </span>
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* 一句话判断 */}
        <div className="mb-3 p-2.5 rounded-lg bg-blue-50 border border-blue-100">
          <p className="text-xs text-blue-800 leading-relaxed">
            <span className="font-semibold">当前判断：</span>
            高息安全垫仍在，但单纯 carry 不足以覆盖利率/汇率反向波动，
            策略重心应放在中前端 repricing 与跨市场利差交易。
          </p>
        </div>
        {/* 8 指标卡片 */}
        <div className="grid grid-cols-4 gap-2">
          {metrics.map((item) => (
            <div key={item.label} className="text-center p-2 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-[10px] text-gray-500 mb-0.5">{item.label}</p>
              <p className={`text-base font-bold ${
                item.trend === "up" ? "text-red-600" :
                item.trend === "down" ? "text-green-600" :
                "text-gray-800"
              }`}>
                {item.value}
                <span className="text-xs font-normal text-gray-400 ml-0.5">{item.unit}</span>
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{item.sub}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// 子模块 1：基本面压力表（含 CPI vs Bank Rate 折线图 + 五因子 Heatmap）
// ============================================================

function MacroHeatmap({
  macroFactors,
  cpi,
  bankRate,
  unemployment,
  gdpGrowth,
  timeSeries,
}: {
  macroFactors: UKMetricsResponse["macroFactors"];
  cpi: number;
  bankRate: number;
  unemployment: number;
  gdpGrowth: number;
  timeSeries?: UKMetricsResponse["timeSeries"];
}) {
  const impactColor = (impact: string) =>
    impact === "负面" ? "bg-red-100 text-red-700 border-red-200" :
    impact === "正面" ? "bg-green-100 text-green-700 border-green-200" :
    "bg-gray-100 text-gray-600 border-gray-200";

  // CPI vs Bank Rate 折线图数据
  const cpiChartData = (timeSeries?.cpi ?? []).slice(-12).map((pt) => {
    const m = pt.date.slice(5, 7); // "2025-06-01" → "06"
    const bankRatePt = (timeSeries?.bankRate ?? []).find((b) => b.date.slice(0, 7) === pt.date.slice(0, 7));
    return {
      month: `${parseInt(m)}月`,
      "CPI YoY": pt.value,
      "Bank Rate": bankRatePt?.value ?? bankRate,
    };
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-mono">01</span>
          <CardTitle className="text-base">UK 基本面：Higher for Longer 的粘性来源</CardTitle>
        </div>
        <p className="text-xs text-gray-500">
          核心矛盾不是"强增长支持加息"，而是"弱增长不足以触发快速降息，而通胀与工资粘性又迫使 BoE 保持谨慎"
        </p>
      </CardHeader>
      <CardContent>
        {/* 五因子 Heatmap（通胀 / 工资 / 就业 / 增长 / 财政） */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          {[
            { factor: "通胀粘性", indicator: "CPI YoY", value: `${cpi}%`, meaning: cpi > 2.5 ? "高于2%目标" : "趋近目标", impact: cpi > 2.5 ? ("负面" as const) : ("正面" as const) },
            { factor: "工资增速", indicator: "AWE YoY", value: "~5.0%", meaning: "工资粘性 → 服务通胀", impact: ("负面" as const) },
            { factor: "劳动力", indicator: "失业率", value: `${unemployment}%`, meaning: unemployment < 5 ? "偏紧有粘性" : "明显降温", impact: unemployment < 5 ? ("负面" as const) : ("正面" as const) },
            { factor: "增长动能", indicator: "GDP QoQ", value: `${gdpGrowth > 0 ? "+" : ""}${gdpGrowth}%`, meaning: gdpGrowth < 0.8 ? "偏弱 → 支持降息" : "稳健", impact: gdpGrowth < 0.8 ? ("正面" as const) : ("负面" as const) },
            { factor: "财政压力", indicator: "赤字/GDP", value: "~4.5%", meaning: "财政空间偏紧 → 长端溢价", impact: ("负面" as const) },
          ].map((f) => (
            <div key={f.factor} className={`p-2.5 rounded-lg border text-center ${impactColor(f.impact)}`}>
              <p className="text-[11px] font-semibold">{f.factor}</p>
              <p className="text-[10px] text-gray-500">{f.indicator}</p>
              <p className="text-lg font-bold mt-0.5">{f.value}</p>
              <p className="text-[10px] leading-tight mt-0.5">{f.meaning}</p>
            </div>
          ))}
        </div>

        {/* CPI vs Bank Rate 折线图 */}
        {cpiChartData.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-600 mb-2">CPI YoY vs Bank Rate（近 12 个月）</h4>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cpiChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" fontSize={11} />
                  <YAxis fontSize={11} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine y={2} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "目标 2%", fontSize: 10, fill: "#ef4444" }} />
                  <Line type="monotone" dataKey="CPI YoY" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Bank Rate" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 关键数据对比表 */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-1.5 font-medium text-gray-500">指标</th>
                <th className="text-right py-1.5 font-medium text-gray-500">UK</th>
                <th className="text-right py-1.5 font-medium text-gray-500">Euro Area</th>
                <th className="text-right py-1.5 font-medium text-gray-500">差值</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-1.5 text-gray-700">CPI YoY</td>
                <td className="py-1.5 text-right font-medium">{cpi}%</td>
                <td className="py-1.5 text-right text-gray-500">~2.2%</td>
                <td className="py-1.5 text-right text-red-600">+{(cpi - 2.2).toFixed(1)}pp</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-1.5 text-gray-700">政策利率</td>
                <td className="py-1.5 text-right font-medium">{bankRate.toFixed(2)}%</td>
                <td className="py-1.5 text-right text-gray-500">2.00%</td>
                <td className="py-1.5 text-right text-red-600">+{(bankRate - 2.0).toFixed(2)}pp</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-1.5 text-gray-700">失业率</td>
                <td className="py-1.5 text-right font-medium">{unemployment}%</td>
                <td className="py-1.5 text-right text-gray-500">~6.2%</td>
                <td className="py-1.5 text-right text-green-600">{(unemployment - 6.2).toFixed(1)}pp</td>
              </tr>
              <tr>
                <td className="py-1.5 text-gray-700">GDP 增长</td>
                <td className="py-1.5 text-right font-medium">{gdpGrowth > 0 ? "+" : ""}{gdpGrowth}%</td>
                <td className="py-1.5 text-right text-gray-500">~0.3%</td>
                <td className="py-1.5 text-right text-gray-500">{(gdpGrowth - 0.3).toFixed(1)}pp</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-gray-400 flex justify-between flex-wrap gap-2">
          <span>来源：ONS CPI · GDP · Labour Market · BoE Bank Rate</span>
          <span className="flex gap-2">
            <a href="https://www.ons.gov.uk/economy/inflationandpriceindices" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline underline-offset-2">ONS CPI ↗</a>
            <a href="https://www.ons.gov.uk/employmentandlabourmarket" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline underline-offset-2">ONS Labour ↗</a>
            <a href="https://www.bankofengland.co.uk/monetary-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline underline-offset-2">BoE ↗</a>
          </span>
        </p>
      </CardContent>
    </Card>
  );
}

// ============================================================
// 子模块 2：Carry Cushion Calculator
// ============================================================

function CarryCushionCalc({
  carryCalc,
  gilt5Y,
  bankRate,
}: {
  carryCalc: UKMetricsResponse["carryCalc"];
  gilt5Y: number;
  bankRate: number;
}) {
  const { hedgedCarry, duration, bullCase, bearCase } = carryCalc;

  const chartData = [
    { name: "静态 Carry", value: hedgedCarry / 100, fill: "#3B82F6", label: `+${hedgedCarry}bp` },
    { name: "Bull 价格收益", value: bullCase.priceReturn / 100, fill: "#22C55E", label: `+${bullCase.priceReturn.toFixed(1)}%` },
    { name: "Bull 总回报", value: bullCase.totalReturn / 100, fill: "#166534", label: `+${bullCase.totalReturn.toFixed(1)}%` },
    { name: "Bear 价格亏损", value: bearCase.priceReturn / 100, fill: "#EF4444", label: `${bearCase.priceReturn.toFixed(1)}%` },
    { name: "Bear 净回报", value: bearCase.totalReturn / 100, fill: "#991B1B", label: `${bearCase.totalReturn.toFixed(1)}%` },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-mono">02</span>
          <CardTitle className="text-base">Carry Cushion：套息是安全垫，不是主收益来源</CardTitle>
        </div>
        <p className="text-xs text-red-600 font-medium mt-1">
          ⚠ 纯粹为了几十 bp 套息配置英债的落地案例并不多。英债配置的核心是判断收益率未来存在下行空间；较高 carry 只是容错垫。若行情不及预期，票息收益可以缓冲短期波动；若收益率如预期下行，则可同时获得利息收益与债券价格上涨收益。
        </p>
        <p className="text-xs text-gray-500 mt-1">
          对冲成本参考：SONIA（Sterling Overnight Index Average，BoE 管理）≈ Bank Rate，反映英镑隔夜资金成本
        </p>
      </CardHeader>
      <CardContent>
        {/* 公式 */}
        <div className="mb-3 p-2.5 rounded-lg bg-gray-50 border border-gray-200 font-mono text-xs text-gray-700">
          <p>Hedged Carry ≈ Gilt Yield − GBP Hedge Cost</p>
          <p>Price Return ≈ −Modified Duration × ΔYield</p>
          <p>Total Return ≈ Hedged Carry + Price Return</p>
        </div>

        {/* 三情景卡片 */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-center">
            <p className="text-[11px] font-semibold text-blue-700 mb-1">Base Carry</p>
            <p className="text-xl font-bold text-blue-600">+{hedgedCarry}bp</p>
            <p className="text-[10px] text-blue-500 mt-0.5">
              {gilt5Y.toFixed(2)}% − {bankRate.toFixed(2)}%
            </p>
          </div>
          <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-center">
            <p className="text-[11px] font-semibold text-green-700 mb-1">Bull Case ↓25bp</p>
            <p className="text-xl font-bold text-green-600">+{bullCase.priceReturn.toFixed(1)}%</p>
            <p className="text-[10px] text-green-500 mt-0.5">
              总计约 +{bullCase.totalReturn.toFixed(1)}%
            </p>
          </div>
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-center">
            <p className="text-[11px] font-semibold text-red-700 mb-1">Bear Case ↑20bp</p>
            <p className="text-xl font-bold text-red-600">{bearCase.priceReturn.toFixed(1)}%</p>
            <p className="text-[10px] text-red-500 mt-0.5">
              净值约 {bearCase.totalReturn.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* 条形图 */}
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 40, left: 80, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => `${(v * 100).toFixed(1)}%`} fontSize={11} />
              <YAxis type="category" dataKey="name" fontSize={11} width={80} />
              <Tooltip formatter={(value) => `${(Number(value) * 100).toFixed(1)}%`} />
              <ReferenceLine x={0} stroke="#9CA3AF" />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <p className="mt-1 text-[10px] text-gray-400 italic">
          以 5Y Gilt 为例，久期约 {duration} 年。若收益率下行 25bp → 价格收益约 +{bullCase.priceReturn.toFixed(1)}%；
          若上行 20bp → 价格损失约 {Math.abs(bearCase.priceReturn).toFixed(1)}%，基本抹平全年 carry。
        </p>

        <p className="mt-3 text-xs text-gray-400 flex justify-between flex-wrap gap-2">
          <span>来源：FRED (BOERUKM) · SONIA (BoE) · 5Y Gilt 参考 Trading Economics</span>
          <span className="flex gap-2">
            <a href="https://zh.tradingeconomics.com/united-kingdom/government-bond-yield" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline underline-offset-2">Gilt Yields ↗</a>
            <a href="https://fred.stlouisfed.org/series/BOERUKM" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline underline-offset-2">Bank Rate ↗</a>
            <a href="https://www.bankofengland.co.uk/markets/sonia-benchmark" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline underline-offset-2">SONIA ↗</a>
          </span>
        </p>
      </CardContent>
    </Card>
  );
}

// ============================================================
// 子模块 3：Tenor Playbook（期限分层策略）
// ============================================================

function TenorPlaybook() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-mono">03</span>
          <CardTitle className="text-base">Tenor Playbook：中前端赚重定价，长端赚风险溢价压缩</CardTitle>
        </div>
        <p className="text-xs text-gray-500">
          中前端英债的关键词是 BoE repricing；长端英债的关键词是 fiscal credibility 和 term premium
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* 左栏：2-5Y */}
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <h4 className="text-sm font-bold text-blue-800 mb-2">2–5Y Gilt</h4>
            <p className="text-xs text-blue-600 mb-3 font-medium">
              适合 carry + roll-down + BoE repricing
            </p>
            <ul className="space-y-1.5">
              {[
                "短端受 Bank Rate 和 SONIA 锚定",
                "2–5Y 对未来降息路径最敏感",
                "久期不高，carry cushion 更有意义",
                "若 BoE 降息预期重定价，5Y 价格弹性明显",
              ].map((item, i) => (
                <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                  <span className="text-blue-500 mt-0.5">●</span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-3 text-[10px] text-blue-500 font-mono">
              数据源：BoE Daily Yield Curve · SONIA · ONS CPI/Wage
            </div>
          </div>

          {/* 右栏：10Y+ */}
          <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
            <h4 className="text-sm font-bold text-purple-800 mb-2">10Y+ Gilt</h4>
            <p className="text-xs text-purple-600 mb-3 font-medium">
              更像财政风险溢价压缩交易
            </p>
            <ul className="space-y-1.5">
              {[
                "10Y 以上久期较高，价格波动可迅速吞掉 carry",
                "财政可信度、Gilt 供给、QT 影响更大",
                "适合表达「市场对 UK 财政风险过度悲观」的观点",
                "政治不确定性对长端影响显著高于中前端",
              ].map((item, i) => (
                <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                  <span className="text-purple-500 mt-0.5">●</span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-3 text-[10px] text-purple-500 font-mono">
              数据源：DMO Gilt Supply · BoE APF/QT · OBR Fiscal Outlook
            </div>
          </div>
        </div>

        <p className="mt-3 text-xs text-gray-400 flex justify-between flex-wrap gap-2">
          <span>来源：BoE Yield Curve · DMO Gilt Operations · OBR</span>
          <span className="flex gap-2">
            <a href="https://www.bankofengland.co.uk/statistics/yield-curves" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline underline-offset-2">BoE 收益率曲线 ↗</a>
            <a href="https://www.dmo.gov.uk/data/gilt-market/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline underline-offset-2">DMO ↗</a>
          </span>
        </p>
      </CardContent>
    </Card>
  );
}

// ============================================================
// 子模块 4：Relative Value（跨市场利差）
// ============================================================

function RelativeValue({
  gilt10Y,
  bund10Y,
  ukDeSpread,
  bankRate,
  ecbRate,
  timeSeries,
}: {
  gilt10Y: number;
  bund10Y: number;
  ukDeSpread: number;
  bankRate: number;
  ecbRate: number;
  timeSeries?: UKMetricsResponse["timeSeries"];
}) {
  // Gilt vs Bund 折线图数据
  const spreadLineData = (timeSeries?.gilt10Y ?? []).slice(-12).map((pt) => {
    const m = pt.date.slice(5, 7);
    const bundPt = (timeSeries?.bund10Y ?? []).find((b) => b.date.slice(0, 7) === pt.date.slice(0, 7));
    const bundVal = bundPt?.value ?? bund10Y;
    return {
      month: `${parseInt(m)}月`,
      "10Y Gilt": pt.value,
      "10Y Bund": bundVal,
      "UK-DE Spread (bp)": Math.round((pt.value - bundVal) * 100),
    };
  });

  // UK-DE Spread 面积图数据
  const spreadAreaData = spreadLineData.map((d) => ({
    month: d.month,
    "UK-DE Spread (bp)": d["UK-DE Spread (bp)"],
  }));

  // BoE vs ECB 对比图数据
  const policyData = (timeSeries?.bankRate ?? []).slice(-12).map((pt) => {
    const m = pt.date.slice(5, 7);
    const ecbPt = (timeSeries?.ecbRate ?? []).find((e) => e.date.slice(0, 7) === pt.date.slice(0, 7));
    return {
      month: `${parseInt(m)}月`,
      "BoE Bank Rate": pt.value,
      "ECB Deposit Rate": ecbPt?.value ?? ecbRate,
    };
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-mono">04</span>
          <CardTitle className="text-base">Relative Value：Long Gilt vs Short Bund / OAT</CardTitle>
        </div>
        <p className="text-xs text-gray-500">
          英债相对欧债的机会，不是简单买高收益率资产，而是判断英国相对欧元区的通胀粘性、政策路径、财政风险溢价是否被过度定价
        </p>
      </CardHeader>
      <CardContent>
        {/* 10Y Gilt vs Bund 折线图 */}
        {spreadLineData.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-600 mb-2">UK vs DE 10Y 国债收益率走势（近 12 个月）</h4>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={spreadLineData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" fontSize={11} />
                  <YAxis fontSize={11} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="10Y Gilt" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="10Y Bund" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* UK-DE Spread 面积图 */}
        {spreadAreaData.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-600 mb-2">UK-DE 10Y Spread 走势（bp）</h4>
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={spreadAreaData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" fontSize={11} />
                  <YAxis fontSize={11} tickFormatter={(v) => `${v}bp`} />
                  <Tooltip formatter={(value) => `${Number(value)}bp`} />
                  <ReferenceLine y={0} stroke="#9CA3AF" />
                  <Bar dataKey="UK-DE Spread (bp)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* BoE vs ECB 政策利率对比 */}
        {policyData.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-600 mb-2">BoE Bank Rate vs ECB Deposit Rate（近 12 个月）</h4>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={policyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" fontSize={11} />
                  <YAxis fontSize={11} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="BoE Bank Rate" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="ECB Deposit Rate" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 对比表 */}
        <div className="overflow-x-auto mb-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-1.5 font-medium text-gray-500">指标</th>
                <th className="text-right py-1.5 font-medium text-gray-500">UK</th>
                <th className="text-right py-1.5 font-medium text-gray-500">Euro Area / Germany</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-1.5 text-gray-700">政策利率</td>
                <td className="py-1.5 text-right font-bold text-blue-700">{bankRate.toFixed(2)}%</td>
                <td className="py-1.5 text-right text-gray-600">ECB {ecbRate.toFixed(2)}%</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-1.5 text-gray-700">10Y 国债收益率</td>
                <td className="py-1.5 text-right font-bold text-blue-700">{gilt10Y.toFixed(2)}%</td>
                <td className="py-1.5 text-right text-gray-600">{bund10Y.toFixed(2)}%</td>
              </tr>
              <tr>
                <td className="py-1.5 text-gray-700">10Y 利差 (UK−DE)</td>
                <td className="py-1.5 text-right font-bold text-purple-700" colSpan={2}>
                  +{ukDeSpread}bp
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-500 font-medium mb-1">
          若英国风险溢价回落，Long Gilt / Short Bund 的相对价值交易可以降低一部分全球利率方向风险。
        </p>

        <p className="mt-3 text-xs text-gray-400 flex justify-between flex-wrap gap-2">
          <span>来源：FRED (IRLTLT01GBM156N · IRLTLT01DEM156N · BOERUKM · ECBDFR)</span>
          <span className="flex gap-2">
            <a href="https://fred.stlouisfed.org/series/IRLTLT01GBM156N" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline underline-offset-2">UK 10Y ↗</a>
            <a href="https://fred.stlouisfed.org/series/IRLTLT01DEM156N" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline underline-offset-2">DE 10Y ↗</a>
            <a href="https://zh.tradingeconomics.com/united-kingdom/government-bond-yield" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline underline-offset-2">Gilt Yields ↗</a>
            <a href="https://zh.tradingeconomics.com/germany/government-bond-yield" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline underline-offset-2">Bund Yields ↗</a>
          </span>
        </p>
      </CardContent>
    </Card>
  );
}

// ============================================================
// 子模块 5：供给与拍卖
// ============================================================

function SupplyAndAuction() {
  // 示例拍卖结果（实际数据需从 DMO 拉取，当前为示意结构）
  const exampleAuctions = [
    { date: "2026-05-28", name: "4¼% Treasury Gilt 2031", tenor: "5Y", amount: "£4.0bn", yield: "4.41%", btc: "2.3x" },
    { date: "2026-05-21", name: "4⅛% Treasury Gilt 2036", tenor: "10Y", amount: "£3.5bn", yield: "4.58%", btc: "2.1x" },
    { date: "2026-05-14", name: "1½% Index-linked Gilt 2053", tenor: "27Y IL", amount: "£0.9bn", yield: "1.12%", btc: "2.5x" },
    { date: "2026-05-07", name: "4½% Treasury Gilt 2033", tenor: "7Y", amount: "£4.2bn", yield: "4.47%", btc: "2.0x" },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-mono">05</span>
          <CardTitle className="text-base">Supply & Auction：Gilt 供给结构与拍卖需求</CardTitle>
        </div>
        <p className="text-xs text-gray-500">
          发行结构变化（短中端增发、长端减量）正在改变 Gilt 曲线供需格局
        </p>
      </CardHeader>
      <CardContent>
        {/* 供给结构概览 */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "Short Gilts (1-7Y)", share: "~35%", note: "T-bills + Short Gilts 增发趋势" },
            { label: "Medium Gilts (7-15Y)", share: "~28%", note: "传统核心发行区间" },
            { label: "Long Gilts (15Y+)", share: "~22%", note: "2026/27 占比预计降至多年低位" },
          ].map((item) => (
            <div key={item.label} className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-center">
              <p className="text-xs font-semibold text-gray-700">{item.label}</p>
              <p className="text-xl font-bold text-gray-800">{item.share}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{item.note}</p>
            </div>
          ))}
        </div>

        {/* 已完成拍卖表格 */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-600 mb-2">已完成拍卖（示例 — DMO Auction Results）</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1.5 font-medium text-gray-500">日期</th>
                  <th className="text-left py-1.5 font-medium text-gray-500">Gilt 名称</th>
                  <th className="text-right py-1.5 font-medium text-gray-500">期限</th>
                  <th className="text-right py-1.5 font-medium text-gray-500">规模</th>
                  <th className="text-right py-1.5 font-medium text-gray-500">平均收益率</th>
                  <th className="text-right py-1.5 font-medium text-gray-500">Bid-to-Cover</th>
                </tr>
              </thead>
              <tbody>
                {exampleAuctions.map((a, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1.5 text-gray-700">{a.date}</td>
                    <td className="py-1.5 text-gray-700">{a.name}</td>
                    <td className="py-1.5 text-right text-gray-600">{a.tenor}</td>
                    <td className="py-1.5 text-right font-medium">{a.amount}</td>
                    <td className="py-1.5 text-right font-medium text-blue-700">{a.yield}</td>
                    <td className="py-1.5 text-right font-medium text-gray-700">{a.btc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-gray-400 mt-1 italic">注：拍卖数据为示例格式，实时数据请访问 DMO 官网获取。</p>
        </div>

        {/* 即将发行 + 供给压力评分 */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-lg border border-blue-200 bg-blue-50">
            <h4 className="text-xs font-semibold text-blue-800 mb-2">即将发行（最近 2 周）</h4>
            <div className="space-y-1.5">
              {[
                { date: "2026-06-04", name: "4⅛% Treasury 2038", tenor: "12Y", amount: "£3.8bn" },
                { date: "2026-06-11", name: "0⅛% IL Gilt 2048", tenor: "22Y IL", amount: "£1.1bn" },
              ].map((item, i) => (
                <div key={i} className="text-xs text-blue-700 flex justify-between">
                  <span>{item.date} · {item.name}</span>
                  <span className="font-medium">{item.amount}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="p-3 rounded-lg border border-amber-200 bg-amber-50">
            <h4 className="text-xs font-semibold text-amber-800 mb-2">供给压力评分</h4>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">中等</p>
              <p className="text-[10px] text-amber-700 mt-1">未来 1 个月发行规模 vs 历史均值</p>
              <div className="mt-2 w-full bg-amber-200 rounded-full h-1.5">
                <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: "55%" }} />
              </div>
              <p className="text-[10px] text-amber-600 mt-1">约历史 55 分位</p>
            </div>
          </div>
        </div>

        {/* 关键变化解读 */}
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 mb-3">
          <h4 className="text-xs font-semibold text-amber-800 mb-1">供给变革策略</h4>
          <p className="text-xs text-amber-700 leading-relaxed">
            英国政府提升 T-bills 和短端发行、压降长端 Gilt 占比（2026/27 长端占比预计降至多年低位），
            本质上会改变曲线供需结构——中前端供给增加但消化压力可控，长端供给减少有利于期限溢价压缩。
            对照 IL Gilts（通胀挂钩），常规 Gilt 供给结构变化也是跨市场利差交易的重要输入。
          </p>
        </div>

        {/* DMO 链接 */}
        <div className="grid grid-cols-2 gap-3 mb-2">
          <a
            href="https://www.dmo.gov.uk/publications/gilt-operations-calendar/"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
          >
            <p className="text-sm font-semibold text-blue-700 group-hover:text-blue-800">Gilt 发行日历 ↗</p>
            <p className="text-[11px] text-gray-500 mt-0.5">DMO Gilt Operations Calendar</p>
          </a>
          <a
            href="https://www.dmo.gov.uk/data/gilt-market/auction-results/"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
          >
            <p className="text-sm font-semibold text-blue-700 group-hover:text-blue-800">拍卖结果 ↗</p>
            <p className="text-[11px] text-gray-500 mt-0.5">DMO Gilt Auction Results</p>
          </a>
        </div>

        <p className="text-[10px] text-gray-400 italic">
          DMO 在财政年度开始前发布发行日历，每季度细化具体拍卖债券，拍卖前一周加入规模信息。
          详细拍卖数据（品种、期限、规模、收益率、bid-to-cover）可直接访问 DMO 官网获取。
        </p>

        <p className="mt-3 text-xs text-gray-400 flex justify-between flex-wrap gap-2">
          <span>来源：DMO Gilt Operations · Reuters · OBR</span>
          <span className="flex gap-2">
            <a href="https://www.dmo.gov.uk/data/gilt-market/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline underline-offset-2">DMO 数据 ↗</a>
            <a href="https://www.dmo.gov.uk/publications/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline underline-offset-2">DMO 公告 ↗</a>
          </span>
        </p>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Skeleton
// ============================================================

function UKSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3 w-64 mt-1" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="text-center p-2 rounded-lg bg-gray-50">
              <Skeleton className="h-3 w-16 mx-auto mb-1" />
              <Skeleton className="h-6 w-20 mx-auto" />
              <Skeleton className="h-3 w-24 mx-auto mt-1" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// 主组件
// ============================================================

export default function UKSubModule() {
  const [data, setData] = useState<UKMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const res = await fetch("/api/uk-metrics");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: UKMetricsResponse = await res.json();
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "数据加载失败");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="lg:col-span-2">
      {/* 分区标题 */}
      <div className="flex items-center gap-3 mb-4 mt-2">
        <div className="h-px flex-1 bg-gray-200" />
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200">
          <span className="w-3 h-3 rounded-full bg-indigo-500" />
          <span className="text-sm font-semibold text-indigo-700">英国视角</span>
          <span className="text-xs text-indigo-400">UK Gilt Lens</span>
        </div>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      {loading ? (
        <div className="space-y-4">
          <UKSkeleton />
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-64" />
                <Skeleton className="h-3 w-96 mt-1" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[120px] w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error || !data ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">英国视角：Gilt 高息安全垫与价格重定价机会</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-500 mb-2">数据加载失败{error ? `: ${error}` : ""}</p>
            <p className="text-xs text-gray-500">请检查 FRED API Key 配置或稍后重试。</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* 模块标题 + 一句话 */}
          <div className="mb-2">
            <h2 className="text-lg font-bold text-gray-800">
              英国视角：Gilt 高息安全垫与价格重定价机会
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              UK Gilt Lens: Carry Cushion + Repricing Trade
            </p>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed max-w-3xl">
              英债配置的核心并非单纯博取几十 bp 套息，而是在高起始收益率下获得 carry cushion，
              并叠加 BoE 降息重定价、曲线 roll-down、跨市场利差收敛与长端期限溢价压缩的潜在资本利得。
            </p>
          </div>

          {/* Dashboard 指标卡片 */}
          <DashboardCards
            metrics={data.metrics}
            dataDate={data.dataDate}
            freshness={data.freshness.status}
          />

          {/* 子模块 1-5 */}
          <MacroHeatmap
            macroFactors={data.macroFactors}
            cpi={data.cpi}
            bankRate={data.bankRate}
            unemployment={data.unemployment}
            gdpGrowth={data.gdpGrowth}
            timeSeries={data.timeSeries}
          />

          <CarryCushionCalc
            carryCalc={data.carryCalc}
            gilt5Y={data.gilt5Y}
            bankRate={data.bankRate}
          />

          <TenorPlaybook />

          <RelativeValue
            gilt10Y={data.gilt10Y}
            bund10Y={data.bund10Y}
            ukDeSpread={data.ukDeSpread}
            bankRate={data.bankRate}
            ecbRate={data.ecbRate}
            timeSeries={data.timeSeries}
          />

          <SupplyAndAuction />
        </div>
      )}

      {/* 数据来源引用 */}
      <div className="mt-4 pt-3 border-t border-indigo-100">
        <p className="text-xs text-gray-400 flex justify-between flex-wrap gap-2">
          <span>
            数据来源：FRED (BOERUKM · IRLTLT01GBM156N · IRLTLT01DEM156N · DEXUSUK · CPALTT01GBM659N · UNRTUKA · GBRGDPQDSNAQ)
            · BoE Yield Curve · DMO · ONS · Trading Economics
            {data && data.freshness.status !== "实时" && (
              <span className="ml-1 text-amber-500">（{data.freshness.status}，部分数据来自内置 benchmark）</span>
            )}
          </span>
          <span className="flex gap-3">
            <a href="https://www.bankofengland.co.uk/statistics/yield-curves" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline underline-offset-2">BoE ↗</a>
            <a href="https://www.dmo.gov.uk/data/gilt-market/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline underline-offset-2">DMO ↗</a>
            <a href="https://www.ons.gov.uk/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline underline-offset-2">ONS ↗</a>
            <a href="https://fred.stlouisfed.org/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline underline-offset-2">FRED ↗</a>
            <a href="https://zh.tradingeconomics.com/united-kingdom/government-bond-yield" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline underline-offset-2">Trading Economics ↗</a>
          </span>
        </p>
      </div>
    </div>
  );
}
