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

  return (
    <header
      className={`pwa-header sticky top-0 z-[100] w-full border-b border-white/[0.07] bg-[#050705]/95 backdrop-blur-xl ${
        menuOpen ? "shadow-2xl" : ""
      }`}
    >
      <div className="mx-auto flex min-h-[68px] w-full max-w-7xl items-center justify-between px-4 sm:min-h-[76px] sm:px-6 lg:px-8">

        {/* LOGO */}
        <Link
          href="/"
          onClick={() => setMenuOpen(false)}
          className="flex min-w-0 shrink-0 items-center"
          aria-label="Rapid Clear Solutions home"
        >
          <Image
            src="/rapid-clear-logo.png"
            alt="Rapid Clear Solutions"
            width={220}
            height={70}
            priority
            className="h-9 w-auto max-w-[150px] object-contain sm:h-12 sm:max-w-none"
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
        <div className="flex shrink-0 items-center gap-2 lg:hidden">

          {/* ACCOUNT BUTTON */}
          <Link
            href={accountHref}
            onClick={() => setMenuOpen(false)}
            aria-label={accountLabel}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white transition active:scale-95"
          >
            <svg
              width="21"
              height="21"
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
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white transition active:scale-95"
          >
            <span className="relative block h-5 w-5">
              <span
                className={`absolute left-0 block h-[2px] w-5 rounded-full bg-white transition-all duration-200 ${
                  menuOpen
                    ? "top-[9px] rotate-45"
                    : "top-[3px]"
                }`}
              />

              <span
                className={`absolute left-0 top-[9px] block h-[2px] w-5 rounded-full bg-white transition-all duration-200 ${
                  menuOpen ? "opacity-0" : "opacity-100"
                }`}
              />

              <span
                className={`absolute left-0 block h-[2px] w-5 rounded-full bg-white transition-all duration-200 ${
                  menuOpen
                    ? "top-[9px] -rotate-45"
                    : "top-[15px]"
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      {menuOpen && (
        <div className="border-t border-white/[0.07] bg-[#050705] lg:hidden">
          <nav className="mx-auto max-w-7xl px-4 pb-5 sm:px-6">

            {/* MAIN CTA */}
            <Link
              href="/customer/post-job"
              onClick={() => setMenuOpen(false)}
              className="mt-3 flex min-h-[54px] items-center justify-center rounded-xl bg-[#79c51c] px-4 text-sm font-black text-black transition active:scale-[0.99]"
            >
              POST A WASTE JOB
            </Link>

            {/* NAVIGATION */}
            <div className="mt-3 overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02]">

              <Link
                href="/services"
                onClick={() => setMenuOpen(false)}
                className="block border-b border-white/[0.07] px-4 py-4 text-sm font-bold text-gray-300 transition active:bg-white/[0.05]"
              >
                Services
              </Link>

              <Link
                href="/#how-it-works"
                onClick={() => setMenuOpen(false)}
                className="block border-b border-white/[0.07] px-4 py-4 text-sm font-bold text-gray-300 transition active:bg-white/[0.05]"
              >
                How It Works
              </Link>

              <Link
                href="/driver/register"
                onClick={() => setMenuOpen(false)}
                className="block border-b border-white/[0.07] px-4 py-4 text-sm font-bold text-gray-300 transition active:bg-white/[0.05]"
              >
                For Drivers
              </Link>

              <Link
                href="/#reviews"
                onClick={() => setMenuOpen(false)}
                className="block border-b border-white/[0.07] px-4 py-4 text-sm font-bold text-gray-300 transition active:bg-white/[0.05]"
              >
                Customer Reviews
              </Link>

              <Link
                href="/customer/login"
                onClick={() => setMenuOpen(false)}
                className="block border-b border-white/[0.07] px-4 py-4 text-sm font-bold text-gray-300 transition active:bg-white/[0.05]"
              >
                Customer Login
              </Link>

              <Link
                href="/driver/login"
                onClick={() => setMenuOpen(false)}
                className="block border-b border-white/[0.07] px-4 py-4 text-sm font-bold text-gray-300 transition active:bg-white/[0.05]"
              >
                Driver Login
              </Link>

              <Link
                href="/driver/register"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-4 text-sm font-bold text-[#79c51c] transition active:bg-white/[0.05]"
              >
                Join as a Driver
              </Link>

            </div>
          </nav>
        </div>
      )}
    </header>
  );
}