#!/usr/bin/env python3
"""
美债看板日频数据刷新脚本
- 直接从 FRED CSV 下载（无需 API Key）
- 解析并计算最新值
- 对比并更新源码 FALLBACK 常量
- 输出 git diff 建议

用法:
  python3 daily_refresh.py --check         # 只检查，不修改
  python3 daily_refresh.py --update        # 检查并更新源码
"""
import subprocess
import re
import sys
import os
import argparse
import pandas as pd
from pathlib import Path
from typing import Optional, Tuple, Dict

REPO = Path("/Users/zyt/WorkBuddy/2026-05-25-18-53-35/treasury-monitor")
SRC = REPO / "src" / "app" / "api"
CACHE_DIR = Path("/tmp/fred/cache")
CACHE_DIR.mkdir(parents=True, exist_ok=True)

# 1) 下载 FRED CSV
def download_csv(series_id: str) -> Path:
    path = CACHE_DIR / f"{series_id}.csv"
    if path.exists() and (pd.Timestamp.now() - pd.Timestamp.fromtimestamp(path.stat().st_mtime)).seconds < 3600:
        return path  # 1 小时内缓存复用
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}"
    subprocess.run(["curl", "-s", "-L", "--max-time", "15", "-o", str(path), url], check=True, timeout=30)
    return path

def load_series(series_id: str) -> Optional[pd.DataFrame]:
    try:
        path = download_csv(series_id)
        df = pd.read_csv(path, parse_dates=['observation_date'], na_values='.')
        df.columns = ['DATE', series_id]
        df[series_id] = pd.to_numeric(df[series_id], errors='coerce')
        return df.dropna(subset=[series_id]).sort_values('DATE', ascending=False).reset_index(drop=True)
    except Exception as e:
        print(f"  ! Failed {series_id}: {e}", file=sys.stderr)
        return None

def latest(df: pd.DataFrame) -> Tuple[pd.Timestamp, float]:
    row = df.iloc[0]
    return row['DATE'], float(row[df.columns[1]])

# 2) 计算各模块最新值
def fetch_fundamentals() -> Dict:
    out = {}
    gdp = load_series("A191RL1Q225SBEA")
    if gdp is not None:
        d, v = latest(gdp)
        out['gdpQoQ'] = v
        out['gdpDate'] = f"{d.year}-Q{(d.month-1)//3 + 1}"
    pce = load_series("PCEPILFE")
    if pce is not None:
        d, v = latest(pce)
        prev = pce[pce['DATE'] <= d - pd.DateOffset(months=12)]
        if len(prev) > 0:
            base = prev.iloc[0][pce.columns[1]]
            out['corePceYoY'] = round((v / base - 1) * 1000) / 10
            out['corePceDate'] = d.strftime('%Y-%m')
    cpi = load_series("CPIAUCSL")
    if cpi is not None:
        d, v = latest(cpi)
        prev = cpi[cpi['DATE'] <= d - pd.DateOffset(months=12)]
        if len(prev) > 0:
            base = prev.iloc[0][cpi.columns[1]]
            out['cpiYoY'] = round((v / base - 1) * 1000) / 10
            out['cpiDate'] = d.strftime('%Y-%m')
    unrate = load_series("UNRATE")
    if unrate is not None:
        d, v = latest(unrate)
        out['unemployment'] = v
        out['employmentDate'] = d.strftime('%Y-%m')
    payems = load_series("PAYEMS")
    if payems is not None and len(payems) >= 2:
        d, v = latest(payems)
        prev = float(payems.iloc[1][payems.columns[1]])
        out['nfpMoM'] = round(v - prev)
        out['employmentDate'] = d.strftime('%Y-%m')
    deficit = load_series("FYFSGDA188S")
    if deficit is not None:
        d, v = latest(deficit)
        out['deficitPctGDP'] = v
        out['deficitDate'] = f"{d.year}-FY"
    return out

def fetch_policy() -> Dict:
    out = {}
    taru = load_series("DFEDTARU")
    if taru is not None:
        d, v = latest(taru)
        out['ffTargetUpper'] = v
        out['ffTargetDate'] = d.strftime('%Y-%m-%d')
    tarl = load_series("DFEDTARL")
    if tarl is not None:
        _, v = latest(tarl)
        out['ffTargetLower'] = v
    dff = load_series("DFF")
    if dff is not None:
        d, v = latest(dff)
        out['ffEffective'] = v
    iorb = load_series("IORB")
    if iorb is not None:
        _, v = latest(iorb)
        out['iorbRate'] = v
    rrp = load_series("RRPONTSYAWARD")
    if rrp is not None:
        _, v = latest(rrp)
        out['onRrpRate'] = v
    walcl = load_series("WALCL")
    if walcl is not None and len(walcl) >= 5:
        d, v = latest(walcl)
        wk4 = float(walcl.iloc[4][walcl.columns[1]])
        out['fedBalanceSheet'] = round(v / 1_000_000 * 100) / 100
        out['fedBsDate'] = d.strftime('%Y-%m-%d')
        out['fedBs4WkAgo'] = round(wk4 / 1_000_000 * 100) / 100
        out['qtMonthlyPace'] = round((v - wk4) / 1000 * (13/4) * 10) / 10
    dgs2 = load_series("DGS2")
    dgs5 = load_series("DGS5")
    dgs10 = load_series("DGS10")
    dgs30 = load_series("DGS30")
    if all([dgs2 is not None, dgs5 is not None, dgs10 is not None, dgs30 is not None, dff is not None]):
        y2 = float(dgs2.iloc[0]['DGS2'])
        y5 = float(dgs5.iloc[0]['DGS5'])
        y10 = float(dgs10.iloc[0]['DGS10'])
        y30 = float(dgs30.iloc[0]['DGS30'])
        effr = float(dff.iloc[0]['DFF'])
        out['twoYMinusFFR'] = round((y2 - effr) * 100)
        out['tenYMinusFFR'] = round((y10 - effr) * 100)
        out['spread5s30s'] = round((y30 - y5) * 100)
        out['spread5s30sDate'] = dgs30.iloc[0]['DATE'].strftime('%Y-%m-%d')
    return out

def fetch_sentiment() -> Dict:
    out = {}
    vix = load_series("VIXCLS")
    if vix is not None:
        d, v = latest(vix)
        out['vix'] = v
        out['vixDate'] = d.strftime('%Y-%m-%d')
    hyoas = load_series("BAMLH0A0HYM2")
    if hyoas is not None:
        d, v = latest(hyoas)
        out['hyOas'] = v
        out['hyOasDate'] = d.strftime('%Y-%m-%d')
    tp = load_series("THREEFYTP10")
    if tp is not None:
        d, v = latest(tp)
        out['termPremium10Y'] = round(v * 100)
        out['tpDate'] = d.strftime('%Y-%m-%d')
    t5yifr = load_series("T5YIFR")
    if t5yifr is not None:
        d, v = latest(t5yifr)
        out['fwdBE5Y5Y'] = v
        out['fwdBEDate'] = d.strftime('%Y-%m-%d')
    t10y3m = load_series("T10Y3M")
    if t10y3m is not None:
        d, v = latest(t10y3m)
        out['spread10Y3M'] = round(v * 100)
        out['spreadDate'] = d.strftime('%Y-%m-%d')
    dxy = load_series("DTWEXBGS")
    if dxy is not None:
        d, v = latest(dxy)
        out['dxyBroad'] = v
        out['dxyDate'] = d.strftime('%Y-%m-%d')
    return out

# 3) 读取/更新 FALLBACK 源代码
def read_fallback(path: Path) -> Dict:
    """从源码读取 FALLBACK 当前值"""
    text = path.read_text()
    # 找到 const FALLBACK = { ... } 块
    m = re.search(r'const FALLBACK = \{([^}]+)\}', text, re.DOTALL)
    if not m:
        return {}
    block = m.group(1)
    result = {}
    # 解析形如 key: value,  // comment 或 key: 'string',
    for line in block.split('\n'):
        line = line.strip()
        if not line or line.startswith('//'):
            continue
        m2 = re.match(r'(\w+):\s*([^,]+?)(,|$)', line)
        if m2:
            key, val = m2.group(1), m2.group(2).strip()
            # 解析字面量
            if val.startswith('"') or val.startswith("'"):
                result[key] = ('string', val.strip('"\''))
            else:
                try:
                    result[key] = ('number', float(val))
                except ValueError:
                    pass
    return result

def update_fallback(path: Path, new_vals: Dict) -> int:
    """更新源码 FALLBACK 块；返回变更数量"""
    text = path.read_text()
    updates = 0
    for key, new_val in new_vals.items():
        # 匹配 key: <现有值>,
        pattern = rf'({key}:\s*)([^,\n]+)(,)'
        m = re.search(pattern, text)
        if not m:
            continue
        old = m.group(2).strip()
        if isinstance(new_val, str):
            new_str = f'"{new_val}"'
        else:
            new_str = f"{new_val:g}" if isinstance(new_val, float) else str(new_val)
        # 处理 float 精度：若相同则跳过
        try:
            old_num = float(old.strip('"\''))
            if abs(old_num - float(new_str)) < 0.01:
                continue
        except ValueError:
            if old.strip('"\'') == new_str.strip('"\''):
                continue
        text = text[:m.start(2)] + new_str + text[m.end(2):]
        updates += 1
        print(f"  {key}: {old} → {new_str}")
    if updates > 0:
        path.write_text(text)
    return updates

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--check", action="store_true", help="只检查不修改")
    p.add_argument("--update", action="store_true", help="检查并更新")
    args = p.parse_args()
    if not (args.check or args.update):
        args.check = True

    targets = [
        ("基本面", SRC / "fundamentals" / "route.ts", fetch_fundamentals),
        ("政策面", SRC / "policy" / "route.ts", fetch_policy),
        ("情绪面", SRC / "sentiment" / "route.ts", fetch_sentiment),
    ]
    total_updates = 0
    for name, path, fetcher in targets:
        print(f"\n[{name}]")
        new_vals = fetcher()
        if not new_vals:
            print(f"  ! No data fetched")
            continue
        current = read_fallback(path)
        diffs = []
        for k, v in new_vals.items():
            if k not in current:
                continue
            cur_type, cur_val = current[k]
            if cur_type == 'string':
                if str(cur_val) != str(v):
                    diffs.append((k, cur_val, v))
            else:
                if abs(float(cur_val) - float(v)) > 0.01:
                    diffs.append((k, cur_val, v))
        if not diffs:
            print(f"  ✓ All up to date")
        else:
            print(f"  {len(diffs)} changes needed:")
            for k, old, new in diffs:
                print(f"    {k}: {old} → {new}")
            if args.update:
                n = update_fallback(path, new_vals)
                total_updates += n
    print(f"\n=== Total updates: {total_updates} ===")
    return 0 if total_updates == 0 or args.update else 1

if __name__ == "__main__":
    sys.exit(main())
