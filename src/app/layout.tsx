import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
