import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: "美债流动性与供需面看板 · Treasury Liquidity & Supply-Demand Monitor",
  description: "聚焦美债供给压力、需求承接与资金面流动性变化，系统跟踪拍卖、持仓、回购、杠杆与全球资金流信号。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-gray-50">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
