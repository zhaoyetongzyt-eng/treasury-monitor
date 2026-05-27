"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell,
} from "recharts";
import type { JapanHoldingsTrend, JapanWeeklyFlow, JapanMetricsResponse } from "@/types";

// ============================================================
// 日本当局持仓 & 市场数据
// 数据来源：
//   - /api/japan-metrics: FRED (USD/JPY, JGB 10Y, 外汇储备, UST 10Y) + MOF 周度资金流
//   - /api/tic: TIC 月频日本美债持仓（唯一可拆分美债的官方数据）
//
// NOTE: MOF 数据口径为"日本居民对全部外国证券的净买入/净卖出"，含外国中长期债券、
//   外国短期债券、外国股票/投资基金份额，无法直接拆出"美国国债"单项。
//   如需日本对美债专项数据，仅 TIC 月频持仓变动可用。
// ============================================================

// ============================================================
// TIC 日本美债持仓趋势（内置 fallback，数据截至 2026-03）
// 来源：Treasury TIC SLT Table 5
// ============================================================

const FALLBACK_HOLDINGS_TREND: JapanHoldingsTrend[] = [
  { date: "2024-01", holdings: 1153, change: +9 },
  { date: "2024-02", holdings: 1168, change: +15 },
  { date: "2024-03", holdings: 1178, change: +10 },
  { date: "2024-04", holdings: 1183, change: +5 },
  { date: "2024-05", holdings: 1172, change: -11 },
  { date: "2024-06", holdings: 1160, change: -12 },
  { date: "2024-07", holdings: 1155, change: -5 },
  { date: "2024-08", holdings: 1148, change: -7 },
  { date: "2024-09", holdings: 1135, change: -13 },
  { date: "2024-10", holdings: 1142, change: +7 },
  { date: "2024-11", holdings: 1130, change: -12 },
  { date: "2024-12", holdings: 1128, change: -2 },
  { date: "2025-01", holdings: 1120, change: -8 },
  { date: "2025-02", holdings: 1112, change: -8 },
  { date: "2025-03", holdings: 1118, change: +6 },
  { date: "2025-04", holdings: 1105, change: -13 },
  { date: "2025-05", holdings: 1098, change: -7 },
  { date: "2025-06", holdings: 1088, change: -10 },
  { date: "2025-07", holdings: 1082, change: -6 },
  { date: "2025-08", holdings: 1075, change: -7 },
  { date: "2025-09", holdings: 1068, change: -7 },
  { date: "2025-10", holdings: 1085, change: +17 },
  { date: "2025-11", holdings: 1105, change: +20 },
  { date: "2025-12", holdings: 1130, change: +25 },
  { date: "2026-01", holdings: 1178, change: +48 },
  { date: "2026-02", holdings: 1239, change: +61 },
  { date: "2026-03", holdings: 1192, change: -47 },
];

// ============================================================
// 从 TIC API 提取日本持仓趋势
// ============================================================

interface TICApiResponse {
  success: boolean;
  holdings?: Array<{
    country: string;
    amount: number;
    trend: string;
    change: number;
    isMajor: boolean;
  }>;
  dataDate?: string;
}

// TIC API 返回的是最新快照，我们需要从历史数据构建趋势。
// 由于 TIC API 目前只返回最新数据，趋势仍使用内置数据。
// 未来可扩展为从 TIC 历史 CSV 直接解析。

// ============================================================
// 子组件：持仓趋势图
// ============================================================

function HoldingsTrendChart({ data }: { data: JapanHoldingsTrend[] }) {
  const last6 = data.slice(-6);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">日本美债持仓趋势（TIC 月频）</CardTitle>
        <p className="text-xs text-gray-500">
          过去 27 个月持仓走势（十亿美元）。虚线 = 1,150 参考线
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#888" }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[1000, 1280]}
              tick={{ fontSize: 11, fill: "#888" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
              formatter={(v) => [String(v) + " B", "持仓"]}
            />
            <Line
              type="monotone"
              dataKey={() => 1150}
              stroke="#ccc"
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
              name="1,150B 参考线"
            />
            <Line
              type="monotone"
              dataKey="holdings"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 2, fill: "#2563eb" }}
              activeDot={{ r: 5, fill: "#2563eb" }}
            />
          </LineChart>
        </ResponsiveContainer>

        <div className="mt-3 grid grid-cols-6 gap-1">
          {last6.map((d) => (
            <div key={d.date} className="text-center">
              <p className="text-[10px] text-gray-400">{d.date.slice(2)}</p>
              <p className="text-xs font-medium">{d.holdings}</p>
              <p className={`text-[10px] ${d.change >= 0 ? "text-red-500" : "text-green-500"}`}>
                {d.change >= 0 ? "+" : ""}{d.change}B
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-400 flex justify-between flex-wrap gap-2">
          <span>来源：Treasury TIC SLT Table 5 · 月频</span>
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

// ============================================================
// 子组件：周度资金流
// ============================================================

function WeeklyFlowChart({ data, freshness }: { data: JapanWeeklyFlow[]; freshness?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">日本对外国证券投资周度流向（MOF）</CardTitle>
        <p className="text-xs text-gray-500">
          日本居民对外国中长期/短期债券与股票/投资基金的净买入（十亿日元）。
          <br />
          <span className="text-amber-600 font-medium">
            ⚠ MOF 数据为全部外国证券合计，不可直接拆分为美债。正值 = 净买入海外资产。
          </span>
          {freshness && (
            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-green-50 text-green-700 border border-green-200">
              {freshness}
            </span>
          )}
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="weekStart"
              tick={{ fontSize: 11, fill: "#888" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#888" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
              formatter={(v, n) => {
                const val = Number(v);
                const label = String(n) === "netForeignBonds" ? "外国债券（含中长期+短期）" : "外国股票/投资基金";
                return [`${val > 0 ? "+" : ""}${val} 亿日元`, label];
              }}
            />
            <Legend
              iconType="rect"
              wrapperStyle={{ fontSize: 12 }}
            />
            <Bar
              dataKey="netForeignBonds"
              name="外国债券"
              fill="#2563eb"
              radius={[3, 3, 0, 0]}
            >
              {data.map((entry, i) => (
                <Cell
                  key={`bond-${i}`}
                  fill={entry.netForeignBonds >= 0 ? "#dc2626" : "#16a34a"}
                />
              ))}
            </Bar>
            <Bar
              dataKey="netForeignStocks"
              name="外国股票"
              fill="#f59e0b"
              radius={[3, 3, 0, 0]}
            >
              {data.map((entry, i) => (
                <Cell
                  key={`stock-${i}`}
                  fill={entry.netForeignStocks >= 0 ? "#f97316" : "#ca8a04"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-3 p-2 rounded bg-amber-50 border border-amber-100">
          <p className="text-[11px] text-amber-700 leading-relaxed">
            <strong>口径说明：</strong>MOF 统计的是日本居民对<b>全部外国</b>（不限于美国）的中长期债券、短期债券和股票/投资基金的净买入/净卖出。
            外国中长期债券可能以美债为主，但也包含欧债、澳债等。如需日本对美债专项持仓与变动，请参见上方 TIC 月频图表。
          </p>
        </div>
        <p className="mt-3 text-xs text-gray-400 flex justify-between flex-wrap gap-2">
          <span>来源：日本财务省（MOF）证券交易统计 · 周频 · 2014年起正值=净买入</span>
          <a
            href="https://www.mof.go.jp/english/policy/international_policy/reference/itn_transactions_in_securities/index.htm"
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

// ============================================================
// 子组件：关键指标面板
// ============================================================

function KeyMetricsPanel({
  metrics,
  dataDate,
  freshness,
}: {
  metrics: JapanMetricsResponse["metrics"];
  dataDate: string;
  freshness: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">日本关键指标快照</CardTitle>
        <p className="text-xs text-gray-500 flex items-center gap-2">
          <span>{dataDate}</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] border ${
            freshness === "实时"
              ? "bg-green-50 text-green-700 border-green-200"
              : freshness === "部分实时"
              ? "bg-yellow-50 text-yellow-700 border-yellow-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}>
            {freshness === "实时" ? "✅ FRED + MOF 实时" : freshness === "部分实时" ? "⚡ 部分实时" : "⚠ 降级模式"}
          </span>
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-3">
          {metrics.map((item) => (
            <div key={item.label} className="text-center p-2 rounded-lg bg-gray-50">
              <p className="text-[11px] text-gray-500 mb-1">{item.label}</p>
              <p className="text-lg font-bold text-gray-800">
                {item.value}
                <span className="text-xs font-normal text-gray-400 ml-0.5">{item.unit}</span>
              </p>
              {item.change !== 0 && (
                <p className={`text-xs mt-0.5 ${item.change >= 0 ? "text-red-500" : "text-green-500"}`}>
                  {item.change >= 0 ? "+" : ""}{item.change.toFixed(2)}
                </p>
              )}
              <p className="text-[10px] text-gray-400 mt-1 leading-tight">{item.sub}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Skeleton 加载态
// ============================================================

function MetricsSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-3 w-48 mt-1" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
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

function WeeklyFlowSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3 w-64 mt-1" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[200px] w-full" />
      </CardContent>
    </Card>
  );
}

// ============================================================
// 子组件：信号解读
// ============================================================

function JapanSignals({
  usdJpy,
  jgb10Y,
  ust10Y,
  ustJgbSpread,
}: {
  usdJpy: number;
  jgb10Y: number;
  ust10Y: number;
  ustJgbSpread: number;
}) {
  const signals = [
    {
      type: "bearish" as const,
      title: "日本3月减持美债47.7B",
      desc: "TIC数据显示，日本3月美债持仓从1,239.3B降至1,191.6B，单月减少47.7B，至少为近一年最大降幅。",
    },
    {
      type: "neutral" as const,
      title: `USD/JPY接近${Math.round(usdJpy)}，干预风险仍需关注`,
      desc: `日元仍处弱势区间，USD/JPY接近${Math.round(usdJpy)}–${Math.round(usdJpy) + 1}关口。若汇率波动加快，日本外汇干预风险上升，但是否干预取决于汇率速度、波动率和官方表态。`,
    },
    {
      type: "bullish" as const,
      title: "美日10Y利差明显收窄",
      desc: `日本10Y升至约${jgb10Y.toFixed(2)}%，美国10Y约${ust10Y.toFixed(2)}%，美日10Y利差已从此前约289bp压缩至约${ustJgbSpread}bp附近，削弱日本资金继续配置美债的边际吸引力。`,
    },
    {
      type: "neutral" as const,
      title: "MOF显示日本投资者4月一度净卖出海外债券",
      desc: "MOF周度数据显示日本投资者4月对海外中长期/短期债券有阶段性净卖出，但5月后部分周度恢复净买入。需注意MOF数据为全部外国证券（非仅美债），需观察是否转化为持续回流日本国内债市。TIC月频持仓变动为判断日本对美债具体流向的更可靠指标。",
    },
  ];

  const typeStyles: Record<string, string> = {
    bullish: "border-red-200 bg-red-50",
    bearish: "border-green-200 bg-green-50",
    neutral: "border-gray-200 bg-gray-50",
  };
  const typeLabels: Record<string, string> = {
    bullish: "对美债利好",
    bearish: "对美债利空",
    neutral: "中性",
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">日本视角 · 关键信号解读</CardTitle>
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
// 主组件
// ============================================================

export default function JapanSubModule() {
  const [metrics, setMetrics] = useState<JapanMetricsResponse["metrics"] | null>(null);
  const [weeklyFlows, setWeeklyFlows] = useState<JapanWeeklyFlow[] | null>(null);
  const [dataDate, setDataDate] = useState<string>("");
  const [freshness, setFreshness] = useState<string>("降级模式");
  const [usdJpy, setUsdJpy] = useState(159.34);
  const [jgb10Y, setJgb10Y] = useState(2.70);
  const [ust10Y, setUst10Y] = useState(4.47);
  const [ustJgbSpread, setUstJgbSpread] = useState(177);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const res = await fetch("/api/japan-metrics");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: JapanMetricsResponse = await res.json();
        if (!cancelled) {
          setMetrics(data.metrics);
          setWeeklyFlows(data.weeklyFlows);
          setDataDate(data.dataDate);
          setFreshness(data.freshness.status);
          setUsdJpy(data.usdJpy);
          setJgb10Y(data.jgb10YYield);
          setUst10Y(data.ust10YYield);
          setUstJgbSpread(data.ustJgbSpread);
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
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-sm font-semibold text-red-700">日本视角</span>
          <span className="text-xs text-red-400">Japan Lens</span>
        </div>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 持仓趋势（TIC - 仍用内置数据） */}
        <HoldingsTrendChart data={FALLBACK_HOLDINGS_TREND} />

        {/* 周度资金流（MOF - API 动态） */}
        {loading ? (
          <WeeklyFlowSkeleton />
        ) : weeklyFlows ? (
          <WeeklyFlowChart
            data={weeklyFlows}
            freshness={
              freshness === "实时" || freshness === "部分实时"
                ? "MOF 实时"
                : undefined
            }
          />
        ) : (
          <WeeklyFlowChart data={[]} />
        )}
      </div>

      <div className="mt-4 space-y-4">
        {/* 关键指标（FRED + BOJ - API 动态） */}
        {loading ? (
          <MetricsSkeleton />
        ) : error ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">日本关键指标快照</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-red-500">数据加载失败: {error}，使用降级数据</p>
              <KeyMetricsPanel
                metrics={[
                  { label: "USD/JPY", value: "159.34", change: +0.14, unit: "", sub: "日元贬值 = 干预风险↑" },
                  { label: "BOJ政策利率", value: "0.75", change: 0, unit: "%", sub: "2025年12月加息至0.75%" },
                  { label: "日本10Y国债", value: "2.70", change: 0, unit: "%", sub: "收益率持续攀升" },
                  { label: "美日10Y利差", value: "177", change: 0, unit: "bp", sub: "美国4.47% vs 日本2.70%" },
                  { label: "外汇储备", value: "1.26", change: 0, unit: "万亿美元", sub: "干预弹药库规模" },
                ]}
                dataDate="2026-05-27"
                freshness="降级模式"
              />
            </CardContent>
          </Card>
        ) : (
          <KeyMetricsPanel
            metrics={metrics!}
            dataDate={dataDate}
            freshness={freshness}
          />
        )}

        {/* 信号解读（动态数值） */}
        <JapanSignals
          usdJpy={usdJpy}
          jgb10Y={jgb10Y}
          ust10Y={ust10Y}
          ustJgbSpread={ustJgbSpread}
        />
      </div>

      {/* 数据来源引用 */}
      <div className="mt-4 pt-3 border-t border-red-100">
        <p className="text-xs text-gray-400 flex justify-between flex-wrap gap-2">
          <span>
            数据来源：FRED (DEXJPUS, IRLTLT01JPM156N, TRESEGJPM052N, DGS10) · 日本MOF证券交易统计 · Treasury TIC
            {freshness !== "实时" && (
              <span className="ml-1 text-amber-500">（{freshness}，部分数据来自内置 fallback）</span>
            )}
          </span>
          <span className="flex gap-3">
            <a
              href="https://ticdata.treasury.gov/resource-center/data-chart-center/tic/Documents/slt_table5.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline underline-offset-2"
            >
              TIC ↗
            </a>
            <a
              href="https://www.mof.go.jp/english/policy/international_policy/reference/itn_transactions_in_securities/index.htm"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline underline-offset-2"
            >
              MOF ↗
            </a>
            <a
              href="https://fred.stlouisfed.org/graph/?g=JAPAN"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline underline-offset-2"
            >
              FRED ↗
            </a>
          </span>
        </p>
      </div>
    </div>
  );
}
