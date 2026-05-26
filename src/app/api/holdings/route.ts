import { NextResponse } from "next/server";

/**
 * GET /api/holdings/cftc
 * CFTC 期货持仓数据
 * 数据源：CFTC COT 报告
 * 当前为占位端点，后续接入 cot_reports Python 库
 */
export async function GET() {
  return NextResponse.json({
    message: "CFTC 持仓数据端点就绪",
    status: "placeholder",
    note: "后续通过 Python ETL 管线接入 cot_reports 库，输出 JSON 供前端消费",
  });
}
