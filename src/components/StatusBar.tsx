"use client";

interface Props {
  lastUpdate: number;
  isLoading: boolean;
  onRefresh: () => void;
}

export default function StatusBar({ lastUpdate, isLoading, onRefresh }: Props) {
  return (
    <div className="border-t border-panel-border bg-terminal-dark/90 backdrop-blur-lg sticky bottom-0 z-50">
      <div className="max-w-[1920px] mx-auto px-5 py-2 flex items-center justify-between text-[0.6rem]">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface/50">
            <span className="text-green-dim/25">WALLET</span>
            <span className="text-green-dim/50 font-mono tabular-nums">0x3925...4572</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface/50">
            <span className="text-green-dim/25">VENUE</span>
            <span className="text-purple-fade/60">POLYMARKET</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface/50">
            <span className="text-green-dim/25">ENGINE</span>
            <span className="text-amber-warm/60">SIMMER</span>
          </div>
          <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface/50">
            <span className="text-green-dim/25">VPS</span>
            <span className="text-cyan-glow/50 tabular-nums">194.163.160.76</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-green-dim/20 tabular-nums">
            {lastUpdate ? new Date(lastUpdate).toLocaleTimeString("en-US", { hour12: false }) : "---"}
          </span>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="px-3 py-1 rounded-md border border-green-matrix/20 text-green-matrix/70
                       hover:bg-green-matrix/5 hover:border-green-matrix/30 hover:text-green-matrix
                       disabled:opacity-20 disabled:cursor-not-allowed
                       transition-all text-[0.6rem] tracking-wider uppercase font-medium"
          >
            {isLoading ? "SYNCING..." : "REFRESH"}
          </button>
        </div>
      </div>
    </div>
  );
}
