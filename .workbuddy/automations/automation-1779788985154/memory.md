## 2026-10-27
- **任务**: 日频数据自动刷新（自动化 8:00 触发）。
- **脚本**: daily_refresh.py --update 运行成功，venv 复用 /tmp/fred-venv，全程秒级完成。
- **数据变更**: 无（基本面/政策面/情绪面均 up to date，Total updates: 0）。
- **提交**: 未 commit/push（无站点数据变更；工作区仅 .workbuddy 记忆文件变动）。
- **备注**: 连续第二日无变更（上次数据变更为 2026-10-23，提交 4f1a4d9），属正常情况。

## 2026-10-26
- **任务**: 日频数据自动刷新（自动化 8:00 触发）。
- **脚本**: daily_refresh.py --update 运行成功，全部数据源下载正常。
- **数据变更**: 无（基本面/政策面/情绪面均 up to date），未做 git commit/push。
- **备注**: 距上次刷新（2026-10-23）仅 3 天且无新发布数据，属正常情况。工作区仅有 .workbuddy 内部记忆文件变动，与站点数据无关，未提交。

## 2026-10-23
- **任务**: 日频数据自动刷新（自动化 8:00 触发）。
- **脚本**: daily_refresh.py --update 运行成功，耗时仅 26 秒（历史多为 11–16 分钟，本次网络顺畅）。
- **数据变更（共 32 项，全部为 FALLBACK 常量）**:
  - 基本面(8): gdpQoQ 1.5→2.2, corePceYoY 3.3→3.0 (date 07→08), cpiYoY 3.3→3.7 (date 07→09), unemployment 4.1→4.2, employmentDate 08→09, nfpMoM 162→29
  - 政策面(12): ffTargetUpper 3.75→4.0, ffTargetLower 3.5→3.75, ffEffective 3.63→3.88, iorbRate 3.65→3.9, onRrpRate 3.5→3.75, ffTargetDate→10-22, fedBsDate→10-21, qtMonthlyPace -36.9→19.2, twoYMinusFFR 74→93, tenYMinusFFR 115→125, spread5s30s 70→47, spread5s30sDate→10-21
  - 情绪面(12): vix 15.3→16.68 (date→10-21), hyOas 2.69→3.27 (date→10-21), termPremium10Y 89→99 (tpDate→10-16), fwdBE5Y5Y 2.33→2.19 (fwdBEDate→10-22), spread10Y3M 86→74 (spreadDate→10-22), dxyBroad 118.063→121.405 (dxyDate→10-16)
- **下载异常**: 无（全部 CSV 下载成功）。
- **变更文件**: api/fundamentals/route.ts、api/policy/route.ts、api/sentiment/route.ts（仅常量值，逻辑未动）。
- **提交**: 4f1a4d9，push 成功 main (a5fd613..4f1a4d9)，远端已校验一致。Vercel 自动构建。
- **备注**: 上次刷新为 2026-09-09（间隔约 6 周），故本次跨期变更较多，含一次政策利率上调（FFR 目标区间 +25bp）与信用利差显著走阔（HY OAS +58bp）。

## 2026-08-26
- **任务**: 日频数据自动刷新（自动化 8:00 触发）。
- **脚本**: daily_refresh.py --update 运行成功（耗时约 11 分钟）。
- **数据变更（共 19 项）**:
  - 基本面(2): cpiYoY 3.5→3.3, cpiDate 2026-06→2026-07
  - 政策面(7): ffTargetDate 2026-08-09→2026-08-25, fedBsDate 2026-08-05→2026-08-19, qtMonthlyPace 42.1→-5.5, twoYMinusFFR 62→61, tenYMinusFFR 109→107, spread5s30s 84→82, spread5s30sDate 2026-08-10→2026-08-24
  - 情绪面(10): vix 15.46→15.85, vixDate 2026-08-10→2026-08-24, hyOas 2.71→2.69, hyOasDate 2026-08-10→2026-08-24, termPremium10Y 83→87, tpDate 2026-08-07→2026-08-21, fwdBE5Y5Y 2.31→2.33, fwdBEDate 2026-08-11→2026-08-25, dxyBroad 119.065→118.063, dxyDate 2026-08-07→2026-08-21
- **下载异常**: T10Y3M CSV 下载超时（curl exit 28），脚本已跳过；依赖它的 spread10Y3M 今日未更新，等待下次刷新。
- **基本面注**: unemployment / nfpMoM / corePceYoY 本日未变，非下载失败。
- **提交**: b01dbac，push 成功至 main (de37fe0..b01dbac)。Vercel 自动构建。

## 2026-08-12
- **任务**: 日频数据自动刷新（自动化 8:00 触发）。
- **脚本**: daily_refresh.py --update 运行成功（耗时约 16 分钟）。
- **数据变更（共 16 项）**:
  - 基本面(3): unemployment 4.2→4.1, nfpMoM 57→-23, employmentDate 2026-06→2026-07
  - 政策面(1): ffTargetDate 2026-08-06→2026-08-09
  - 情绪面(12): vix 17.09→15.15, vixDate 2026-07-30→2026-08-06, hyOas 2.75→2.71, hyOasDate 2026-08-05→2026-08-06, termPremium10Y 84→87, tpDate 2026-07-24→2026-07-31, fwdBE5Y5Y 2.3→2.28, fwdBEDate 2026-07-31→2026-08-07, spread10Y3M 92→78, spreadDate 2026-07-31→2026-08-07, dxyBroad 120.71→119.703, dxyDate 2026-07-24→2026-07-31
- **下载异常**: DGS2、DGS30 CSV 下载超时（curl exit 28），脚本已跳过；依赖它们的 twoYMinusFFR / tenYMinusFFR / spread5s30s 今日未更新，等待下次刷新。
- **提交**: 2cfd3e5，push 成功至 main。Vercel 自动构建。

## 2026-07-31
- **任务**: 日频数据自动刷新（自动化 8:00 触发）。
- **脚本**: daily_refresh.py --update 运行成功（耗时约 16 分钟，THREEFYTP10 CSV 下载超时但脚本跳过继续）。
- **数据变更（共 22 项）**:
  - 基本面(4): gdpQoQ 2.1→1.5, gdpDate Q1→Q2, corePceYoY 3.4→3.3, corePceDate 05→06
  - 政策面(8): ffTargetDate→07-30, fedBsDate→07-29, fedBs4WkAgo 6.74→6.72, qtMonthlyPace 38.1→44.3, twoYMinusFFR 74→59, tenYMinusFFR 108→104, spread5s30s 71→83, spread5s30sDate→07-29
  - 情绪面(10): vix 18.7→20.66, hyOas 2.77→2.87, fwdBE5Y5Y 2.27→2.3, spread10Y3M 73→86, dxyBroad 120.531→120.71 等及对应日期更新
- **提交**: 59b4496，push 成功至 main。Vercel 自动构建。

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

## 2026-08-12
- **任务**: 日频数据自动刷新（自动化 8:00 触发）。
- **脚本**: daily_refresh.py --update 运行成功。
- **数据变更（共 15 项）**:
  - 政策面(4): twoYMinusFFR 59→62, tenYMinusFFR 104→109, spread5s30s 83→84, spread5s30sDate 2026-07-29→2026-08-10
  - 情绪面(11): vix 15.15→15.46 (date→08-10), hyOasDate→08-10, termPremium10Y 87→83, tpDate→08-07, fwdBE5Y5Y 2.28→2.31, fwdBEDate→08-11, spread10Y3M 78→81, spreadDate→08-11, dxyBroad 119.703→119.065, dxyDate→08-07
- **基本面**: 无变更
- **提交**: de37fe0，push 成功至 main。Vercel 自动构建。
