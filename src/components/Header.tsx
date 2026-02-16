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
    <header className="border-b border-panel-border bg-terminal-dark/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-[1920px] mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-matrix shadow-[0_0_6px_#00ff41] animate-pulse" />
            <span className="text-green-matrix font-bold text-sm tracking-wider animate-glow">
              SIMMER://WEATHER_OPS
            </span>
          </div>
          <span className="text-green-dim/40 text-xs">|</span>
          <span className="text-green-dim/60 text-xs">CLAWDBOT TRACKER v1.0</span>
        </div>

        <div className="flex items-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-green-dim/40">SYS</span>
            <span className="text-cyan-glow font-mono">{time}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-dim/40">UPTIME</span>
            <span className="text-green-matrix">{fmtUptime(uptime)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-dim/40">NET</span>
            <span className="text-green-matrix">POLYMARKET</span>
            <div className="w-1.5 h-1.5 rounded-full bg-green-matrix shadow-[0_0_4px_#00ff41]" />
          </div>
        </div>
      </div>
    </header>
  );
}
