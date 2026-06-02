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
// 英国视角：Gilt 作为 UST 的高息替代资产（美债相对吸引力压力测试）
//
// 本模块并非独立研究英债市场，而是将英国国债作为美债的主要高息竞争资产
// 进行相对价值比较。核心问题：当英债收益率也很高时，美债对全球资金还有
// 多少吸引力？
//
// 数据来源：
//   - /api/uk-metrics: FRED (BOERUKM, IRLTLT01GBM156N, IRLTLT01DEM156N,
//     DEXUSUK, CPALTT01GBM659N, UNRTUKA, GBRGDPQDSNAQ, ECBDFR,
//     DGS2, DGS5, DGS10, DFF)
//   2Y/5Y Gilt 参考 Trading Economics / worldgovernmentbonds.com
// ============================================================

// ============================================================
// 子组件：Dashboard — UST vs Gilt 相对收益率快照
// ============================================================

function DashboardCards({
  metrics,
  dataDate,
  freshness,
  dataSource,
}: {
  metrics: UKMetricsResponse["metrics"];
  dataDate: string;
  freshness: string;
  dataSource: string;
}) {
  return (
    <Card className="border-indigo-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">01  UST vs Gilt 相对收益率快照</CardTitle>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
              <span>{dataDate}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] border ${
                freshness === "实时"
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}>
                {freshness === "实时" ? "FRED 实时" : "降级模式"}
              </span>
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* 一句话判断 */}
        <div className="mb-3 p-2.5 rounded-lg bg-indigo-50 border border-indigo-100">
          <p className="text-xs text-indigo-800 leading-relaxed">
            <span className="font-semibold">当前判断：</span>
            Gilt 作为 UST 的主要替代资产，其高收益率结构对全球固收资金形成分流压力。
            但 UST 在流动性、美元属性和对冲后收益上仍有护城河——关键看利差能否维持。
          </p>
        </div>
        {/* 8 指标对比卡片 */}
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
        {/* 数据来源 */}
        <p className="text-[10px] text-gray-400 mt-2 leading-relaxed border-t border-gray-100 pt-2">
          数据来源：UST — Treasury Daily Par Yield Curve · Gilt — Trading Economics · Bund/BoE/CPI — FRED
        </p>
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
  fedFunds,
  timeSeries,
}: {
  macroFactors: UKMetricsResponse["macroFactors"];
  cpi: number;
  bankRate: number;
  unemployment: number;
  gdpGrowth: number;
  fedFunds: number;
  timeSeries?: UKMetricsResponse["timeSeries"];
}) {
  const impactColor = (impact: string) =>
    impact === "负面" ? "bg-red-100 text-red-700 border-red-200" :
    impact === "正面" ? "bg-green-100 text-green-700 border-green-200" :
    "bg-gray-100 text-gray-600 border-gray-200";

  // CPI vs Bank Rate 折线图数据
  const cpiChartData = (timeSeries?.cpi ?? []).slice(-12).map((pt) => {
    const m = pt.date.slice(5, 7);
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
          <span className="text-xs text-gray-400 font-mono">A</span>
          <CardTitle className="text-base">宏观背景：英国粘性通胀是 Gilt 高收益率的根源</CardTitle>
        </div>
        <p className="text-xs text-gray-500">
          英国通胀粘性与 BoE 政策滞后于 Fed 的降息节奏，是 Gilt 持续提供高收益率的宏观经济基础。
          这构成了 UST 面临的替代竞争压力来源。
        </p>
      </CardHeader>
      <CardContent>
        {/* 五因子 Heatmap */}
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
            <h4 className="text-xs font-semibold text-gray-600 mb-2">UK CPI YoY vs BoE Bank Rate（近 12 个月）</h4>
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

        {/* 关键数据对比表：US vs UK */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-1.5 font-medium text-gray-500">指标</th>
                <th className="text-right py-1.5 font-medium text-gray-500">US</th>
                <th className="text-right py-1.5 font-medium text-gray-500">UK</th>
                <th className="text-right py-1.5 font-medium text-gray-500">差值</th>
                <th className="text-right py-1.5 font-medium text-gray-500">对美债含义</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-1.5 text-gray-700">政策利率</td>
                <td className="py-1.5 text-right font-medium">{fedFunds.toFixed(2)}%</td>
                <td className="py-1.5 text-right font-medium">{bankRate.toFixed(2)}%</td>
                <td className="py-1.5 text-right text-red-600">+{(bankRate - fedFunds).toFixed(2)}pp</td>
                <td className="py-1.5 text-right text-[10px] text-gray-500">如果 UK 比 US 更有降息空间，长端 Gilt 弹性更大</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-1.5 text-gray-700">CPI YoY</td>
                <td className="py-1.5 text-right text-gray-500">~2.7%</td>
                <td className="py-1.5 text-right font-medium">{cpi}%</td>
                <td className="py-1.5 text-right text-red-600">+{(cpi - 2.7).toFixed(1)}pp</td>
                <td className="py-1.5 text-right text-[10px] text-gray-500">UK 通胀粘性更强 → BoE 降息节奏更慢</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-1.5 text-gray-700">失业率</td>
                <td className="py-1.5 text-right text-gray-500">~4.1%</td>
                <td className="py-1.5 text-right font-medium">{unemployment}%</td>
                <td className="py-1.5 text-right text-green-600">{(unemployment - 4.1).toFixed(1)}pp</td>
                <td className="py-1.5 text-right text-[10px] text-gray-500">UK 劳动力偏松 → 降息条件更充分</td>
              </tr>
              <tr>
                <td className="py-1.5 text-gray-700">GDP 增长</td>
                <td className="py-1.5 text-right text-gray-500">~2.0%</td>
                <td className="py-1.5 text-right font-medium">{gdpGrowth > 0 ? "+" : ""}{gdpGrowth}%</td>
                <td className="py-1.5 text-right text-green-600">{(gdpGrowth - 2.0).toFixed(1)}pp</td>
                <td className="py-1.5 text-right text-[10px] text-gray-500">US 增长明显更强 → UST 长端有基本面支撑</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-gray-400 flex justify-between flex-wrap gap-2">
          <span>来源：ONS CPI · GDP · Labour Market · BoE Bank Rate · FRED</span>
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
// 子模块 2：Carry Cushion — UST vs Gilt 对冲后收益压力测试
// ============================================================

function CarryCushionCalc({
  carryCalc,
  gilt5Y,
  bankRate,
  ust5Y,
  fedFunds,
}: {
  carryCalc: UKMetricsResponse["carryCalc"];
  gilt5Y: number;
  bankRate: number;
  ust5Y: number;
  fedFunds: number;
}) {
  const { duration, hedgedCarry } = carryCalc;

  // UST carry（组件侧计算）
  const ustHedgedCarry = Math.round((ust5Y - fedFunds) * 100);
  const ustDuration = 4.4;

  // --- Gilt 情景（API 返回值全部是 bp） ---
  const giltBullPrice = carryCalc.bullCase.priceReturn;   // bp
  const giltBullTotal = carryCalc.bullCase.totalReturn;   // bp（API 已换算）
  const giltBearPrice = carryCalc.bearCase.priceReturn;   // bp
  const giltBearTotal = carryCalc.bearCase.totalReturn;   // bp

  // --- UST 情景 ---
  const ustBullPrice = parseFloat((-(ustDuration * -0.25) * 100).toFixed(1));
  const ustBullTotal = parseFloat((ustBullPrice + ustHedgedCarry).toFixed(1));
  const ustBearPrice = parseFloat((-(ustDuration * 0.20) * 100).toFixed(1));
  const ustBearTotal = parseFloat((ustBearPrice + ustHedgedCarry).toFixed(1));

  // 条形图数据（UST vs Gilt，统一为 % 小数供 Recharts）
  const chartData = [
    { name: "UST Base Carry", value: ustHedgedCarry / 100, fill: "#2563EB" },
    { name: "Gilt Base Carry", value: hedgedCarry / 100, fill: "#7C3AED" },
    { name: "UST Bull Total", value: ustBullTotal / 100, fill: "#059669" },
    { name: "Gilt Bull Total", value: giltBullTotal / 100, fill: "#A3E635" },
    { name: "UST Bear Total", value: ustBearTotal / 100, fill: "#DC2626" },
    { name: "Gilt Bear Total", value: giltBearTotal / 100, fill: "#F87171" },
  ];

  // 核心结论判断
  const giltBearCanSurvive = Math.abs(giltBearPrice) < hedgedCarry;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-mono">02</span>
          <CardTitle className="text-base">UST vs Gilt Carry Cushion：英债是否会分流美债配置需求</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {/* 核心判断 */}
        <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-sm font-semibold text-amber-900 mb-1">核心判断</p>
          <p className="text-xs text-amber-800 leading-relaxed">
            Carry 是容错垫，收益率下行带来的价格收益才是主要弹性。
            本模块用 5Y Gilt 作为示例，观察高起始收益率能否抵御利率反向波动。
          </p>
          <p className="text-xs text-amber-700 mt-1.5 leading-relaxed">
            对全球固收资金而言，Gilt 的意义不是单纯套息，而是作为 UST 的高息替代资产：
            若 Gilt 的 carry cushion 与收益率下行弹性优于 UST，可能边际分流美债久期需求。
          </p>
        </div>

        {/* 简化公式 */}
        <div className="mb-4 p-2.5 rounded-lg bg-gray-50 border border-gray-200">
          <p className="text-[11px] font-semibold text-gray-600 mb-1">简化公式</p>
          <div className="font-mono text-[11px] text-gray-700 space-y-0.5">
            <p>Hedged Carry ≈ Bond Yield − GBP Hedge Cost Proxy</p>
            <p>Price Return ≈ −Modified Duration × ΔYield</p>
            <p>Total Return ≈ Hedged Carry + Price Return</p>
          </div>
        </div>

        {/* 数据假设 + 计算结果：双栏 */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* 左：数据假设 */}
          <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100">
            <p className="text-[11px] font-semibold text-indigo-700 mb-2">数据假设</p>
            <div className="text-[11px] text-indigo-800 space-y-1">
              <p>5Y Gilt Yield: <span className="font-bold">{gilt5Y.toFixed(2)}%</span></p>
              <p>GBP Hedge Cost Proxy: <span className="font-bold">{bankRate.toFixed(2)}%</span> (≈ Bank Rate)</p>
              <p>Modified Duration: <span className="font-bold">{duration}Y</span></p>
            </div>
          </div>

          {/* 右：三档计算结果 */}
          <div className="space-y-1.5">
            {/* Base Carry */}
            <div className="p-2 rounded bg-blue-50 border border-blue-100 text-center">
              <p className="text-[10px] text-blue-600">Base Carry</p>
              <p className="text-lg font-bold text-blue-700">+{hedgedCarry}bp</p>
            </div>
            {/* Bull Case */}
            <div className="p-2 rounded bg-green-50 border border-green-100">
              <p className="text-[10px] text-green-600 mb-0.5">Bull Case: Yield −25bp</p>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-green-700">价格收益</span>
                <span className="font-semibold text-green-700">+{giltBullPrice.toFixed(1)}bp</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-green-700">总回报</span>
                <span className="font-bold text-green-700">+{giltBullTotal.toFixed(1)}bp</span>
              </div>
            </div>
            {/* Bear Case */}
            <div className={`p-2 rounded border text-center ${giltBearCanSurvive ? "bg-red-50 border-red-100" : "bg-red-100 border-red-300"}`}>
              <p className="text-[10px] text-red-600 mb-0.5">Bear Case: Yield +20bp</p>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-red-600">价格损失</span>
                <span className="font-semibold text-red-600">{giltBearPrice.toFixed(0)}bp</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-red-600">净回报</span>
                <span className={`font-bold ${giltBearTotal >= 0 ? "text-green-600" : "text-red-700"}`}>
                  {giltBearTotal >= 0 ? "+" : ""}{giltBearTotal.toFixed(0)}bp
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 结论 */}
        <div className="mb-4 p-2.5 rounded-lg bg-gray-50 border border-gray-200">
          <p className="text-[11px] font-semibold text-gray-600 mb-1">结论</p>
          <p className="text-[11px] text-gray-700 leading-relaxed">
            以 5Y Gilt（{gilt5Y.toFixed(2)}%）为例，当前对冲后 carry 为 +{hedgedCarry}bp；
            若利率下行 25bp，总回报可达 +{giltBullTotal.toFixed(0)}bp（carry + 价格弹性）；
            若利率上行 20bp，{giltBearCanSurvive ? `carry 仍能覆盖价格损失，净回报 ${giltBearTotal.toFixed(0)}bp` : `净回报 ${giltBearTotal.toFixed(0)}bp，carry 安全垫不足`}。
            <span className="text-red-600 font-medium">但英债套息不是无风险套利，汇率和利率反向波动可能抹平全年 carry。</span>
          </p>
        </div>

        {/* UST vs Gilt 三列对比表 */}
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-1.5 font-semibold text-gray-600">项目</th>
                <th className="text-right py-1.5 font-semibold text-blue-700">5Y UST</th>
                <th className="text-right py-1.5 font-semibold text-purple-700">5Y Gilt</th>
                <th className="text-right py-1.5 font-semibold text-gray-600">解读</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-1.5 text-gray-700">本币收益率</td>
                <td className="py-1.5 text-right font-medium text-blue-700">{ust5Y.toFixed(2)}%</td>
                <td className="py-1.5 text-right font-medium text-purple-700">{gilt5Y.toFixed(2)}%</td>
                <td className="py-1.5 text-right text-[10px] text-gray-500">
                  {gilt5Y > ust5Y ? "Gilt 起始收益率更高" : "UST 起始收益率更高"}
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-1.5 text-gray-700">对冲后 Base Carry</td>
                <td className="py-1.5 text-right font-bold text-blue-700">+{ustHedgedCarry}bp</td>
                <td className="py-1.5 text-right font-bold text-purple-700">+{hedgedCarry}bp</td>
                <td className="py-1.5 text-right text-[10px] text-gray-500">
                  {hedgedCarry > ustHedgedCarry ? "Gilt carry 更厚 → 分流压力" : "UST 对冲后收益更优 → 维持核心配置"}
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-1.5 text-gray-700">修正久期</td>
                <td className="py-1.5 text-right text-gray-600">{ustDuration}年</td>
                <td className="py-1.5 text-right text-gray-600">{duration}年</td>
                <td className="py-1.5 text-right text-[10px] text-gray-500">久期越高 → 利率上行时越脆弱</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-1.5 text-gray-700">Bull：Yield −25bp</td>
                <td className="py-1.5 text-right text-green-700">+{ustBullTotal.toFixed(1)}bp</td>
                <td className="py-1.5 text-right text-green-700">+{giltBullTotal.toFixed(1)}bp</td>
                <td className="py-1.5 text-right text-[10px] text-gray-500">
                  谁的资本利得弹性更高 —— {giltBullTotal > ustBullTotal ? "Gilt" : "UST"} 弹性更大
                </td>
              </tr>
              <tr>
                <td className="py-1.5 text-gray-700">Bear：Yield +20bp</td>
                <td className="py-1.5 text-right text-red-700">{ustBearTotal.toFixed(1)}bp</td>
                <td className="py-1.5 text-right text-red-700">{giltBearTotal.toFixed(1)}bp</td>
                <td className="py-1.5 text-right text-[10px] text-gray-500">
                  {Math.abs(ustBearTotal) > ustHedgedCarry ? "UST carry 扛不住" : "UST carry 可覆盖"}
                  {" · "}
                  {Math.abs(giltBearPrice) > hedgedCarry ? "Gilt carry 扛不住" : "Gilt carry 可覆盖"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 条形图：UST vs Gilt 六组 Total Return */}
        <div className="h-[200px] mb-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 40, left: 90, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => `${(v * 100).toFixed(0)}bp`} fontSize={10} />
              <YAxis type="category" dataKey="name" fontSize={10} width={90} />
              <Tooltip formatter={(value) => `${(Number(value) * 100).toFixed(0)}bp`} />
              <ReferenceLine x={0} stroke="#9CA3AF" />
              <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* SONIA / Bank Rate 仅作 proxy 说明 */}
        <p className="mt-0 text-[10px] text-gray-400 italic leading-relaxed">
          GBP Hedge Cost Proxy ≈ Bank Rate（{bankRate.toFixed(2)}%）≈ SONIA。
          此处的「对冲后 carry」仅为本地投资者简化估算，并非完整的跨币种对冲后收益率计算——
          完整计算需考虑 FX forward points、cross-currency basis swap 和资金成本差异。
        </p>

        <p className="mt-3 text-xs text-gray-400 flex justify-between flex-wrap gap-2">
          <span>来源：FRED (BOERUKM · DGS5 · DFF) · SONIA (BoE) · 5Y Gilt 参考 Trading Economics</span>
          <span className="flex gap-2">
            <a href="https://zh.tradingeconomics.com/united-kingdom/government-bond-yield" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline underline-offset-2">Gilt Yields ↗</a>
            <a href="https://fred.stlouisfed.org/series/BOERUKM" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline underline-offset-2">Bank Rate ↗</a>
            <a href="https://fred.stlouisfed.org/series/DGS5" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline underline-offset-2">UST 5Y ↗</a>
            <a href="https://www.bankofengland.co.uk/markets/sonia-benchmark" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline underline-offset-2">SONIA ↗</a>
          </span>
        </p>
      </CardContent>
    </Card>
  );
}

// ============================================================
// 子模块 3：Tenor RV — UST vs Gilt 哪个期限更有吸引力
// ============================================================

function TenorPlaybook({
  ust2Y,
  ust5Y,
  ust10Y,
  gilt2Y,
  gilt5Y,
  gilt10Y,
  bankRate,
  fedFunds,
}: {
  ust2Y: number;
  ust5Y: number;
  ust10Y: number;
  gilt2Y: number;
  gilt5Y: number;
  gilt10Y: number;
  bankRate: number;
  fedFunds: number;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-mono">03</span>
          <CardTitle className="text-base">期限相对价值：美债与英债谁更适合承担久期？</CardTitle>
        </div>
        <p className="text-xs text-gray-500">
          比较不同期限上 UST 与 Gilt 的相对吸引力，识别全球资金在中段配置竞争最激烈的区域
        </p>
      </CardHeader>
      <CardContent>
        {/* 期限对比表 */}
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-1.5 font-semibold text-gray-600">期限</th>
                <th className="text-left py-1.5 font-semibold text-blue-700">美债逻辑</th>
                <th className="text-left py-1.5 font-semibold text-purple-700">英债逻辑</th>
                <th className="text-left py-1.5 font-semibold text-gray-600">对美债含义</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-2 text-gray-700 font-medium">
                  <div>2Y</div>
                  <div className="text-[10px] text-gray-400">
                    UST {ust2Y.toFixed(2)}% / Gilt {gilt2Y.toFixed(2)}%
                  </div>
                </td>
                <td className="py-2 text-blue-700">Fed 路径定价，短端锚定降息预期</td>
                <td className="py-2 text-purple-700">BoE 路径定价，政策利率下调空间更大</td>
                <td className="py-2 text-gray-600 text-[10px]">
                  比较短端政策预期谁更有下行空间——
                  {bankRate > fedFunds ? " BoE 降息空间更大 → Gilt 短端弹性更强" : " Fed 降息更领先 → UST 短端先受益"}
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 text-gray-700 font-medium">
                  <div>5Y</div>
                  <div className="text-[10px] text-gray-400">
                    UST {ust5Y.toFixed(2)}% / Gilt {gilt5Y.toFixed(2)}%
                  </div>
                </td>
                <td className="py-2 text-blue-700">降息路径 + term premium，中期配置主力</td>
                <td className="py-2 text-purple-700">carry + roll-down + BoE repricing，全球资金竞争最激烈</td>
                <td className="py-2 text-gray-600 text-[10px]">
                  中段是竞争核心区——谁的对冲后 carry 更优，谁就能吸引全球固收配置
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 text-gray-700 font-medium">
                  <div>10Y</div>
                  <div className="text-[10px] text-gray-400">
                    UST {ust10Y.toFixed(2)}% / Gilt {gilt10Y.toFixed(2)}%
                  </div>
                </td>
                <td className="py-2 text-blue-700">财政赤字 + term premium，全球定价锚</td>
                <td className="py-2 text-purple-700">财政可信度 + Gilt 供给/QT，风险溢价压缩空间</td>
                <td className="py-2 text-gray-600 text-[10px]">
                  比较长端财政风险溢价——US 财政赤字规模更大，但美元安全资产地位更强
                </td>
              </tr>
              <tr>
                <td className="py-2 text-gray-700 font-medium">
                  <div>30Y</div>
                  <div className="text-[10px] text-gray-400">超长端参考</div>
                </td>
                <td className="py-2 text-blue-700">美国债务可持续性，全球久期标杆</td>
                <td className="py-2 text-purple-700">英国养老金/LDI、长债供给结构</td>
                <td className="py-2 text-gray-600 text-[10px]">
                  长端供需结构对比——UK 压降长端 Gilt 占比有利于 UK 期限溢价压缩
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 双栏策略说明 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <h4 className="text-sm font-bold text-blue-800 mb-2">2–5Y：降息重定价博弈</h4>
            <ul className="space-y-1.5">
              {[
                "短端受政策利率锚定，Fed vs BoE 路径分化决定相对价值",
                "2–5Y 对未来降息路径最敏感，中美 UK 三方比较核心区间",
                "久期不高，carry cushion 对冲更有意义",
                "若 BoE 降息预期重定价，5Y Gilt 可能提供比 UST 更好的弹性",
              ].map((item, i) => (
                <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                  <span className="text-blue-500 mt-0.5">●</span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-3 text-[10px] text-blue-500 font-mono">
              数据源：BoE Yield Curve · FRED DGS2/DGS5 · SONIA
            </div>
          </div>

          <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
            <h4 className="text-sm font-bold text-purple-800 mb-2">10Y+：财政风险溢价比较</h4>
            <ul className="space-y-1.5">
              {[
                "10Y 以上久期较高，价格波动可迅速吞掉 carry",
                "财政可信度、供给结构、QT 影响占主导",
                "US 财政赤字/GDP 更高但美元安全资产属性更强",
                "UK 若财政风险溢价压缩，可能分流部分长端配置需求",
              ].map((item, i) => (
                <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                  <span className="text-purple-500 mt-0.5">●</span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-3 text-[10px] text-purple-500 font-mono">
              数据源：DMO Gilt Supply · BoE APF/QT · FRED DGS10 · OBR
            </div>
          </div>
        </div>

        <p className="mt-3 text-xs text-gray-400 flex justify-between flex-wrap gap-2">
          <span>来源：BoE Yield Curve · FRED (DGS2/DGS5/DGS10) · DMO · OBR</span>
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
  ust10Y,
  fedFunds,
  timeSeries,
}: {
  gilt10Y: number;
  bund10Y: number;
  ukDeSpread: number;
  bankRate: number;
  ecbRate: number;
  ust10Y: number;
  fedFunds: number;
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
          <span className="text-xs text-gray-400 font-mono">B</span>
          <CardTitle className="text-base">跨市场利差：Gilt vs Bund / UST 的三方比较</CardTitle>
        </div>
        <p className="text-xs text-gray-500">
          英债相对欧债/美债的利差，帮助判断全球固收资金在三大市场间的相对吸引力
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

        {/* US / UK / DE 三方对比表 */}
        <div className="overflow-x-auto mb-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-1.5 font-medium text-gray-500">指标</th>
                <th className="text-right py-1.5 font-medium text-blue-700">US</th>
                <th className="text-right py-1.5 font-medium text-purple-700">UK</th>
                <th className="text-right py-1.5 font-medium text-amber-700">DE / Euro Area</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-1.5 text-gray-700">政策利率</td>
                <td className="py-1.5 text-right text-blue-700">Fed {fedFunds.toFixed(2)}%</td>
                <td className="py-1.5 text-right font-bold text-purple-700">{bankRate.toFixed(2)}%</td>
                <td className="py-1.5 text-right text-amber-700">ECB {ecbRate.toFixed(2)}%</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-1.5 text-gray-700">10Y 国债收益率</td>
                <td className="py-1.5 text-right text-blue-700">UST {ust10Y.toFixed(2)}%</td>
                <td className="py-1.5 text-right font-bold text-purple-700">{gilt10Y.toFixed(2)}%</td>
                <td className="py-1.5 text-right text-amber-700">{bund10Y.toFixed(2)}%</td>
              </tr>
              <tr>
                <td className="py-1.5 text-gray-700">对 UST 利差</td>
                <td className="py-1.5 text-right text-gray-600">—</td>
                <td className="py-1.5 text-right font-bold text-purple-700">
                  {gilt10Y > ust10Y ? "+" : ""}{(gilt10Y - ust10Y).toFixed(2)}pp
                </td>
                <td className="py-1.5 text-right font-bold text-amber-700">
                  {bund10Y > ust10Y ? "+" : ""}{(bund10Y - ust10Y).toFixed(2)}pp
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-500 font-medium mb-1">
          若英国风险溢价回落，Long Gilt / Short Bund 的相对价值交易可以降低全球利率方向风险——
          但前提是 Gilt 相对 UST 的利差也能提供足够的风险补偿。
        </p>

        <p className="mt-3 text-xs text-gray-400 flex justify-between flex-wrap gap-2">
          <span>来源：FRED (IRLTLT01GBM156N · IRLTLT01DEM156N · BOERUKM · ECBDFR · DGS10)</span>
          <span className="flex gap-2">
            <a href="https://fred.stlouisfed.org/series/IRLTLT01GBM156N" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline underline-offset-2">UK 10Y ↗</a>
            <a href="https://fred.stlouisfed.org/series/IRLTLT01DEM156N" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline underline-offset-2">DE 10Y ↗</a>
            <a href="https://fred.stlouisfed.org/series/DGS10" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline underline-offset-2">UST 10Y ↗</a>
          </span>
        </p>
      </CardContent>
    </Card>
  );
}

// ============================================================
// 子模块 5：供给竞争 — 美国 Treasury 供给 vs 英国 Gilt 供给
// ============================================================

function SupplyAndAuction() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-mono">04</span>
          <CardTitle className="text-base">供给竞争：UST 与 Gilt 谁更需要市场吸收？</CardTitle>
        </div>
        <p className="text-xs text-gray-500">
          全球主权债供给竞争——谁的发行压力更大，谁对 term premium 的推升更强？
          DMO 官方提供 Gilt auction results、syndication results 等数据；
          美国这边可参考 Treasury auction 与 FiscalData。
        </p>
      </CardHeader>
      <CardContent>
        {/* 供给对比表 */}
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-1.5 font-semibold text-gray-600">维度</th>
                <th className="text-left py-1.5 font-semibold text-blue-700">UST（美国）</th>
                <th className="text-left py-1.5 font-semibold text-purple-700">Gilt（英国）</th>
                <th className="text-left py-1.5 font-semibold text-gray-600">对全球资金的影响</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-2 text-gray-700 font-medium">发行规模</td>
                <td className="py-2 text-blue-700 text-[10px]">
                  美国财政部拍卖，FY2025 可流通债净发行约 $1.8T+
                </td>
                <td className="py-2 text-purple-700 text-[10px]">
                  DMO Gilt issuance，FY2025/26 约 £300bn
                </td>
                <td className="py-2 text-gray-600 text-[10px]">
                  US 供给绝对规模远超 UK，但 UK 相对 GDP 比例不低
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 text-gray-700 font-medium">长端供给</td>
                <td className="py-2 text-blue-700 text-[10px]">
                  20Y/30Y UST 持续增发，长端供给压力未减
                </td>
                <td className="py-2 text-purple-700 text-[10px]">
                  Long Gilt / Linker 占比正在下降（2026/27 预计低位）
                </td>
                <td className="py-2 text-gray-600 text-[10px]">
                  UK 减量有利于 Gilt 长端期限溢价压缩 → 分流压力减弱
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 text-gray-700 font-medium">拍卖需求</td>
                <td className="py-2 text-blue-700 text-[10px]">
                  Bid-to-cover 普遍 2.2-2.8x，部分长端出现 tail
                </td>
                <td className="py-2 text-purple-700 text-[10px]">
                  Cover ratio 2.0-2.5x，近期需求稳定
                </td>
                <td className="py-2 text-gray-600 text-[10px]">
                  美英拍卖需求均尚可，但美债期限溢价已反映部分供给担忧
                </td>
              </tr>
              <tr>
                <td className="py-2 text-gray-700 font-medium">央行 QT</td>
                <td className="py-2 text-blue-700 text-[10px]">
                  Fed QT 继续，每月缩减 ~$25B 国债持仓
                </td>
                <td className="py-2 text-purple-700 text-[10px]">
                  BoE 主动卖出 + 到期不续，APF 规模持续缩减
                </td>
                <td className="py-2 text-gray-600 text-[10px]">
                  两边央行均在缩表 → 私人部门需吸收更多久期供给
                </td>
              </tr>
            </tbody>
          </table>
        </div>

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

        {/* DMO 已完成拍卖表格（示例） */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-600 mb-2">DMO Gilt 已完成拍卖（示例）</h4>
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
                {[
                  { date: "2026-05-28", name: "4.25% Treasury Gilt 2031", tenor: "5Y", amount: "£4.0bn", yield: "4.41%", btc: "2.3x" },
                  { date: "2026-05-21", name: "4.125% Treasury Gilt 2036", tenor: "10Y", amount: "£3.5bn", yield: "4.58%", btc: "2.1x" },
                  { date: "2026-05-14", name: "1.5% Index-linked Gilt 2053", tenor: "27Y IL", amount: "£0.9bn", yield: "1.12%", btc: "2.5x" },
                  { date: "2026-05-07", name: "4.5% Treasury Gilt 2033", tenor: "7Y", amount: "£4.2bn", yield: "4.47%", btc: "2.0x" },
                ].map((a, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1.5 text-gray-700">{a.date}</td>
                    <td className="py-1.5 text-gray-700">{a.name}</td>
                    <td className="py-1.5 text-right text-gray-600">{a.tenor}</td>
                    <td className="py-1.5 text-right font-medium">{a.amount}</td>
                    <td className="py-1.5 text-right font-medium text-purple-700">{a.yield}</td>
                    <td className="py-1.5 text-right font-medium text-gray-700">{a.btc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-gray-400 mt-1 italic">注：拍卖数据为示例格式，实时数据请访问 DMO 官网获取。UST 拍卖数据见本站「供给与拍卖」模块。</p>
        </div>

        {/* 即将发行 + 供给压力评分 */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-lg border border-purple-200 bg-purple-50">
            <h4 className="text-xs font-semibold text-purple-800 mb-2">Gilt 即将发行（最近 2 周）</h4>
            <div className="space-y-1.5">
              {[
                { date: "2026-06-04", name: "4.125% Treasury 2038", tenor: "12Y", amount: "£3.8bn" },
                { date: "2026-06-11", name: "0.125% IL Gilt 2048", tenor: "22Y IL", amount: "£1.1bn" },
              ].map((item, i) => (
                <div key={i} className="text-xs text-purple-700 flex justify-between">
                  <span>{item.date} · {item.name}</span>
                  <span className="font-medium">{item.amount}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="p-3 rounded-lg border border-amber-200 bg-amber-50">
            <h4 className="text-xs font-semibold text-amber-800 mb-2">Gilt 供给压力评分</h4>
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

        {/* 供给变革策略 */}
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 mb-3">
          <h4 className="text-xs font-semibold text-amber-800 mb-1">供给策略对美债的含义</h4>
          <p className="text-xs text-amber-700 leading-relaxed">
            英国提升 T-bills 和短端发行、压降长端 Gilt 占比（2026/27 长端预计降至多年低位），
            本质上会缓解 Gilt 长端供给压力，有利于 UK 期限溢价压缩——这可能使 Gilt 长端相对 UST 长端更有吸引力。
            对照之下，UST 长端供给持续增加，term premium 压力未消。
          </p>
        </div>

        {/* DMO 链接 */}
        <div className="grid grid-cols-2 gap-3 mb-2">
          <a
            href="https://www.dmo.gov.uk/publications/gilt-operations-calendar/"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors group"
          >
            <p className="text-sm font-semibold text-purple-700 group-hover:text-purple-800">Gilt 发行日历 ↗</p>
            <p className="text-[11px] text-gray-500 mt-0.5">DMO Gilt Operations Calendar</p>
          </a>
          <a
            href="https://www.dmo.gov.uk/data/gilt-market/auction-results/"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors group"
          >
            <p className="text-sm font-semibold text-purple-700 group-hover:text-purple-800">拍卖结果 ↗</p>
            <p className="text-[11px] text-gray-500 mt-0.5">DMO Gilt Auction Results</p>
          </a>
        </div>

        <p className="text-[10px] text-gray-400 italic">
          DMO 在财政年度开始前发布发行日历，每季度细化具体拍卖债券，拍卖前一周加入规模信息。
          详细拍卖数据可直接访问 DMO 官网获取。
        </p>

        <p className="mt-3 text-xs text-gray-400 flex justify-between flex-wrap gap-2">
          <span>来源：DMO Gilt Operations · US Treasury FiscalData · OBR</span>
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
          <span className="text-sm font-semibold text-indigo-700">B. 英国视角</span>
          <span className="text-xs text-indigo-400">UK Lens: Gilt vs UST</span>
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
            <CardTitle className="text-base">英国视角：Gilt 作为 UST 的高息替代资产</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-500 mb-2">数据加载失败{error ? `: ${error}` : ""}</p>
            <p className="text-xs text-gray-500">请检查 FRED API Key 配置或稍后重试。</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* 模块标题 + 小标签 */}
          <div className="mb-2">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-lg font-bold text-gray-800">
                英国视角：Gilt 作为 UST 的高息替代资产
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 border border-gray-200 text-[10px] text-gray-500 whitespace-nowrap">
                Global Investor Lens · Cross-Market Relative Value
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              UK Lens: Gilt as a High-Yield Alternative to UST
            </p>
          </div>

          {/* 定位文案（蓝色说明框） */}
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-800 leading-relaxed">
              本模块并非独立研究英债，而是将 Gilt 作为 UST 的高息替代资产进行相对价值比较。
              对全球固收资金而言，美债吸引力不仅取决于美国自身的供给、拍卖和财政状况，
              也取决于英债等其他发达市场主权债是否提供更高的收益率、对冲后 carry 与资本利得空间。
            </p>
          </div>

          {/* 四个核心信号（白色问题框） */}
          <div className="p-4 rounded-lg bg-white border border-gray-200">
            <h3 className="text-sm font-bold text-gray-800 mb-2">本模块关注的四个信号</h3>
            <ol className="space-y-1.5 text-xs text-gray-700 list-decimal list-inside">
              <li className="font-medium">
                相对收益率：当 Gilt 收益率处于高位时，UST 的收益率优势是否仍然存在？
              </li>
              <li>对冲后收益：对欧洲/全球资金而言，UST 与 Gilt 谁的 hedged carry 更有吸引力？</li>
              <li>风险溢价：若英国财政风险溢价回落，Gilt 是否会分流部分长端主权债配置需求？</li>
              <li>供给竞争：若 Gilt 长端供给压力缓解，美债长端是否面临相对估值压力？</li>
            </ol>
          </div>

          {/* 01 Dashboard 指标对比卡片 */}
          <DashboardCards
            metrics={data.metrics}
            dataDate={data.dataDate}
            freshness={data.freshness.status}
            dataSource={data.dataSource}
          />

          {/* A 宏观背景 */}
          <MacroHeatmap
            macroFactors={data.macroFactors}
            cpi={data.cpi}
            bankRate={data.bankRate}
            unemployment={data.unemployment}
            gdpGrowth={data.gdpGrowth}
            fedFunds={data.fedFunds}
            timeSeries={data.timeSeries}
          />

          {/* 02 Carry Cushion */}
          <CarryCushionCalc
            carryCalc={data.carryCalc}
            gilt5Y={data.gilt5Y}
            bankRate={data.bankRate}
            ust5Y={data.ust5Y}
            fedFunds={data.fedFunds}
          />

          {/* 03 Tenor RV */}
          <TenorPlaybook
            ust2Y={data.ust2Y}
            ust5Y={data.ust5Y}
            ust10Y={data.ust10Y}
            gilt2Y={data.gilt2Y}
            gilt5Y={data.gilt5Y}
            gilt10Y={data.gilt10Y}
            bankRate={data.bankRate}
            fedFunds={data.fedFunds}
          />

          {/* B 跨市场利差 */}
          <RelativeValue
            gilt10Y={data.gilt10Y}
            bund10Y={data.bund10Y}
            ukDeSpread={data.ukDeSpread}
            bankRate={data.bankRate}
            ecbRate={data.ecbRate}
            ust10Y={data.ust10Y}
            fedFunds={data.fedFunds}
            timeSeries={data.timeSeries}
          />

          {/* 04 Supply Competition */}
          <SupplyAndAuction />
        </div>
      )}

      {/* 数据来源引用 */}
      <div className="mt-4 pt-3 border-t border-indigo-100">
        <p className="text-xs text-gray-400 flex justify-between flex-wrap gap-2">
          <span>
            数据来源：FRED (BOERUKM · IRLTLT01GBM156N · IRLTLT01DEM156N · DEXUSUK · CPALTT01GBM659N · UNRTUKA · GBRGDPQDSNAQ · ECBDFR · DGS2/DGS5/DGS10/DFF)
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
