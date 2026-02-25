"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { OWNERS, OWNER_IDS } from "@/lib/owners";

const NAV_ITEMS = [
  { href: "/", label: "Overview", emoji: "⬡", color: "#00f5a0" },
  ...OWNER_IDS.map((id) => ({
    href: `/${id}`,
    label: OWNERS[id].name,
    emoji: OWNERS[id].emoji,
    color: OWNERS[id].color,
    type: OWNERS[id].type,
  })),
];

export default function Nav() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return (
    <header
      className="sticky top-0 z-50 border-b border-border"
      style={{ background: "rgba(2,4,11,0.92)", backdropFilter: "blur(24px)" }}
    >
      <div className="max-w-[1440px] mx-auto px-5 h-12 flex items-center justify-between gap-6">

        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center"
            style={{ background: "rgba(0,245,160,0.08)", border: "1px solid rgba(0,245,160,0.12)" }}
          >
            <span style={{ color: "#00f5a0", fontSize: "0.5rem", fontWeight: 900 }}>C</span>
          </div>
          <span className="text-text-primary font-bold text-[0.7rem] tracking-[0.18em] hidden sm:block">
            CLAWDBOT
          </span>
        </div>

        {/* Nav tabs — pill group */}
        <nav
          className="flex items-center gap-0.5 rounded-xl p-0.5 overflow-x-auto"
          style={{ background: "rgba(14,18,32,0.8)", border: "1px solid #0e1220" }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const color = item.color;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.6rem] font-semibold tracking-wide transition-all whitespace-nowrap shrink-0"
                style={
                  isActive
                    ? {
                        background: color + "18",
                        color: color,
                        boxShadow: `inset 0 1px 0 ${color}15`,
                      }
                    : {
                        color: "#4a6080",
                      }
                }
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLAnchorElement).style.color = "#8899bb";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLAnchorElement).style.color = "#4a6080";
                }}
              >
                <span className="text-[0.8rem] leading-none">{item.emoji}</span>
                <span>{item.label}</span>
                {"type" in item && (
                  <span
                    className="text-[0.4rem] px-1 py-0.5 rounded font-black tracking-widest hidden sm:inline"
                    style={{ background: color + "15", color: color + "90" }}
                  >
                    {item.type}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right slot — empty spacer to balance */}
        <div className="w-24 shrink-0 hidden sm:block" />
      </div>
    </header>
  );
}
