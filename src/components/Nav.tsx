"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { OWNERS, OWNER_IDS } from "@/lib/owners";

const NAV_ITEMS = [
  { href: "/", label: "Overview", emoji: "◈" },
  ...OWNER_IDS.map((id) => ({
    href: `/${id}`,
    label: OWNERS[id].name,
    emoji: OWNERS[id].emoji,
    color: OWNERS[id].color,
    type: OWNERS[id].type,
    avatar: OWNERS[id].avatar,
  })),
];

export default function Nav() {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(true);

  // Sync with localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    setIsDark(saved !== "light");
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("theme", "light");
    }
  };

  if (pathname === "/login") return null;

  return (
    <div
      className="border-b border-border sticky top-0 z-40"
      style={{ background: "var(--ui-bg-mid)", backdropFilter: "blur(12px)" }}
    >
      <div className="max-w-[1440px] mx-auto px-5">
        <div className="flex items-center gap-1 overflow-x-auto">
          {/* Nav links */}
          <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              const color = "color" in item ? item.color! : "#03E78B";
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-[0.6rem] font-semibold tracking-wide transition-all whitespace-nowrap border-b-2 ${
                    isActive
                      ? "text-text-primary"
                      : "text-text-muted hover:text-text-secondary border-transparent"
                  }`}
                  style={
                    isActive
                      ? { borderBottomColor: color, color }
                      : { borderBottomColor: "transparent" }
                  }
                >
                  {"avatar" in item && item.avatar ? (
                    <NavAvatar src={item.avatar} fallback={item.emoji} size={16} />
                  ) : (
                    <span className="leading-none">{item.emoji}</span>
                  )}
                  <span>{item.label}</span>
                  {"type" in item && (
                    <span
                      className="text-[0.45rem] px-1 py-0.5 rounded font-bold tracking-widest"
                      style={{ background: color + "18", color: color + "cc" }}
                    >
                      {item.type}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="shrink-0 ml-2 px-2.5 py-1.5 rounded-lg text-[0.7rem] font-bold transition-all border"
            style={{
              background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)",
              borderColor: "var(--ui-border)",
              color: "var(--ui-t2)",
            }}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? "☀️" : "🌙"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Small circular avatar with jpg → svg → emoji fallback */
function NavAvatar({ src, fallback, size }: { src: string; fallback: string; size: number }) {
  const [imgSrc, setImgSrc] = useState(`${src}.jpg`);
  const [failed, setFailed] = useState(false);

  const handleError = () => {
    if (imgSrc.endsWith(".jpg")) {
      setImgSrc(`${src}.svg`);
    } else {
      setFailed(true);
    }
  };

  if (failed) return <span className="leading-none">{fallback}</span>;

  return (
    <img
      src={imgSrc}
      alt=""
      width={size}
      height={size}
      onError={handleError}
      className="rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  );
}
