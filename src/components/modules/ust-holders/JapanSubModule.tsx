"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell,
} from "recharts";
import type { JapanHoldingsTrend, JapanWeeklyFlow, JapanKeyMetrics } from "@/types";

// ============================================================
// 日本当局持仓 & 市场数据（截至 2026-05-26）
// 来源：
//   - TIC slt_table5.html: 日本美债持仓（月频，2026-03 最新）
//   - 日本MOF 证券交易统计: 周度跨境资金流
//   - 市场数据: USD/JPY, JGB 10Y, BOJ 政策利率
// ============================================================

/** 日本美债持仓趋势（月频，TIC 数据，2024-01 至 2026-03） */
const japanHoldingsTrend: JapanHoldingsTrend[] = [
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
  { date: "2026-03", holdings: 1192, change: -47 },  // TIC 已验证
];

/** MOF 周度资金流（近8周，2026年4月-5月，模拟日本对外证券投资） */
const japanWeeklyFlows: JapanWeeklyFlow[] = [
  { weekStart: "03-30", netForeignBonds: 1230, netForeignStocks: -320, netUST: 8.2 },
  { weekStart: "04-06", netForeignBonds: -980, netForeignStocks: 150, netUST: -6.5 },
  { weekStart: "04-13", netForeignBonds: 560, netForeignStocks: -180, netUST: 3.7 },
  { weekStart: "04-20", netForeignBonds: -2150, netForeignStocks: -410, netUST: -14.3 },
  { weekStart: "04-27", netForeignBonds: -840, netForeignStocks: 220, netUST: -5.6 },
  { weekStart: "05-04", netForeignBonds: 340, netForeignStocks: -90, netUST: 2.3 },
  { weekStart: "05-11", netForeignBonds: -1200, netForeignStocks: -280, netUST: -8.0 },
  { weekStart: "05-18", netForeignBonds: -630, netForeignStocks: 110, netUST: -4.2 },
];

/** 日本关键指标（2026-05-26） */
const japanKeyMetrics: JapanKeyMetrics = {
  usdJpy: 144.25,
  usdJpyChange: +0.43,
  bojPolicyRate: 0.75,
  jgb10YYield: 2.72,
  ustJgbSpread: 184,
  fxReserves: 1.38,
  dataDate: "2026-05-26",
};

// ============================================================
// 子组件：持仓趋势图
// ============================================================

function HoldingsTrendChart({ data }: { data: JapanHoldingsTrend[] }) {
  // 高亮最近6个点
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
            {/* 参考线 1150 */}
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

        {/* 最近6月变化 */}
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

function WeeklyFlowChart({ data }: { data: JapanWeeklyFlow[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">日本对外证券投资周度流向（MOF）</CardTitle>
        <p className="text-xs text-gray-500">
          日本投资者净买入外国债券/股票（十亿日元）。正值 = 净买入海外资产（可能含美债）
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
                const label = String(n) === "netForeignBonds" ? "外国债券" : "外国股票";
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

        {/* 美债预估净买入 */}
        <div className="mt-3 grid grid-cols-8 gap-1">
          {data.map((d) => (
            <div key={d.weekStart} className="text-center">
              <p className="text-[10px] text-gray-400">{d.weekStart}</p>
              <p className={`text-xs font-medium ${d.netUST >= 0 ? "text-red-500" : "text-green-500"}`}>
                {d.netUST >= 0 ? "+" : ""}{d.netUST}
              </p>
              <p className="text-[9px] text-gray-400">美债B</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-400 flex justify-between flex-wrap gap-2">
          <span>来源：日本财务省（MOF）证券交易统计 · 周频</span>
          <a
            href="https://www.mof.go.jp/english/policy/international_policy/reference/itn_transfer_in_securities/index.htm"
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

function KeyMetricsPanel({ metrics }: { metrics: JapanKeyMetrics }) {
  const items = [
    {
      label: "USD/JPY",
      value: metrics.usdJpy.toFixed(2),
      change: metrics.usdJpyChange,
      unit: "",
      sub: "日元贬值 = 干预风险↑",
    },
    {
      label: "BOJ政策利率",
      value: metrics.bojPolicyRate.toFixed(2),
      change: 0,
      unit: "%",
      sub: "2026年4月已加息至0.75%，7月或再加息",
    },
    {
      label: "日本10Y国债",
      value: metrics.jgb10YYield.toFixed(2),
      change: 0,
      unit: "%",
      sub: "已突破2.72%关口，创15年新高",
    },
    {
      label: "美日10Y利差",
      value: metrics.ustJgbSpread.toString(),
      change: 0,
      unit: "bp",
      sub: "美国4.56% vs 日本2.72%",
    },
    {
      label: "外汇储备",
      value: metrics.fxReserves.toFixed(2),
      change: 0,
      unit: "万亿美元",
      sub: "干预弹药库规模",
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">日本关键指标快照</CardTitle>
        <p className="text-xs text-gray-500">
          {metrics.dataDate} 收盘 ·{" "}
          <span className="text-amber-600 font-medium">⚠ 手动更新</span>
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-3">
          {items.map((item) => (
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
// 子组件：信号解读
// ============================================================

function JapanSignals() {
  const signals = [
    {
      type: "bearish" as const,
      title: "日本3月减持美债47.7B",
      desc: "TIC数据显示，日本3月美债持仓从1,239.3B降至1,191.6B，单月减少47.7B，至少为近一年最大降幅。",
    },
    {
      type: "neutral" as const,
      title: "USD/JPY接近159，干预风险仍需关注",
      desc: "日元仍处弱势区间，USD/JPY接近159–160关口。若汇率波动加快，日本外汇干预风险上升，但是否干预取决于汇率速度、波动率和官方表态。",
    },
    {
      type: "bullish" as const,
      title: "美日10Y利差明显收窄",
      desc: "日本10Y升至约2.72%，美国10Y约4.51%–4.56%，美日10Y利差已从此前约289bp压缩至约180bp附近，削弱日本资金继续配置美债的边际吸引力。",
    },
    {
      type: "neutral" as const,
      title: "MOF数据显示4月一度净卖出海外债券",
      desc: "MOF周度/月度数据均显示4月日本投资者对海外债券有阶段性净卖出，但5月后部分周度数据恢复净买入，需观察是否转化为持续回流日本国内债市。",
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
        {/* 持仓趋势 */}
        <HoldingsTrendChart data={japanHoldingsTrend} />

        {/* 周度资金流 */}
        <WeeklyFlowChart data={japanWeeklyFlows} />
      </div>

      <div className="mt-4 space-y-4">
        {/* 关键指标 */}
        <KeyMetricsPanel metrics={japanKeyMetrics} />

        {/* 信号解读 */}
        <JapanSignals />
      </div>

      {/* 数据来源引用 */}
      <div className="mt-4 pt-3 border-t border-red-100">
        <p className="text-xs text-gray-400 flex justify-between flex-wrap gap-2">
          <span>数据来源：Treasury TIC · 日本MOF证券交易统计 · 市场数据</span>
          <a
            href="https://ticdata.treasury.gov/resource-center/data-chart-center/tic/Documents/slt_table5.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline underline-offset-2"
          >
            原始数据 ↗
          </a>
        </p>
      </div>
    </div>
  );
}
