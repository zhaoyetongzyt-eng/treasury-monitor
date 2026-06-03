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
  { id: "ust-holders", number: "03", title: "UST 持有人结构", titleEn: "UST Holders Structure" },
  { id: "leverage", number: "04", title: "杠杆率", titleEn: "Leverage Ratios" },
  { id: "global-investor", number: "05", title: "全球资金与储备配置", titleEn: "Global Reserves & Investor Lens" },
];

export default function NavBar() {
  const [activeId, setActiveId] = useState("status");

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 100;

      // 从后往前遍历 navItems，避免 filter(Boolean) 导致的索引错位
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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center h-12 gap-1 overflow-x-auto scrollbar-hide">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className={cn(
                "shrink-0 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap",
                activeId === item.id
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              )}
            >
              {item.number && (
                <span className="mr-1 opacity-70">{item.number}</span>
              )}
              {item.title}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
