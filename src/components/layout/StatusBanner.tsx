import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function StatusBanner() {
  return (
    <div id="status" className="pt-16 pb-6 px-4 max-w-7xl mx-auto">
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* 左：市场状态 */}
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">当前市场状态</p>
                <Badge variant="secondary" className="text-sm bg-amber-100 text-amber-800 border-amber-200">
                  谨慎偏空 · 数据快照 2026-05-18 收盘
                </Badge>
              </div>
            </div>

            {/* 中：久期立场 */}
            <div className="flex items-center gap-3">
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">久期立场</p>
                <Badge variant="outline" className="text-sm border-red-300 text-red-700">
                  Underweight Duration
                </Badge>
              </div>
              <div className="w-px h-8 bg-gray-200" />
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">曲线立场</p>
                <Badge variant="outline" className="text-sm border-amber-300 text-amber-700">
                  Steepener Bias
                </Badge>
              </div>
            </div>

            {/* 右：关键指标 */}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="text-center">
                <span className="block text-lg font-semibold text-gray-900">4.47%</span>
                10Y 收益率
              </div>
              <div className="text-center">
                <span className="block text-lg font-semibold text-gray-900">5.05%</span>
                30Y 收益率
              </div>
              <div className="text-center">
                <span className="block text-lg font-semibold text-gray-900">2.43</span>
                2s10s 利差
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
