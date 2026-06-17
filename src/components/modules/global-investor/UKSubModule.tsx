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
        <div className="text-[10px] text-gray-400 mt-2 leading-relaxed border-t border-gray-100 pt-2 space-y-0.5">
          <p>
            数据来源（{dataDate}）：
          </p>
          <p>
            UST —{" "}
            <a
              href="https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView?field_tdr_date_value=2026&type=daily_treasury_yield_curve"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              Treasury Daily Par Yield Curve
            </a>
          </p>
          <p>
            Gilt —{" "}
            <a
              href="https://tradingeconomics.com/united-kingdom/government-bond-yield"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              Trading Economics
            </a>
          </p>
          <p>Bund / BoE / CPI — FRED</p>
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

// 02 CarryCushionCalc — 已存档至 archive/uk-view-02-03-04.tsx

// 03 TenorPlaybook — 已存档至 archive/uk-view-02-03-04.tsx

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
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3 w-72 mt-1" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[100px] w-full" />
            </CardContent>
          </Card>
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

{/* 02/03 已存档至 archive/uk-view-02-03-04.tsx */}

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

          {/* 04 已存档至 archive/uk-view-02-03-04.tsx */}
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
