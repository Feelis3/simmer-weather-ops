"use client";

import WeatherChart from "./WeatherChart";
import type { WeatherMarketData } from "@/lib/types";

interface Props {
  markets: WeatherMarketData[];
}

export default function CityGrid({ markets }: Props) {
  if (markets.length === 0) {
    return (
      <div className="panel p-8 text-center">
        <p className="text-green-dim/30 text-xs">&gt; NO WEATHER MARKETS FOUND FOR TODAY</p>
        <p className="text-green-dim/20 text-[0.6rem] mt-1">
          Markets are created daily. Check back when new markets open.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-green-dim/40 text-xs">&gt;</span>
        <h2 className="text-xs font-bold tracking-widest uppercase text-green-matrix">
          Weather Markets — Temperature Distribution
        </h2>
        <span className="ml-2 text-[0.6rem] text-amber-warm tabular-nums">
          [{markets.length} CITIES]
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {markets.map((m) => (
          <WeatherChart key={m.city} market={m} />
        ))}
      </div>

      {/* Summary strip */}
      <div className="mt-4 panel p-3">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {markets.map((m) => {
            const peak = m.buckets.reduce((best, b) =>
              b.yesPrice > best.yesPrice ? b : best, m.buckets[0]);
            const pLabel = peak?.label
              .replace(/^.*?(\d)/, "$1")
              .replace(/orHigher|orLower/gi, "+")
              .replace(/F$/i, "°F");
            return (
              <div key={m.city} className="flex items-center gap-3 text-xs">
                <span className="text-green-dim/50 font-bold">{m.city}</span>
                <span className="text-cyan-glow tabular-nums">{pLabel}</span>
                <span className="text-green-matrix tabular-nums">
                  {((peak?.yesPrice ?? 0) * 100).toFixed(1)}%
                </span>
                <div className="h-1 rounded-full bg-green-matrix/20" style={{ width: 60 }}>
                  <div
                    className="h-full rounded-full bg-green-matrix shadow-[0_0_4px_#00ff41]"
                    style={{ width: `${(peak?.yesPrice ?? 0) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
