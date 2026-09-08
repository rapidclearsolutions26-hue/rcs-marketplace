"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#17382b] bg-[#081710]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-2xl items-stretch justify-around">
        {navigation.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-[68px] flex-1 flex-col items-center justify-center gap-1 px-2 text-center transition ${
                active
                  ? "text-[#1BBB8C]"
                  : "text-[#71867c] hover:text-white"
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-xl text-base font-black ${
                  active
                    ? "bg-[#15392e] text-[#1BBB8C]"
                    : "text-[#71867c]"
                }`}
              >
                {item.icon}
              </span>

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