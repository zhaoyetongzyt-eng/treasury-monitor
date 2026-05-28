"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface NavItem {
  id: string;
  number: string;
  title: string;
  titleEn: string;
}

const navItems: NavItem[] = [
  { id: "status", number: "", title: "摘要", titleEn: "Summary" },
  { id: "auction", number: "01", title: "供给与拍卖", titleEn: "Supply & Auction" },
  { id: "holdings", number: "02", title: "持仓与资金流", titleEn: "Holdings & Flows" },
  { id: "leverage", number: "03", title: "杠杆率", titleEn: "Leverage Ratios" },
  { id: "ust-holders", number: "04", title: "UST 买卖机构", titleEn: "UST Buyers & Sellers" },
  { id: "yield-curve", number: "05", title: "收益率曲线", titleEn: "Yield Curve" },
  { id: "decomposition", number: "06", title: "成分分解", titleEn: "Decomposition" },
  { id: "scorecard", number: "07", title: "因子计分卡", titleEn: "Scorecard" },
  { id: "policy", number: "08", title: "货币政策", titleEn: "Monetary Policy" },
  { id: "cross-market", number: "09", title: "跨市场背景", titleEn: "Cross-Market" },
  { id: "events", number: "10", title: "事件与观点", titleEn: "Events & Views" },
];

export default function NavBar() {
  const [activeId, setActiveId] = useState("status");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);

      const scrollPos = window.scrollY + 100;
      for (let i = navItems.length - 1; i >= 0; i--) {
        const el = document.getElementById(navItems[i].id);
        if (!el) continue;
        const elTop = el.getBoundingClientRect().top + window.scrollY;
        if (elTop <= scrollPos) {
          setActiveId(navItems[i].id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    setActiveId(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-[rgba(11,17,32,0.92)] backdrop-blur-xl border-b border-[rgba(148,163,184,0.1)] shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
          : "bg-[rgba(11,17,32,0.75)] backdrop-blur-md border-b border-[rgba(148,163,184,0.06)]"
      )}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center h-13 gap-0">
          {/* 品牌名称 */}
          <div className="shrink-0 flex items-center gap-2 pr-4 mr-2 border-r border-[rgba(148,163,184,0.12)]">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">T</span>
            </div>
            <span className="text-xs font-semibold text-slate-200 tracking-wide whitespace-nowrap">
              Treasury Monitor
            </span>
          </div>

          {/* 导航项 */}
          <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide flex-1 py-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className={cn(
                  "shrink-0 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 whitespace-nowrap",
                  activeId === item.id
                    ? "bg-blue-600/90 text-white shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-[rgba(148,163,184,0.08)]"
                )}
              >
                {item.number && (
                  <span className={cn(
                    "mr-1 text-[10px]",
                    activeId === item.id ? "opacity-70" : "opacity-40"
                  )}>
                    {item.number}
                  </span>
                )}
                {item.title}
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
