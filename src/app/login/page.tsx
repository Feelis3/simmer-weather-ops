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
        setError("Invalid credentials");
        setPassword("");
      }
    } catch {
      setError("Server unreachable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      {/* Background gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-neon/[0.02] via-transparent to-pink/[0.01]" />
      </div>

      <div className="relative w-full max-w-sm animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-neon font-bold text-2xl tracking-wider glow-neon mb-2">
            CLAWDBOT
          </div>
          <div className="text-text-muted text-xs tracking-wider">
            Operations Dashboard
          </div>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="card p-7 space-y-5">
          {/* Header */}
          <div className="flex items-center gap-2 pb-4 border-b border-border">
            <div className="w-2 h-2 rounded-full bg-neon/60 animate-pulse-neon" />
            <span className="text-xs text-text-secondary font-semibold tracking-wide">
              Sign in to continue
            </span>
          </div>

          {/* Username */}
          <div className="space-y-2">
            <label className="text-xs text-text-secondary font-medium block">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon/40 focus:ring-1 focus:ring-neon/20 transition-all"
              placeholder="Enter username"
              autoComplete="username"
              autoFocus
              required
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="text-xs text-text-secondary font-medium block">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon/40 focus:ring-1 focus:ring-neon/20 transition-all"
              placeholder="Enter password"
              autoComplete="current-password"
              required
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red/5 border border-red/20">
              <div className="w-1.5 h-1.5 rounded-full bg-red animate-pulse" />
              <span className="text-red text-xs font-semibold">{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-neon/10 text-neon hover:bg-neon/20 border-glow-neon"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-neon animate-pulse-neon" />
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </button>

          {/* Footer */}
          <div className="pt-3 border-t border-border">
            <p className="text-[0.55rem] text-text-muted text-center">
              Session persists for 30 days
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
