"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { OWNERS, OWNER_IDS } from "@/lib/owners";

const NAV_ITEMS = [
  { href: "/", label: "Overview", emoji: "◈" },
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
    <div
      className="border-b border-border"
      style={{ background: "rgba(5,9,26,0.7)", backdropFilter: "blur(12px)" }}
    >
      <div className="max-w-[1440px] mx-auto px-5">
        <div className="flex items-center gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const color = "color" in item ? item.color : "#03E78B";
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
                <span>{item.emoji}</span>
                <span>{item.label}</span>
                {"type" in item && (
                  <span
                    className="text-[0.45rem] px-1 py-0.5 rounded font-bold tracking-widest"
                    style={{
                      background: color + "18",
                      color: color + "cc",
                    }}
                  >
                    {item.type}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
