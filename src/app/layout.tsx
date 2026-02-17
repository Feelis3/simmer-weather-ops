import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CLAWDBOT // OPS",
  description: "Trading bot dashboard — Weather, BTC, EIA, FRED bots on Polymarket via Simmer",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased animate-flicker">{children}</body>
    </html>
  );
}
