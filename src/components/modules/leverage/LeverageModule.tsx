"use client";

import { useState, useEffect } from "react";
import ModuleHeader from "@/components/layout/ModuleHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

interface LeverageSummaryItem {
  sector: string;
  debtToGDP: number;
  yoyChange: number;
  trend: "上升" | "下降" | "持平";
}

interface LeverageTrendPoint {
  quarter: string;
  家庭: number;
  企业: number;
  政府: number;
}

interface LeverageAPIResponse {
  success: boolean;
  dataDate: string;
  dataSource: string;
  summary: LeverageSummaryItem[];
  trend: LeverageTrendPoint[];
  dataFreshness?: {
    status: string;
    bisLastModified: string | null;
    nextExpectedUpdate: string;
  };
  error?: string;
}

function LoadingSkeleton() {
  return (
    <section id="leverage" className="py-8 px-4 max-w-7xl mx-auto scroll-mt-16">
      <ModuleHeader
        number="04"
        title="杠杆率"
        titleEn="Leverage Ratios"
        description="追踪美国三部门（家庭/企业/政府）债务占 GDP 比率，评估系统性杠杆风险与潜在去杠杆压力。"
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">三部门杠杆率 · 债务/GDP（%）</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-3 rounded-lg border border-gray-100 bg-gray-50">
                    <Skeleton className="h-4 w-16 mb-2" />
                    <Skeleton className="h-8 w-20 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
        <Skeleton className="h-[400px] w-full rounded-lg" />
      </div>
    </section>
  );
}

const trendBadge = (trend: string) => {
  if (trend === "上升") return "border-red-300 text-red-700 bg-red-50";
  if (trend === "下降") return "border-emerald-300 text-emerald-700 bg-emerald-50";
  return "border-gray-300 text-gray-700 bg-gray-50";
};

const SECTOR_ICONS: Record<string, string> = {
  "家庭部门": "🏠",
  "非金融企业": "🏢",
  "政府部门": "🏛️",
  "私人非金融部门": "📊",
};

function LeverageSummary({ data, dataDate, dataSource }: {
  data: LeverageSummaryItem[];
  dataDate: string;
  dataSource: string;
}) {
  // 根据 dataDate 计算同比参考季度（例如 2025-Q3 → 2024-Q3）
  const yoyRefQuarter = (() => {
    const m = dataDate.match(/^(\d{4})-Q(\d)$/);
    if (!m) return "";
    return `${Number(m[1]) - 1}-Q${m[2]}`;
  })();

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">三部门杠杆率 · 债务/GDP（%）</CardTitle>
          <Badge className="text-xs bg-blue-50 text-blue-700 border-blue-200">
            {dataDate}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data.map((item) => (
            <div
              key={item.sector}
              className="p-3 rounded-lg border border-gray-200 bg-white hover:shadow-sm transition-shadow"
            >
              <p className="text-xs text-gray-500 mb-1">
                {SECTOR_ICONS[item.sector] || ""} {item.sector}
              </p>
              <p className="text-2xl font-bold text-gray-900">{item.debtToGDP}%</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs font-mono ${item.yoyChange > 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {item.yoyChange > 0 ? "+" : ""}{item.yoyChange}pp
                </span>
                <Badge variant="outline" className={`text-xs ${trendBadge(item.trend)}`}>
                  {item.trend}
                </Badge>
              </div>
              {yoyRefQuarter && (
                <p className="text-[10px] text-gray-400 mt-1">
                  同比变化，较{yoyRefQuarter}
                </p>
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-400 flex justify-between flex-wrap gap-2">
          <span>数据来源：{dataSource}</span>
          <a
            href="https://data.bis.org/topics/TOTAL_CREDIT"
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

function LeverageChart({ data, isLoading }: {
  data: LeverageTrendPoint[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">杠杆率历史趋势（2020 至今）</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[320px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">杠杆率历史趋势（2020 至今）</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="quarter"
              tick={{ fontSize: 11 }}
              interval={Math.max(1, Math.floor(data.length / 12))}
            />
            <YAxis domain={[60, 140]} tick={{ fontSize: 11 }} />
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Tooltip
              formatter={(value: any, name: any) => [`${value}%`, name]}
              labelFormatter={(label: any) => `季度: ${label}`}
            />
            <Legend />
            <Line
              type="monotone" dataKey="家庭" stroke="#10B981" strokeWidth={2}
              dot={{ r: 0 }} activeDot={{ r: 4 }}
            />
            <Line
              type="monotone" dataKey="企业" stroke="#F59E0B" strokeWidth={2}
              dot={{ r: 0 }} activeDot={{ r: 4 }}
            />
            <Line
              type="monotone" dataKey="政府" stroke="#EF4444" strokeWidth={2}
              dot={{ r: 0 }} activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
        <p className="mt-3 text-xs text-gray-400 flex justify-between flex-wrap gap-2">
          <span>来源：BIS Total Credit · 市场价值计价 · 经断点调整 · 占 GDP 百分比</span>
          <a
            href="https://data.bis.org/topics/TOTAL_CREDIT"
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

function RiskNotes() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">杠杆风险提示</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-2 p-2 rounded bg-amber-50 border border-amber-100">
          <span className="text-amber-500 text-sm mt-0.5">⚠️</span>
          <div>
            <p className="text-sm font-medium text-amber-800">杠杆基金长端净空头轧空风险</p>
            <p className="text-xs text-amber-600 mt-0.5">CFTC显示杠杆基金在美债期货长端维持显著净空头。若经济数据转弱、避险买盘升温或降息预期快速上修，空头回补可能放大长端收益率下行。历史分位需基于同一合约口径回溯计算。</p>
          </div>
        </div>
        <div className="flex items-start gap-2 p-2 rounded bg-red-50 border border-red-100">
          <span className="text-red-500 text-sm mt-0.5">🔴</span>
          <div>
            <p className="text-sm font-medium text-red-800">基差交易去杠杆风险</p>
            <p className="text-xs text-red-600 mt-0.5">美债现金-期货基差交易依赖repo融资和期货保证金。若融资条件收紧、保证金上升或市场流动性下降，相关仓位可能被迫去杠杆，并放大国债市场波动。</p>
          </div>
        </div>
        <div className="flex items-start gap-2 p-2 rounded bg-emerald-50 border border-emerald-100">
          <span className="text-emerald-500 text-sm mt-0.5">✅</span>
          <div>
            <p className="text-sm font-medium text-emerald-800">私人部门持续去杠杆</p>
            <p className="text-xs text-emerald-600 mt-0.5">家庭与非金融企业债务/GDP自疫情后高位回落，私人部门杠杆压力下降，有助于降低由私人信用扩张触发的系统性风险。</p>
          </div>
        </div>
        <div className="flex items-start gap-2 p-2 rounded bg-blue-50 border border-blue-100">
          <span className="text-blue-500 text-sm mt-0.5">ℹ️</span>
          <div>
            <p className="text-sm font-medium text-blue-800">政府杠杆率高位波动</p>
            <p className="text-xs text-blue-600 mt-0.5">BIS口径下，美国广义政府债务/GDP维持在约106%–110%区间；若使用联邦总公共债务口径，比例约在120%以上。财政赤字和利息支出压力意味着中长端供给仍是中长期利空因素。</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LeverageModule() {
  const [summary, setSummary] = useState<LeverageSummaryItem[]>([]);
  const [trend, setTrend] = useState<LeverageTrendPoint[]>([]);
  const [dataDate, setDataDate] = useState("");
  const [dataSource, setDataSource] = useState("");
  const [freshness, setFreshness] = useState<LeverageAPIResponse["dataFreshness"]>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/leverage")
      .then((r) => r.json())
      .then((d: LeverageAPIResponse) => {
        if (d.success) {
          setSummary(d.summary);
          setTrend(d.trend);
          setDataDate(d.dataDate);
          setDataSource(d.dataSource);
          setFreshness(d.dataFreshness);
        } else {
          setError(d.error || "数据加载失败");
        }
      })
      .catch((e) => setError("请求失败: " + String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <section id="leverage" className="py-8 px-4 max-w-7xl mx-auto scroll-mt-16">
        <ModuleHeader
          number="04"
          title="杠杆率"
          titleEn="Leverage Ratios"
          description="追踪美国三部门（家庭/企业/政府）债务占 GDP 比率，评估系统性杠杆风险与潜在去杠杆压力。"
        />
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-6 text-center text-red-700">
            <p className="font-medium">数据加载失败</p>
            <p className="text-sm mt-1 text-red-500">{error}</p>
            <button
              onClick={() => { setLoading(true); setError(""); window.location.reload(); }}
              className="mt-3 text-sm text-red-600 underline hover:text-red-800"
            >
              重试
            </button>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section id="leverage" className="py-8 px-4 max-w-7xl mx-auto scroll-mt-16">
      <ModuleHeader
        number="04"
        title="杠杆率"
        titleEn="Leverage Ratios"
        description="追踪美国三部门（家庭/企业/政府）债务占 GDP 比率，评估系统性杠杆风险与潜在去杠杆压力。"
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <LeverageSummary data={summary} dataDate={dataDate} dataSource={dataSource} />
          <RiskNotes />
        </div>
        <LeverageChart data={trend} isLoading={loading} />
      </div>
    </section>
  );
}
