"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

type RCSHeaderProps = {
  loggedIn?: boolean;
};

export default function RCSHeader({
  loggedIn = false,
}: RCSHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const accountHref = loggedIn
    ? "/customer/dashboard"
    : "/customer/login";

  const accountLabel = loggedIn
    ? "Dashboard"
    : "Customer Login";

  const navItems = [
    ["/customer/post-job", "Post a Waste Job"],
    ["/services", "Services"],
    ["/#how-it-works", "How It Works"],
    ["/driver/register", "For Drivers"],
    ["/#reviews", "Customer Reviews"],
    ["/customer/login", "Customer Login"],
    ["/driver/login", "Driver Login"],
    ["/driver/register", "Join as a Driver"],
  ];

  return (
    <header
      className={`sticky top-0 z-[100] border-b border-white/[0.07] bg-[#050705]/95 backdrop-blur-xl ${
        menuOpen ? "shadow-2xl" : ""
      }`}
    >
      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-4 sm:h-[76px] sm:px-6 lg:px-8">
        {/* LOGO */}
        <Link
          href="/"
          onClick={() => setMenuOpen(false)}
          className="shrink-0"
          aria-label="Rapid Clear Solutions home"
        >
          <Image
            src="/rapid-clear-logo.png"
            alt="Rapid Clear Solutions"
            width={220}
            height={70}
            priority
            className="h-9 w-auto object-contain sm:h-12"
          />
        </Link>

        {/* DESKTOP NAV */}
        <nav className="hidden items-center gap-7 lg:flex">
          <Link
            href="/services"
            className="text-sm font-semibold text-gray-300 transition hover:text-[#79c51c]"
          >
            Services
          </Link>

          <Link
            href="/#how-it-works"
            className="text-sm font-semibold text-gray-300 transition hover:text-[#79c51c]"
          >
            How It Works
          </Link>

          <Link
            href="/driver/register"
            className="text-sm font-semibold text-gray-300 transition hover:text-[#79c51c]"
          >
            For Drivers
          </Link>

          <Link
            href="/#reviews"
            className="text-sm font-semibold text-gray-300 transition hover:text-[#79c51c]"
          >
            Reviews
          </Link>
        </nav>

        {/* DESKTOP ACTIONS */}
        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href={accountHref}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-black text-white transition hover:border-[#79c51c]/40 hover:bg-[#79c51c]/10"
          >
            {accountLabel}
          </Link>

          <Link
            href="/customer/post-job"
            className="rounded-xl bg-[#79c51c] px-4 py-2.5 text-sm font-black text-black transition hover:bg-[#91db32]"
          >
            POST A WASTE JOB
          </Link>
        </div>

        {/* MOBILE ACTIONS */}
        <div className="flex items-center gap-2 lg:hidden">
          {/* ACCOUNT */}
          <Link
            href={accountHref}
            onClick={() => setMenuOpen(false)}
            aria-label={accountLabel}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white transition hover:border-[#79c51c]/40 hover:bg-[#79c51c]/10"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 21a8 8 0 0 0-16 0" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </Link>

          {/* HAMBURGER */}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white transition hover:border-[#79c51c]/40 hover:bg-[#79c51c]/10"
          >
            <div className="relative flex h-5 w-5 flex-col justify-center">
              <span
                className={`absolute left-0 h-[2px] w-5 rounded-full bg-white transition ${
                  menuOpen
                    ? "top-[9px] rotate-45"
                    : "top-[3px]"
                }`}
              />

              <span
                className={`absolute left-0 top-[9px] h-[2px] w-5 rounded-full bg-white transition ${
                  menuOpen ? "opacity-0" : "opacity-100"
                }`}
              />

              <span
                className={`absolute left-0 h-[2px] w-5 rounded-full bg-white transition ${
                  menuOpen
                    ? "top-[9px] -rotate-45"
                    : "top-[15px]"
                }`}
              />
            </div>
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      {menuOpen && (
        <div className="border-t border-white/[0.07] bg-[#050705] lg:hidden">
          <nav className="mx-auto max-w-7xl px-4 pb-5 sm:px-6">
            <div className="pt-2">
              {/* MAIN CTA */}
              <Link
                href="/customer/post-job"
                onClick={() => setMenuOpen(false)}
                className="mt-2 flex min-h-[54px] items-center justify-center rounded-xl bg-[#79c51c] px-4 text-sm font-black text-black transition hover:bg-[#91db32]"
              >
                POST A WASTE JOB
              </Link>

              {/* NAVIGATION */}
              <div className="mt-3 overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02]">
                <Link
                  href="/services"
                  onClick={() => setMenuOpen(false)}
                  className="block border-b border-white/[0.07] px-4 py-4 text-sm font-bold text-gray-300 transition hover:bg-white/[0.03] hover:text-[#79c51c]"
                >
                  Services
                </Link>

                <Link
                  href="/#how-it-works"
                  onClick={() => setMenuOpen(false)}
                  className="block border-b border-white/[0.07] px-4 py-4 text-sm font-bold text-gray-300 transition hover:bg-white/[0.03] hover:text-[#79c51c]"
                >
                  How It Works
                </Link>

                <Link
                  href="/driver/register"
                  onClick={() => setMenuOpen(false)}
                  className="block border-b border-white/[0.07] px-4 py-4 text-sm font-bold text-gray-300 transition hover:bg-white/[0.03] hover:text-[#79c51c]"
                >
                  For Drivers
                </Link>

                <Link
                  href="/#reviews"
                  onClick={() => setMenuOpen(false)}
                  className="block border-b border-white/[0.07] px-4 py-4 text-sm font-bold text-gray-300 transition hover:bg-white/[0.03] hover:text-[#79c51c]"
                >
                  Customer Reviews
                </Link>

                <Link
                  href="/customer/login"
                  onClick={() => setMenuOpen(false)}
                  className="block border-b border-white/[0.07] px-4 py-4 text-sm font-bold text-gray-300 transition hover:bg-white/[0.03] hover:text-[#79c51c]"
                >
                  Customer Login
                </Link>

                <Link
                  href="/driver/login"
                  onClick={() => setMenuOpen(false)}
                  className="block border-b border-white/[0.07] px-4 py-4 text-sm font-bold text-gray-300 transition hover:bg-white/[0.03] hover:text-[#79c51c]"
                >
                  Driver Login
                </Link>

                <Link
                  href="/driver/register"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-4 text-sm font-bold text-[#79c51c] transition hover:bg-white/[0.03]"
                >
                  Join as a Driver
                </Link>
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}