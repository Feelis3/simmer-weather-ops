"use client";

import { useEffect, useState } from "react";

export default function Header() {
  const [time, setTime] = useState("");
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-US", { hour12: false }) +
          "." +
          String(now.getMilliseconds()).padStart(3, "0")
      );
      setUptime(Math.floor((Date.now() - start) / 1000));
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, []);

  const fmtUptime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <header className="border-b border-panel-border bg-terminal-dark/90 backdrop-blur-lg sticky top-0 z-50">
      <div className="max-w-[1920px] mx-auto px-5 py-3 flex items-center justify-between">
        {/* Left — brand */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full bg-green-matrix animate-pulse-ring" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-green-matrix font-bold text-sm tracking-wide animate-glow">
                CLAWDBOT
              </span>
              <span className="text-green-dim/25 text-[0.6rem]">//</span>
              <span className="text-green-dim/40 text-[0.65rem] tracking-wider">OPS</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded bg-green-matrix/5 border border-green-matrix/10">
            <span className="text-[0.5rem] text-green-dim/40 uppercase tracking-wider">Simmer + Polymarket</span>
          </div>
        </div>

        {/* Right — system info */}
        <div className="flex items-center gap-1 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface/50">
            <span className="text-green-dim/30 text-[0.55rem]">SYS</span>
            <span className="text-cyan-glow font-mono tabular-nums text-[0.7rem]">{time}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface/50">
            <span className="text-green-dim/30 text-[0.55rem]">UP</span>
            <span className="text-green-matrix/70 tabular-nums text-[0.7rem]">{fmtUptime(uptime)}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface/50">
            <div className="w-1.5 h-1.5 rounded-full bg-green-matrix shadow-[0_0_4px_#39ff7f]" />
            <span className="text-green-dim/40 text-[0.55rem]">ONLINE</span>
          </div>
        </div>
      </div>
    </header>
  );
}
