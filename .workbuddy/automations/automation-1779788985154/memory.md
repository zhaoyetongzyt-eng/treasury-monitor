## 2026-07-27
- **任务**: 日频数据自动刷新（自动化 8:00 触发）。
- **脚本**: daily_refresh.py --update，首次运行时 curl 下载 CPIAUCSL 卡死，杀进程后给 curl 加 --max-time 15，重跑成功。
- **数据变更**:
  - 政策面: ffTargetDate 07-22→07-24, twoYMinusFFR 68→74, tenYMinusFFR 104→108, spread5s30s 74→71, spread5s30sDate 07-22→07-23
  - 情绪面: vix 16.64→18.7, vixDate 07-22→07-23, hyOas 2.69→2.77, hyOasDate 07-22→07-23, fwdBEDate 07-23→07-24, spread10Y3M 76→73, spreadDate 07-23→07-24
  - 基本面: 无变更
- **脚本修复**: scripts/daily_refresh.py 为 curl 添加 --max-time 15 防止网络卡死。
- **提交**: a91da39，push 成功至 main。Vercel 自动构建。

## 2026-07-16
- **任务**: 响应用户指令，将网站中 TIC 数据更新到最新 2026-05。
- **构建**: Next.js 16.2.6 (Turbopack) 构建成功，17 个路由全部通过（因环境无法拉取 Google Fonts，临时改用系统字体栈）。
- **TIC 数据变更（2026-03 → 2026-05）**:
  - 日本: 1191.6 → 1143.1 (-66.8)
  - 英国: 926.9 → 948.6 (+11.1)
  - 中国: 652.3 → 659.3 (+8.2)
  - 海外总持仓: 9348.7 → 9371.1 (+18.5)
  - 净外资流向: -138.4 → +18.5
- **更新文件**: /api/tic/route.ts、/api/ust-holders/route.ts、两个 JapanSubModule.tsx、USTHoldersModule.tsx、layout.tsx、globals.css。
- **提交**: 已 push 至 main (6fdb55e)。



## 2026-06-16
- **构建**: Next.js 16.2.6 (Turbopack) 构建成功，17 个路由全部通过
- **服务器**: PID 16076，localhost:3000 返回 200
- **数据摘要**:
  - UK Metrics: updatedAt 2026-06-16
  - Japan Metrics: updatedAt 2026-06-16
  - Yields: 06/15/2026
  - CFTC: 2026-06-09 (positions: 5)
  - UST Holders: 2026-05-26 (z1Date: 2025-Q4, holders: 8)
  - Auctions: 0 historical + 2 upcoming (2026-06-16)
  - TIC: 2026-03 (holdings: 20)
  - Leverage: 2025-Q3
  - Funding Stress: 2026-06-12
  - Fundamentals: 2026-Q1
  - Policy: 2025-12-18
  - Sentiment: 2026-06-10
  - Holdings: placeholder (无数据)
- 所有 13 个 API 端点正常响应

## 2026-06-12
- **构建**: Next.js 16.2.6 (Turbopack) 构建成功，15 个路由全部通过
- **服务器**: PID 73740，localhost:3000 返回 200
- **数据摘要**:
  - UK/Japan Metrics: 2026-06-12 (今日)
  - Yields: 2026-06-11
  - CFTC: 2026-06-02
  - UST Holders: 2026-05-26
  - Auctions 最新: 18 historical + 4 upcoming (updatedAt: 2026-06-12)
  - TIC: 2026-03
  - Leverage: 2025-Q3
  - Funding Stress: 2026-06-10
  - Fundamentals: 2026-Q1
  - Policy: 2025-12-18
  - Sentiment: 2026-06-10
  - Holdings: placeholder
- 所有 13 个 API 端点正常响应

## 2026-06-04
- **构建**: Next.js 16.2.6 (Turbopack) 构建成功，13 个页面全部通过
- **服务器**: PID 34227，localhost:3000 返回 200
- **数据摘要**:
  - UK/Japan Metrics: 2026-06-04 (今日)
  - Yields: 2026-06-03
  - CFTC: 2026-05-26
  - UST Holders: 2026-05-26
  - Auctions 最新: 2026-04-09
  - TIC: 2026-03
  - Leverage: 2025-Q3
- 所有 10 个 API 端点正常响应
