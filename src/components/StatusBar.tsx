"use client";

interface Props {
  lastUpdate: number;
  isLoading: boolean;
  onRefresh: () => void;
}

export default function StatusBar({ lastUpdate, isLoading, onRefresh }: Props) {
  return (
    <div className="border-t border-panel-border bg-terminal-dark/80 backdrop-blur-sm sticky bottom-0 z-50">
      <div className="max-w-[1920px] mx-auto px-4 py-2 flex items-center justify-between text-[0.6rem]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-green-dim/40">WALLET</span>
            <span className="text-green-dim/60 font-mono">0x3925...4572</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-dim/40">VENUE</span>
            <span className="text-purple-fade">POLYMARKET</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-dim/40">ENGINE</span>
            <span className="text-amber-warm">SIMMER.MARKETS</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-green-dim/30">
            LAST UPDATE: {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : "---"}
          </span>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="px-3 py-1 border border-green-matrix/30 text-green-matrix hover:bg-green-matrix/10
                       disabled:opacity-30 transition-all text-[0.6rem] tracking-wider uppercase"
          >
            {isLoading ? "SYNCING..." : "REFRESH"}
          </button>
        </div>
      </div>
    </div>
  );
}
