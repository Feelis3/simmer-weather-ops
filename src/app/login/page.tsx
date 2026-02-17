"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError("ACCESS DENIED - Invalid credentials");
        setPassword("");
      }
    } catch {
      setError("CONNECTION FAILED - Server unreachable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-terminal flex items-center justify-center px-4">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-green-matrix/[0.02] via-transparent to-green-matrix/[0.01]" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-green-matrix font-bold text-2xl tracking-[0.3em] animate-glow-pulse mb-2">
            CLAWDBOT
          </div>
          <div className="text-green-dim/20 text-[0.6rem] tracking-widest uppercase">
            Operations Terminal v2.0
          </div>
          <div className="mt-3 flex justify-center gap-1">
            <div className="w-8 h-px bg-green-matrix/20" />
            <div className="w-2 h-px bg-green-matrix/40" />
            <div className="w-8 h-px bg-green-matrix/20" />
          </div>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="panel p-6 space-y-5">
          {/* Terminal prompt */}
          <div className="flex items-center gap-2 pb-3 border-b border-panel-border">
            <div className="w-2 h-2 rounded-full bg-green-matrix/60 animate-pulse" />
            <span className="text-[0.6rem] text-green-matrix/60 font-bold tracking-widest uppercase">
              Authentication Required
            </span>
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-[0.55rem] text-green-dim/30 uppercase tracking-wider font-medium block">
              &gt; User ID
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-terminal-dark/80 border border-panel-border rounded-md px-3 py-2.5 text-sm text-green-matrix font-mono placeholder:text-green-dim/15 focus:outline-none focus:border-green-matrix/40 focus:ring-1 focus:ring-green-matrix/20 transition-all"
              placeholder="username"
              autoComplete="username"
              autoFocus
              required
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-[0.55rem] text-green-dim/30 uppercase tracking-wider font-medium block">
              &gt; Access Key
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-terminal-dark/80 border border-panel-border rounded-md px-3 py-2.5 text-sm text-green-matrix font-mono placeholder:text-green-dim/15 focus:outline-none focus:border-green-matrix/40 focus:ring-1 focus:ring-green-matrix/20 transition-all"
              placeholder="********"
              autoComplete="current-password"
              required
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-md bg-red-alert/5 border border-red-alert/20">
              <div className="w-1.5 h-1.5 rounded-full bg-red-alert animate-pulse" />
              <span className="text-red-alert text-[0.6rem] font-bold tracking-wider">{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-md text-[0.65rem] font-bold tracking-[0.2em] uppercase transition-all border disabled:opacity-50 disabled:cursor-not-allowed bg-green-matrix/10 text-green-matrix border-green-matrix/30 hover:bg-green-matrix/20 hover:shadow-[0_0_15px_rgba(57,255,127,0.1)]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-matrix animate-pulse" />
                Authenticating...
              </span>
            ) : (
              "Access System"
            )}
          </button>

          {/* Footer */}
          <div className="pt-3 border-t border-panel-border">
            <p className="text-[0.45rem] text-green-dim/15 text-center tracking-wider">
              Session persists for 30 days &middot; Secure cookie auth
            </p>
          </div>
        </form>

        {/* Bottom decoration */}
        <div className="mt-6 text-center">
          <span className="text-[0.45rem] text-green-dim/10 tracking-widest">
            POLYMARKET &middot; SIMMER &middot; WEATHER &middot; BTC &middot; EIA &middot; FRED
          </span>
        </div>
      </div>
    </div>
  );
}
