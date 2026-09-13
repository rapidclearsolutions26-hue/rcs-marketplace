"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050705] text-white">
      {/* ========================================================= */}
      {/* HEADER */}
      {/* ========================================================= */}

      <header className="pwa-header sticky top-0 z-50 border-b border-white/[0.07] bg-[#050705]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-4 sm:h-[76px] sm:px-6 lg:px-8">
          {/* LOGO */}

          <Link
            href="/"
            className="shrink-0"
            onClick={closeMobileMenu}
          >
            <Image
              src="/rapid-clear-logo.png"
              alt="Rapid Clear Solutions"
              width={220}
              height={90}
              priority
              className="h-10 w-auto object-contain sm:h-14"
            />
          </Link>

          {/* DESKTOP NAV */}

          <nav className="hidden items-center gap-7 lg:flex">
            <Link
              href="/customer/post-job"
              className="text-sm font-medium text-gray-300 transition hover:text-[#79c51c]"
            >
              Get a Quote
            </Link>

            <Link
              href="/services"
              className="text-sm font-medium text-gray-300 transition hover:text-[#79c51c]"
            >
              Services
            </Link>

            <Link
              href="/driver/register"
              className="text-sm font-medium text-gray-300 transition hover:text-[#79c51c]"
            >
              For Drivers
            </Link>

            <Link
              href="#how-it-works"
              className="text-sm font-medium text-gray-300 transition hover:text-[#79c51c]"
            >
              How It Works
            </Link>

            <Link
              href="/contact"
              className="text-sm font-medium text-gray-300 transition hover:text-[#79c51c]"
            >
              Contact
            </Link>
          </nav>

          {/* DESKTOP LOGIN BUTTONS */}

          <div className="hidden items-center gap-2 lg:flex">
            <Link
              href="/customer/login"
              className="rounded-lg border border-white/[0.12] px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/[0.04]"
            >
              Customer Login
            </Link>

            <Link
              href="/driver/login"
              className="rounded-lg bg-[#79c51c] px-4 py-2.5 text-sm font-bold text-black transition hover:bg-[#91db32]"
            >
              Driver Login
            </Link>
          </div>

          {/* MOBILE MENU BUTTON */}

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/[0.14] bg-white/[0.04] text-white transition hover:border-[#79c51c]/50 hover:text-[#79c51c] lg:hidden"
          >
            {mobileMenuOpen ? (
              <span className="text-3xl font-light leading-none">
                ×
              </span>
            ) : (
              <div className="flex flex-col gap-1.5">
                <span className="block h-0.5 w-6 bg-current" />
                <span className="block h-0.5 w-6 bg-current" />
                <span className="block h-0.5 w-6 bg-current" />
              </div>
            )}
          </button>
        </div>

        {/* ======================================================= */}
        {/* MOBILE MENU */}
        {/* ======================================================= */}

        <div
          className={`overflow-hidden border-t border-white/[0.07] bg-[#080b08] transition-all duration-300 lg:hidden ${
            mobileMenuOpen
              ? "max-h-[700px] opacity-100"
              : "max-h-0 border-t-0 opacity-0"
          }`}
        >
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
            {/* GET A QUOTE */}

            <Link
              href="/customer/post-job"
              onClick={closeMobileMenu}
              className="mb-3 flex min-h-[54px] w-full items-center justify-between rounded-xl bg-[#79c51c] px-5 py-4 text-sm font-black text-black"
            >
              <span>GET A QUOTE</span>
              <span className="text-lg">→</span>
            </Link>

            {/* SERVICES */}

            <Link
              href="/services"
              onClick={closeMobileMenu}
              className="mb-2 flex min-h-[54px] w-full items-center justify-between rounded-xl border border-white/[0.12] bg-white/[0.025] px-5 py-4 text-sm font-bold text-white"
            >
              <span>SERVICES</span>
              <span className="text-gray-500">→</span>
            </Link>

            {/* CUSTOMER LOGIN */}

            <Link
              href="/customer/login"
              onClick={closeMobileMenu}
              className="mb-2 flex min-h-[54px] w-full items-center justify-between rounded-xl border border-white/[0.12] bg-white/[0.025] px-5 py-4 text-sm font-bold text-white"
            >
              <span>CUSTOMER LOGIN</span>
              <span className="text-gray-500">→</span>
            </Link>

            {/* DRIVER LOGIN */}

            <Link
              href="/driver/login"
              onClick={closeMobileMenu}
              className="mb-2 flex min-h-[54px] w-full items-center justify-between rounded-xl border border-[#79c51c]/30 bg-[#79c51c]/[0.05] px-5 py-4 text-sm font-bold text-[#79c51c]"
            >
              <span>DRIVER LOGIN</span>
              <span>→</span>
            </Link>

            {/* DIVIDER */}

            <div className="my-3 h-px bg-white/[0.07]" />

            {/* FOR DRIVERS */}

            <Link
              href="/driver/register"
              onClick={closeMobileMenu}
              className="flex min-h-[52px] w-full items-center justify-between border-b border-white/[0.06] px-2 py-4 text-sm font-semibold text-gray-300"
            >
              <span>FOR DRIVERS</span>
              <span className="text-gray-600">→</span>
            </Link>

            {/* HOW IT WORKS */}

            <Link
              href="#how-it-works"
              onClick={closeMobileMenu}
              className="flex min-h-[52px] w-full items-center justify-between border-b border-white/[0.06] px-2 py-4 text-sm font-semibold text-gray-300"
            >
              <span>HOW IT WORKS</span>
              <span className="text-gray-600">→</span>
            </Link>

            {/* CONTACT */}

            <Link
              href="/contact"
              onClick={closeMobileMenu}
              className="flex min-h-[52px] w-full items-center justify-between px-2 py-4 text-sm font-semibold text-gray-300"
            >
              <span>CONTACT</span>
              <span className="text-gray-600">→</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* HERO */}
      {/* ========================================================= */}

      <section className="relative overflow-hidden border-b border-white/[0.07]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_45%,rgba(121,197,28,0.10),transparent_30%)]" />

        <div className="pointer-events-none absolute inset-0 opacity-[0.025] [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:80px_80px]" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-5 py-12 sm:px-6 sm:py-20 lg:min-h-[690px] lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-16">
          {/* LEFT */}

          <div className="relative z-10">
            <div className="mb-6 flex items-center gap-3 sm:mb-7">
              <span className="h-2 w-2 rounded-full bg-[#79c51c]" />

              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#79c51c] sm:text-xs">
                RCS Marketplace
              </span>
            </div>

            <h1 className="max-w-3xl text-[3.35rem] font-black uppercase leading-[0.9] tracking-[-0.05em] sm:text-6xl md:text-7xl lg:text-[5.6rem] xl:text-[6.5rem]">
              Waste removal
              <span className="block text-[#79c51c]">
                made simple.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-gray-400 sm:mt-7 sm:text-lg sm:leading-8">
              Post your waste removal job, receive quotes from approved RCS
              drivers and choose the option that works for you.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:mt-9 sm:flex-row">
              <Link
                href="/customer/post-job"
                className="rounded-lg bg-[#79c51c] px-7 py-4 text-center text-sm font-black text-black transition duration-200 hover:bg-[#91db32]"
              >
                GET A QUOTE
                <span className="ml-3">→</span>
              </Link>

              <Link
                href="/driver/register"
                className="rounded-lg border border-white/[0.16] px-7 py-4 text-center text-sm font-bold text-white transition duration-200 hover:border-[#79c51c] hover:text-[#79c51c]"
              >
                BECOME A DRIVER
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 sm:mt-8 sm:gap-x-7">
              <HeroFeature text="Approved drivers" />
              <HeroFeature text="Photo-based quotes" />
              <HeroFeature text="Secure checkout" />
            </div>
          </div>

          {/* RIGHT — TRUCK */}

          <div className="relative flex min-h-[340px] items-center justify-center sm:min-h-[400px] lg:min-h-[590px]">
            <div className="absolute right-[10%] top-1/2 h-[300px] w-[300px] -translate-y-1/2 rounded-full bg-[#79c51c]/10 blur-[90px] sm:h-[380px] sm:w-[380px] sm:blur-[110px]" />

            <div className="absolute right-0 top-1/2 h-[330px] w-[92%] -translate-y-1/2 rounded-[2rem] border border-white/[0.08] bg-white/[0.025] sm:h-[470px] lg:h-[510px]" />

            <div className="absolute bottom-[7%] right-[7%] h-px w-[35%] bg-gradient-to-r from-transparent to-[#79c51c]" />

            <div className="absolute right-[7%] top-[13%] h-[70px] w-px bg-gradient-to-b from-[#79c51c] to-transparent sm:h-[90px]" />

            <Image
              src="/rapid-clear-solutions-removal-truck.png"
              alt="Rapid Clear Solutions removal truck"
              width={1000}
              height={700}
              priority
              className="relative z-10 w-[112%] max-w-[760px] object-contain drop-shadow-[0_35px_60px_rgba(0,0,0,0.8)]"
            />

            <div className="absolute bottom-[5%] left-0 z-20 max-w-[88%] rounded-xl border border-white/[0.1] bg-[#0b100b]/95 px-4 py-3 shadow-2xl backdrop-blur-xl sm:bottom-[8%] sm:left-[2%] sm:px-5 sm:py-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-gray-500 sm:text-[10px]">
                The RCS Marketplace
              </p>

              <p className="mt-1 text-xs font-bold text-white sm:text-sm">
                One place to arrange your collection.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* TRUST BAR */}
      {/* ========================================================= */}

      <section className="border-b border-white/[0.07] bg-[#080b08]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 md:grid-cols-4">
          <TrustItem
            title="Fast Quotes"
            text="Post your job and receive driver quotes."
          />

          <TrustItem
            title="Approved Drivers"
            text="Drivers apply before accessing marketplace work."
          />

          <TrustItem
            title="Photo Details"
            text="Show drivers exactly what needs removing."
          />

          <TrustItem
            title="Secure Checkout"
            text="Accepted jobs can be paid online."
          />
        </div>
      </section>

      {/* ========================================================= */}
      {/* SERVICES */}
      {/* ========================================================= */}

      <section className="border-b border-white/[0.07] bg-[#050705] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#79c51c]">
                Our Services
              </p>

              <h2 className="mt-4 text-4xl font-black uppercase tracking-tight sm:text-5xl">
                What can we help
                <br />
                <span className="text-gray-500">you remove?</span>
              </h2>

              <p className="mt-5 max-w-xl text-sm leading-6 text-gray-500 sm:text-base">
                From household clearances to garden waste, furniture and
                builders waste, find the service that suits your job.
              </p>
            </div>

            <Link
              href="/services"
              className="self-start rounded-lg border border-white/[0.14] px-5 py-3 text-sm font-semibold transition hover:border-[#79c51c] hover:text-[#79c51c] md:self-auto"
            >
              View all services →
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-3 sm:mt-12 sm:grid-cols-3 lg:grid-cols-4">
            <ServiceCard title="House Clearance" number="01" />
            <ServiceCard title="Garden Waste" number="02" />
            <ServiceCard title="Builders Waste" number="03" />
            <ServiceCard title="Furniture Removal" number="04" />
            <ServiceCard title="Shed & Garage" number="05" />
            <ServiceCard title="General Rubbish" number="06" />
            <ServiceCard title="Scrap Collection" number="07" />
            <ServiceCard title="Commercial Waste" number="08" />
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/services"
              className="text-xs font-black uppercase tracking-[0.15em] text-[#79c51c] transition hover:text-[#91db32]"
            >
              Explore all RCS services →
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* HOW IT WORKS */}
      {/* ========================================================= */}

      <section
        id="how-it-works"
        className="border-b border-white/[0.07] bg-[#080b08] py-20 sm:py-28"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-12">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#79c51c]">
                How It Works
              </p>

              <h2 className="mt-4 text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-5xl md:text-6xl">
                A simple
                <br />
                process.
              </h2>

              <p className="mt-6 max-w-md leading-7 text-gray-500">
                From posting your job to collection, RCS keeps the process
                straightforward.
              </p>

              <Link
                href="/customer/post-job"
                className="mt-7 inline-flex rounded-lg bg-[#79c51c] px-6 py-3.5 text-sm font-black text-black transition hover:bg-[#91db32]"
              >
                GET A QUOTE →
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <ProcessCard
                number="01"
                title="Post your job"
                text="Tell us what needs removing and provide your collection details."
              />

              <ProcessCard
                number="02"
                title="Receive quotes"
                text="Approved RCS drivers can view suitable jobs and submit their prices."
              />

              <ProcessCard
                number="03"
                title="Choose a driver"
                text="Review the available options and choose the driver that suits your job."
              />

              <ProcessCard
                number="04"
                title="Collection"
                text="Your selected driver completes the agreed collection."
              />
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* CUSTOMER / DRIVER SPLIT */}
      {/* ========================================================= */}

      <section className="border-b border-white/[0.07] bg-[#050705] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid gap-5 lg:grid-cols-2">
            {/* CUSTOMER */}

            <div className="group relative overflow-hidden rounded-2xl border border-[#79c51c]/20 bg-[#0a1109] p-7 sm:p-10">
              <div className="absolute right-[-80px] top-[-80px] h-56 w-56 rounded-full bg-[#79c51c]/10 blur-[80px]" />

              <div className="relative">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#79c51c]">
                  For Customers
                </span>

                <h3 className="mt-5 text-3xl font-black uppercase sm:text-4xl">
                  Need waste
                  <br />
                  removed?
                </h3>

                <p className="mt-5 max-w-lg leading-7 text-gray-500">
                  Post your job, add photos and tell us when you need the
                  collection. Approved drivers can then submit their quotes.
                </p>

                <Link
                  href="/customer/post-job"
                  className="mt-8 inline-flex rounded-lg bg-[#79c51c] px-6 py-3.5 text-sm font-black text-black transition hover:bg-[#91db32]"
                >
                  POST A JOB →
                </Link>
              </div>
            </div>

            {/* DRIVER */}

            <div className="group relative overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0a0d0a] p-7 sm:p-10">
              <div className="absolute right-[-80px] top-[-80px] h-56 w-56 rounded-full bg-white/[0.025] blur-[80px]" />

              <div className="relative">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#79c51c]">
                  For Drivers
                </span>

                <h3 className="mt-5 text-3xl font-black uppercase sm:text-4xl">
                  Looking for
                  <br />
                  more work?
                </h3>

                <p className="mt-5 max-w-lg leading-7 text-gray-500">
                  Apply to join the RCS driver network. Once approved, you can
                  view suitable marketplace jobs and submit quotes.
                </p>

                <Link
                  href="/driver/register"
                  className="mt-8 inline-flex rounded-lg border border-white/[0.16] px-6 py-3.5 text-sm font-black text-white transition hover:border-[#79c51c] hover:bg-[#79c51c] hover:text-black"
                >
                  JOIN THE NETWORK →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* MARKETPLACE EXPLANATION */}
      {/* ========================================================= */}

      <section className="border-b border-white/[0.07] bg-[#080b08] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-14">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#79c51c]">
                The Marketplace
              </p>

              <h2 className="mt-4 text-4xl font-black uppercase leading-[0.95] sm:text-5xl md:text-6xl">
                One job.
                <br />
                <span className="text-[#79c51c]">
                  Multiple options.
                </span>
              </h2>

              <p className="mt-7 max-w-xl text-lg leading-8 text-gray-500">
                RCS brings customers and approved waste-removal drivers
                together through one simple marketplace. Post your job once
                and let suitable drivers decide whether they want to quote.
              </p>

              <Link
                href="/customer/post-job"
                className="mt-8 inline-flex rounded-lg bg-[#79c51c] px-7 py-4 text-sm font-black text-black transition hover:bg-[#91db32]"
              >
                POST YOUR JOB →
              </Link>
            </div>

            <div className="space-y-3">
              <FeatureRow
                number="01"
                title="Customers post jobs"
                text="Describe the waste, upload photos and provide collection details."
              />

              <FeatureRow
                number="02"
                title="Drivers find suitable work"
                text="Approved drivers can view jobs that suit their vehicle and business."
              />

              <FeatureRow
                number="03"
                title="Drivers submit quotes"
                text="Drivers can choose which jobs they want to quote for."
              />

              <FeatureRow
                number="04"
                title="Customers choose"
                text="Customers review the available options and select their preferred driver."
              />
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* WHY RCS */}
      {/* ========================================================= */}

      <section className="border-b border-white/[0.07] bg-[#050705] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#79c51c]">
                Why RCS
              </p>

              <h2 className="mt-4 text-4xl font-black uppercase leading-[0.95] sm:text-5xl md:text-6xl">
                Built around
                <br />
                <span className="text-gray-500">
                  your job.
                </span>
              </h2>

              <p className="mt-6 max-w-md text-base leading-7 text-gray-500">
                RCS is designed to make arranging waste removal easier for
                customers while giving approved drivers access to more work.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <WhyCard
                title="Approved Drivers"
                text="Drivers apply to join the RCS network before accessing marketplace work."
              />

              <WhyCard
                title="Photo-Based Jobs"
                text="Upload photos so drivers can better understand the size and type of job."
              />

              <WhyCard
                title="Simple Process"
                text="Post your requirements once instead of contacting multiple companies."
              />

              <WhyCard
                title="Online Management"
                text="Keep your job, quotes and collection information together through your RCS account."
              />
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* COVERAGE */}
      {/* ========================================================= */}

      <section className="border-b border-white/[0.07] bg-[#080b08] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0e0a] p-8 sm:p-12 lg:p-16">
            <div className="absolute right-[-120px] top-[-120px] h-80 w-80 rounded-full bg-[#79c51c]/10 blur-[100px]" />

            <div className="relative grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#79c51c]">
                  Coverage
                </p>

                <h2 className="mt-4 max-w-3xl text-4xl font-black uppercase leading-[0.95] sm:text-5xl md:text-6xl">
                  Waste removal
                  <span className="block text-gray-500">
                    across Birmingham & beyond.
                  </span>
                </h2>

                <p className="mt-6 max-w-2xl text-base leading-7 text-gray-500 sm:text-lg sm:leading-8">
                  RCS is building a growing network of waste-removal drivers,
                  starting with Birmingham and the West Midlands and expanding
                  as the marketplace grows.
                </p>
              </div>

              <Link
                href="/customer/post-job"
                className="inline-flex w-fit rounded-lg bg-[#79c51c] px-7 py-4 text-sm font-black text-black transition hover:bg-[#91db32]"
              >
                CHECK YOUR JOB →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* FINAL CTA */}
      {/* ========================================================= */}

      <section className="relative overflow-hidden bg-[#050705] py-20 sm:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(121,197,28,0.09),transparent_45%)]" />

        <div className="relative mx-auto max-w-5xl px-5 text-center sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#79c51c]">
            Rapid Clear Solutions
          </p>

          <h2 className="mt-5 text-5xl font-black uppercase leading-[0.88] tracking-[-0.04em] sm:text-6xl md:text-8xl">
            We want
            <span className="block text-[#79c51c]">your waste.</span>
          </h2>

          <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-gray-500">
            Ready to arrange your collection? Post your job and let the RCS
            Marketplace take it from there.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/customer/post-job"
              className="rounded-lg bg-[#79c51c] px-8 py-4 text-sm font-black text-black transition hover:bg-[#91db32]"
            >
              GET A QUOTE →
            </Link>

            <Link
              href="/services"
              className="rounded-lg border border-white/[0.15] px-8 py-4 text-sm font-black transition hover:border-[#79c51c] hover:text-[#79c51c]"
            >
              VIEW SERVICES
            </Link>

            <Link
              href="/driver/register"
              className="rounded-lg border border-white/[0.15] px-8 py-4 text-sm font-black transition hover:border-[#79c51c] hover:text-[#79c51c]"
            >
              BECOME A DRIVER
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* FOOTER */}
      {/* ========================================================= */}

      <footer className="border-t border-white/[0.07] bg-[#030403]">
        <div className="mx-auto max-w-7xl px-5 pb-[calc(3rem+env(safe-area-inset-bottom))] pt-14 sm:px-6 lg:px-8">
          <div className="grid gap-12 sm:grid-cols-2 md:grid-cols-4">
            {/* BRAND */}

            <div className="sm:col-span-2">
              <Link href="/">
                <Image
                  src="/rapid-clear-logo.png"
                  alt="Rapid Clear Solutions"
                  width={220}
                  height={90}
                  className="h-14 w-auto object-contain"
                />
              </Link>

              <p className="mt-5 max-w-md text-sm leading-7 text-gray-600">
                Connecting customers and approved waste-removal drivers
                through the RCS Marketplace.
              </p>

              <Link
                href="/customer/post-job"
                className="mt-6 inline-flex rounded-lg bg-[#79c51c] px-5 py-3 text-xs font-black text-black transition hover:bg-[#91db32]"
              >
                GET A QUOTE →
              </Link>
            </div>

            {/* CUSTOMERS */}

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white">
                Customers
              </p>

              <div className="mt-5 flex flex-col gap-3 text-sm text-gray-600">
                <Link
                  href="/customer/post-job"
                  className="transition hover:text-[#79c51c]"
                >
                  Post a Job
                </Link>

                <Link
                  href="/services"
                  className="transition hover:text-[#79c51c]"
                >
                  Services
                </Link>

                <Link
                  href="/customer/login"
                  className="transition hover:text-[#79c51c]"
                >
                  Customer Login
                </Link>

                <Link
                  href="/#how-it-works"
                  className="transition hover:text-[#79c51c]"
                >
                  How It Works
                </Link>
              </div>
            </div>

            {/* RCS */}

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white">
                RCS
              </p>

              <div className="mt-5 flex flex-col gap-3 text-sm text-gray-600">
                <Link
                  href="/driver/register"
                  className="transition hover:text-[#79c51c]"
                >
                  Become a Driver
                </Link>

                <Link
                  href="/driver/login"
                  className="transition hover:text-[#79c51c]"
                >
                  Driver Login
                </Link>

                <Link
                  href="/contact"
                  className="transition hover:text-[#79c51c]"
                >
                  Contact
                </Link>

                <Link
                  href="/admin/login"
                  className="transition hover:text-[#79c51c]"
                >
                  Admin Login
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-4 border-t border-white/[0.06] pt-6 text-xs text-gray-700 sm:flex-row sm:items-center sm:justify-between">
            <span>
              © {new Date().getFullYear()} Rapid Clear Solutions. All rights
              reserved.
            </span>

            <div className="flex flex-wrap gap-5">
              <Link
                href="/privacy"
                className="transition hover:text-[#79c51c]"
              >
                Privacy
              </Link>

              <Link
                href="/terms"
                className="transition hover:text-[#79c51c]"
              >
                Terms
              </Link>

              <Link
                href="/cookies"
                className="transition hover:text-[#79c51c]"
              >
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ========================================================= */
/* HERO FEATURE */
/* ========================================================= */

function HeroFeature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
      <span className="text-[#79c51c]">✓</span>
      {text}
    </div>
  );
}

/* ========================================================= */
/* TRUST ITEM */
/* ========================================================= */

function TrustItem({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="border-b border-white/[0.06] px-5 py-6 last:border-b-0 sm:px-7 md:border-b-0 md:border-r md:last:border-r-0">
      <div className="h-1 w-7 bg-[#79c51c]" />

      <h3 className="mt-4 text-sm font-black uppercase tracking-wide">
        {title}
      </h3>

      <p className="mt-2 text-xs leading-5 text-gray-600">
        {text}
      </p>
    </div>
  );
}

/* ========================================================= */
/* SERVICE CARD */
/* ========================================================= */

function ServiceCard({
  title,
  number,
}: {
  title: string;
  number: string;
}) {
  return (
    <Link
      href="/services"
      className="group relative min-h-[135px] overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0e0a] p-5 transition duration-300 hover:-translate-y-1 hover:border-[#79c51c]/35 hover:bg-[#0d130d] sm:min-h-[155px] sm:p-6"
    >
      <span className="absolute right-5 top-5 text-[10px] font-bold tracking-[0.15em] text-gray-700 transition group-hover:text-[#79c51c]">
        {number}
      </span>

      <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-[#79c51c] transition-all duration-300 group-hover:w-full" />

      <div className="flex h-full flex-col justify-end">
        <h3 className="max-w-[180px] text-base font-bold leading-5 sm:text-lg">
          {title}
        </h3>

        <p className="mt-3 text-xs font-semibold text-gray-700 transition group-hover:text-gray-500">
          Explore service →
        </p>
      </div>
    </Link>
  );
}

/* ========================================================= */
/* PROCESS CARD */
/* ========================================================= */

function ProcessCard({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="group rounded-xl border border-white/[0.08] bg-[#0a0e0a] p-6 transition duration-300 hover:border-[#79c51c]/30">
      <div className="flex items-center justify-between">
        <span className="text-sm font-black text-[#79c51c]">
          {number}
        </span>

        <span className="text-gray-700 transition group-hover:text-[#79c51c]">
          →
        </span>
      </div>

      <h3 className="mt-8 text-xl font-black uppercase">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-6 text-gray-600">
        {text}
      </p>
    </div>
  );
}

/* ========================================================= */
/* FEATURE ROW */
/* ========================================================= */

function FeatureRow({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="group flex gap-5 border-b border-white/[0.07] py-5 first:pt-0 last:border-b-0">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] text-xs font-black text-[#79c51c] transition group-hover:border-[#79c51c]/30">
        {number}
      </div>

      <div>
        <h3 className="font-bold">{title}</h3>

        <p className="mt-1 text-sm leading-6 text-gray-600">
          {text}
        </p>
      </div>
    </div>
  );
}

/* ========================================================= */
/* WHY CARD */
/* ========================================================= */

function WhyCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0a0e0a] p-6 transition hover:border-[#79c51c]/30">
      <div className="h-1 w-7 bg-[#79c51c]" />

      <h3 className="mt-5 text-lg font-black uppercase">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-6 text-gray-600">
        {text}
      </p>
    </div>
  );
}