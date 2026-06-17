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
        number="05"
        title="杠杆率"
        titleEn="Leverage Ratios"
        description="追踪美国三部门（家庭/企业/政府）债务占 GDP 比率，评估系统性杠杆风险与潜在去杠杆压力。"
      />
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">三部门杠杆率 · 债务/GDP（%）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3 rounded-lg border border-gray-100 bg-gray-50">
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
          <Skeleton className="h-[320px] w-full rounded-lg" />
        </CardContent>
      </Card>
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

function LeveragePanel({
  summary,
  trend,
  dataDate,
  dataSource,
}: {
  summary: LeverageSummaryItem[];
  trend: LeverageTrendPoint[];
  dataDate: string;
  dataSource: string;
}) {
  const yoyRefQuarter = (() => {
    const m = dataDate.match(/^(\d{4})-Q(\d)$/);
    if (!m) return "";
    return `${Number(m[1]) - 1}-Q${m[2]}`;
  })();

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">三部门杠杆率 · 债务/GDP（%）</CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">杠杆率历史趋势（2020 至今）</p>
          </div>
          <Badge className="text-xs bg-blue-50 text-blue-700 border-blue-200">
            {dataDate}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* 上方：4 个数据方块横排 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {summary.map((item) => (
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

        {/* 下方：折线图占满宽度 */}
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="quarter"
              tick={{ fontSize: 11 }}
              interval={Math.max(1, Math.floor(trend.length / 12))}
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

        {/* 底部来源 */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-400 flex justify-between flex-wrap gap-2">
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
          number="05"
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
        number="05"
        title="杠杆率"
        titleEn="Leverage Ratios"
        description="追踪美国三部门（家庭/企业/政府）债务占 GDP 比率，评估系统性杠杆风险与潜在去杠杆压力。"
      />
      <LeveragePanel summary={summary} trend={trend} dataDate={dataDate} dataSource={dataSource} />
    </section>
  );
}
