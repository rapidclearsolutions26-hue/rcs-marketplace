"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const GREEN = "#79c51c";
const GREEN_HOVER = "#91db32";
const BG = "#050705";
const CARD = "#0a0e0a";

const navigation = [
  {
    href: "/driver/dashboard",
    label: "Home",
    icon: "⌂",
  },
  {
    href: "/driver/jobs",
    label: "Available",
    icon: "▣",
  },
  {
    href: "/driver/bids",
    label: "Bids",
    icon: "£",
  },
  {
    href: "/driver/assigned",
    label: "Assigned",
    icon: "✓",
  },
];

export default function DriverBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t backdrop-blur-xl"
      style={{
        borderColor: "rgba(255,255,255,0.10)",
        background: "rgba(5,7,5,0.96)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div
        className="mx-auto flex max-w-2xl items-stretch justify-around"
        style={{ background: BG }}
      >
        {navigation.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className="group relative flex min-h-[72px] flex-1 flex-col items-center justify-center gap-1.5 px-2 text-center transition"
              style={{
                color: active
                  ? GREEN
                  : "rgba(255,255,255,0.42)",
              }}
            >
              {/* ACTIVE INDICATOR */}
              {active && (
                <span
                  className="absolute top-0 h-0.5 w-10 rounded-full"
                  style={{
                    background: GREEN,
                    boxShadow: `0 0 12px ${GREEN}55`,
                  }}
                />
              )}

              {/* ICON */}
              <span
                className="flex h-9 w-9 items-center justify-center rounded-xl text-base font-black transition"
                style={{
                  background: active
                    ? `${GREEN}12`
                    : "transparent",
                  color: active
                    ? GREEN
                    : "rgba(255,255,255,0.42)",
                }}
              >
                {item.icon}
              </span>

              {/* LABEL */}
              <span className="text-[10px] font-black sm:text-xs">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}