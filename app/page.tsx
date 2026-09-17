"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const services = [
  {
    number: "01",
    title: "House Clearance",
    image: "/house-clearance.jpg",
    href: "/services/house-clearance",
  },
  {
    number: "02",
    title: "Garden Waste",
    image: "/garden-waste.jpg",
    href: "/services/garden-waste-removal",
  },
  {
    number: "03",
    title: "Builders Waste",
    image: "/builders-waste.jpg",
    href: "/services/builders-waste",
  },
  {
    number: "04",
    title: "Furniture Removal",
    image: "/furniture-removal.jpg",
    href: "/services/furniture-removal",
  },
  {
    number: "05",
    title: "Shed & Garage",
    image: "/shed-garage.jpg",
    href: "/customer/post-job",
  },
  {
    number: "06",
    title: "General Rubbish",
    image: "/general-rubbish.jpg",
    href: "/services/rubbish-removal",
  },
  {
    number: "07",
    title: "Scrap Collection",
    image: "/scrap-collection.jpg",
    href: "/customer/post-job",
  },
  {
    number: "08",
    title: "Commercial Waste",
    image: "/commercial-waste.jpg",
    href: "/customer/post-job",
  },
];

const locations = [
  ["Birmingham", "/waste-removal-birmingham"],
  ["Dudley", "/waste-removal-dudley"],
  ["Sandwell", "/waste-removal-sandwell"],
  ["Solihull", "/waste-removal-solihull"],
  ["Walsall", "/waste-removal-walsall"],
  ["Wolverhampton", "/waste-removal-wolverhampton"],
];

const faqs = [
  {
    question: "How do I get a waste removal quote?",
    answer:
      "Post your waste-removal job through the RCS Marketplace, provide your postcode and job details and upload photos. Available RCS drivers can then review the information and submit quotes.",
  },
  {
    question: "What types of waste can I post?",
    answer:
      "RCS can be used for a range of collections including general rubbish, house clearances, garden waste, furniture, builders waste, shed and garage clearances and other suitable waste-removal jobs.",
  },
  {
    question: "Can I upload photos of my waste?",
    answer:
      "Yes. Photos can be uploaded when posting your job. Providing clear photographs can help drivers understand the size and type of collection required.",
  },
  {
    question: "What areas does RCS cover?",
    answer:
      "RCS currently has local information pages covering Birmingham, Dudley, Sandwell, Solihull, Walsall and Wolverhampton. Driver availability can vary by postcode and collection requirements.",
  },
  {
    question: "Do I need an account before getting a quote?",
    answer:
      "You can start by posting your waste-removal job. The RCS customer process can then create your customer account so you can manage your quotes and collection.",
  },
  {
    question: "How does the RCS Marketplace work?",
    answer:
      "Customers post their waste-removal requirements and approved RCS drivers can review suitable jobs and submit quotes. Customers can then review the available quote information and arrange their collection.",
  },
];

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050705] text-white">
      {/* ========================================================= */}
      {/* HEADER */}
      {/* ========================================================= */}

      <header className="pwa-header sticky top-0 z-50 border-b border-white/[0.07] bg-[#050705]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[70px] max-w-7xl items-center justify-between px-4 sm:h-[76px] sm:px-6 lg:px-8">
          <Link href="/" className="shrink-0">
            <Image
              src="/rapid-clear-logo.png"
              alt="Rapid Clear Solutions"
              width={220}
              height={90}
              priority
              className="h-10 w-auto object-contain sm:h-14"
            />
          </Link>

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
              href="#how-it-works"
              className="text-sm font-medium text-gray-300 transition hover:text-[#79c51c]"
            >
              How It Works
            </Link>

            <Link
              href="/driver/register"
              className="text-sm font-medium text-gray-300 transition hover:text-[#79c51c]"
            >
              For Drivers
            </Link>
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <Link
              href="/customer/login"
              className="rounded-lg border border-white/[0.12] px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/[0.04]"
            >
              Customer Login
            </Link>

            <Link
              href="/driver/login"
              className="rounded-lg border border-white/[0.12] px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/[0.04]"
            >
              Driver Login
            </Link>

            <Link
              href="/customer/post-job"
              className="rounded-lg bg-[#79c51c] px-4 py-2.5 text-sm font-black text-black transition hover:bg-[#91db32]"
            >
              Get a Quote
            </Link>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <Link
              href="/customer/post-job"
              className="rounded-lg bg-[#79c51c] px-4 py-3 text-[11px] font-black text-black"
            >
              GET A QUOTE
            </Link>

            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Open menu"
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/[0.12] text-white"
            >
              <div className="space-y-1.5">
                <span className="block h-[2px] w-5 bg-white" />
                <span className="block h-[2px] w-5 bg-white" />
                <span className="block h-[2px] w-5 bg-white" />
              </div>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-white/[0.07] bg-[#050705] px-4 py-5 lg:hidden">
            <nav className="flex flex-col">
              <MobileLink
                href="/customer/post-job"
                label="Get a Quote"
                onClick={() => setMenuOpen(false)}
              />

              <MobileLink
                href="/services"
                label="Services"
                onClick={() => setMenuOpen(false)}
              />

              <MobileLink
                href="#how-it-works"
                label="How It Works"
                onClick={() => setMenuOpen(false)}
              />

              <MobileLink
                href="/driver/register"
                label="For Drivers"
                onClick={() => setMenuOpen(false)}
              />

              <MobileLink
                href="/customer/login"
                label="Customer Login"
                onClick={() => setMenuOpen(false)}
              />

              <MobileLink
                href="/driver/login"
                label="Driver Login"
                onClick={() => setMenuOpen(false)}
              />
            </nav>
          </div>
        )}
      </header>

      {/* ========================================================= */}
      {/* HERO */}
      {/* ========================================================= */}

      <section className="relative min-h-[680px] overflow-hidden border-b border-white/[0.07] sm:min-h-[760px]">
        <div className="absolute inset-0">
          <Image
            src="/rapid-clear-solutions-removal-truck.png"
            alt="Rapid Clear Solutions waste removal truck"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />

          <div className="absolute inset-0 bg-[#050705]/70" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050705] via-[#050705]/80 to-[#050705]/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050705] via-transparent to-[#050705]/20" />
        </div>

        <div className="pointer-events-none absolute inset-0 opacity-[0.025] [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:80px_80px]" />

        <div className="relative mx-auto flex min-h-[680px] max-w-7xl items-center px-5 py-20 sm:min-h-[760px] sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="mb-6 flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-[#79c51c]" />

              <span className="text-[11px] font-black uppercase tracking-[0.22em] text-[#79c51c] sm:text-xs">
                Rapid Clear Solutions
              </span>
            </div>

            <h1 className="text-6xl font-black uppercase leading-[0.86] tracking-[-0.055em] sm:text-7xl md:text-8xl lg:text-[100px]">
              Waste
              <span className="block">removal</span>
              <span className="block text-[#79c51c]">
                made simple.
              </span>
            </h1>

            <p className="mt-8 max-w-xl text-base leading-7 text-gray-300 sm:text-lg sm:leading-8">
              Waste removal and rubbish clearance across Birmingham and the
              West Midlands. Post your job, upload photos and receive quotes
              from approved RCS drivers through our marketplace.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/customer/post-job"
                className="rounded-lg bg-[#79c51c] px-8 py-4 text-center text-sm font-black text-black transition hover:bg-[#91db32]"
              >
                GET A QUOTE →
              </Link>

              <Link
                href="#how-it-works"
                className="rounded-lg border border-white/20 bg-black/20 px-8 py-4 text-center text-sm font-black text-white backdrop-blur-sm transition hover:border-[#79c51c] hover:text-[#79c51c]"
              >
                HOW IT WORKS
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-xs font-bold uppercase tracking-wider text-gray-400">
              <span>House Clearance</span>
              <span>Garden Waste</span>
              <span>Builders Waste</span>
              <span>Furniture Removal</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* TRUST BAR */}
      {/* ========================================================= */}

      <section className="border-b border-white/[0.07] bg-[#080b08]">
        <div className="mx-auto grid max-w-7xl divide-y divide-white/[0.07] px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6 lg:px-8">
          <TrustItem
            title="Post Your Job"
            text="Tell us what needs removing"
          />

          <TrustItem
            title="Receive Quotes"
            text="Approved drivers can quote"
          />

          <TrustItem
            title="Choose Your Option"
            text="Pick the quote that works"
          />
        </div>
      </section>

      {/* ========================================================= */}
      {/* SERVICES */}
      {/* ========================================================= */}

      <section
        id="services"
        className="relative overflow-hidden bg-[#050705] py-20 sm:py-28"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_35%,rgba(121,197,28,0.07),transparent_35%)]" />

        <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#79c51c]">
                Our Services
              </p>

              <h2 className="mt-4 text-5xl font-black uppercase leading-[0.9] tracking-[-0.045em] sm:text-6xl md:text-7xl">
                What can we help
                <span className="block text-gray-500">
                  you remove?
                </span>
              </h2>

              <p className="mt-6 max-w-xl text-sm leading-7 text-gray-500 sm:text-base">
                From house clearances and garden waste to furniture,
                builders waste and general rubbish removal, find the service
                that suits your collection.
              </p>
            </div>

            <Link
              href="/services"
              className="w-fit rounded-lg border border-white/[0.14] px-5 py-3.5 text-sm font-bold text-white transition hover:border-[#79c51c] hover:text-[#79c51c]"
            >
              View all services →
            </Link>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <ServiceCard
                key={service.number}
                number={service.number}
                title={service.title}
                image={service.image}
                href={service.href}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* REAL RCS WORK */}
      {/* ========================================================= */}

      <section className="border-y border-white/[0.07] bg-[#080b08] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#79c51c]">
              Real RCS Work
            </p>

            <h2 className="mt-4 text-5xl font-black uppercase leading-[0.9] tracking-[-0.045em] sm:text-6xl md:text-7xl">
              From waste
              <span className="block text-gray-500">
                to cleared.
              </span>
            </h2>

            <p className="mt-6 max-w-2xl text-sm leading-7 text-gray-500 sm:text-base">
              See examples of the type of clearance work that can be posted
              through Rapid Clear Solutions.
            </p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            <BeforeAfterCard
              image="/before-after-garden.png"
              title="Garden Clearance"
              text="Garden waste and outdoor clearance."
            />

            <BeforeAfterCard
              image="/before-after-room.png"
              title="Room Clearance"
              text="Household waste and room clearances."
            />

            <BeforeAfterCard
              image="/before-after-storage.png"
              title="Storage Clearance"
              text="Clear unwanted items from storage areas."
            />
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* HOW IT WORKS */}
      {/* ========================================================= */}

      <section
        id="how-it-works"
        className="bg-[#050705] py-20 sm:py-28"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#79c51c]">
              How It Works
            </p>

            <h2 className="mt-4 text-5xl font-black uppercase leading-[0.9] tracking-[-0.04em] sm:text-6xl">
              Waste removal
              <span className="block text-gray-500">
                without the hassle.
              </span>
            </h2>

            <p className="mt-6 max-w-2xl text-base leading-7 text-gray-500">
              RCS brings customers and approved waste-removal drivers
              together through one online marketplace.
            </p>
          </div>

          <div className="mt-14 grid gap-4 md:grid-cols-3">
            <ProcessCard
              number="01"
              title="Post Your Job"
              text="Tell us what needs removing, where it is and when you need it collected. Upload photos to give drivers a clear idea of the job."
            />

            <ProcessCard
              number="02"
              title="Receive Quotes"
              text="Your job can be made available through the RCS Marketplace where approved drivers can review the details and submit quotes."
            />

            <ProcessCard
              number="03"
              title="Choose & Book"
              text="Review the quote information available to you, choose your preferred option and manage your collection through your RCS account."
            />
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/customer/post-job"
              className="inline-flex rounded-lg bg-[#79c51c] px-7 py-4 text-sm font-black text-black transition hover:bg-[#91db32]"
            >
              POST YOUR JOB →
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* WHY CHOOSE RCS */}
      {/* ========================================================= */}

      <section className="border-y border-white/[0.07] bg-[#080b08] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:gap-20">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#79c51c]">
                Why RCS?
              </p>

              <h2 className="mt-4 text-5xl font-black uppercase leading-[0.9] tracking-[-0.04em] sm:text-6xl">
                A simpler way
                <span className="block text-gray-500">
                  to arrange waste removal.
                </span>
              </h2>

              <p className="mt-6 max-w-xl text-base leading-8 text-gray-500">
                Rapid Clear Solutions combines waste-removal services with an
                online marketplace designed to make the process easier for
                customers and drivers.
              </p>

              <Link
                href="/customer/post-job"
                className="mt-8 inline-flex rounded-lg bg-[#79c51c] px-7 py-4 text-sm font-black text-black transition hover:bg-[#91db32]"
              >
                GET A QUOTE →
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <WhyCard
                number="01"
                title="Online Job Posting"
                text="Post your waste-removal requirements online instead of making multiple enquiries."
              />

              <WhyCard
                number="02"
                title="Photo Uploads"
                text="Upload photographs to help drivers understand the waste and collection requirements."
              />

              <WhyCard
                number="03"
                title="Driver Marketplace"
                text="Approved RCS drivers can review suitable jobs and submit their quotes."
              />

              <WhyCard
                number="04"
                title="Online Management"
                text="Manage your quotes and collections through your RCS customer account."
              />

              <WhyCard
                number="05"
                title="Local Coverage"
                text="RCS has dedicated local information for Birmingham and surrounding West Midlands areas."
              />

              <WhyCard
                number="06"
                title="Built for Customers"
                text="The process is designed to make posting a waste-removal job straightforward."
              />
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* CUSTOMER / DRIVER */}
      {/* ========================================================= */}

      <section className="bg-[#050705] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid overflow-hidden rounded-2xl border border-white/[0.08] lg:grid-cols-2">
            <div className="border-b border-white/[0.08] bg-[#0a0e0a] p-8 sm:p-12 lg:border-b-0 lg:border-r">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#79c51c]">
                For Customers
              </p>

              <h2 className="mt-5 text-4xl font-black uppercase leading-[0.92] sm:text-5xl">
                Need waste
                <span className="block text-gray-500">
                  removed?
                </span>
              </h2>

              <p className="mt-6 max-w-md text-sm leading-7 text-gray-500">
                Post your job once and let approved RCS drivers review the
                work and provide quotes.
              </p>

              <div className="mt-8 space-y-4">
                <FeatureRow text="Post your job online" />
                <FeatureRow text="Upload photos of your waste" />
                <FeatureRow text="Receive driver quotes" />
                <FeatureRow text="Manage your collection online" />
              </div>

              <Link
                href="/customer/post-job"
                className="mt-9 inline-flex rounded-lg bg-[#79c51c] px-7 py-4 text-sm font-black text-black transition hover:bg-[#91db32]"
              >
                GET A QUOTE →
              </Link>
            </div>

            <div className="bg-[#0d120d] p-8 sm:p-12">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#79c51c]">
                For Drivers
              </p>

              <h2 className="mt-5 text-4xl font-black uppercase leading-[0.92] sm:text-5xl">
                Want more
                <span className="block text-gray-500">
                  work?
                </span>
              </h2>

              <p className="mt-6 max-w-md text-sm leading-7 text-gray-500">
                Join the RCS driver network and access suitable waste-removal
                jobs through the marketplace.
              </p>

              <div className="mt-8 space-y-4">
                <FeatureRow text="Access marketplace jobs" />
                <FeatureRow text="Choose the work you want" />
                <FeatureRow text="Submit your own quotes" />
                <FeatureRow text="Manage jobs from your dashboard" />
              </div>

              <Link
                href="/driver/register"
                className="mt-9 inline-flex rounded-lg border border-[#79c51c] px-7 py-4 text-sm font-black text-[#79c51c] transition hover:bg-[#79c51c] hover:text-black"
              >
                BECOME A DRIVER →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* MARKETPLACE */}
      {/* ========================================================= */}

      <section className="border-y border-white/[0.07] bg-[#080b08] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:gap-20">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#79c51c]">
                The RCS Marketplace
              </p>

              <h2 className="mt-5 text-5xl font-black uppercase leading-[0.88] tracking-[-0.04em] sm:text-6xl md:text-7xl">
                One platform.
                <span className="block text-[#79c51c]">
                  Better connections.
                </span>
              </h2>

              <p className="mt-7 max-w-xl text-base leading-8 text-gray-500">
                RCS connects customers who need waste removed with approved
                drivers who want suitable work. Customers can post their
                requirements once and make the job available through the
                marketplace.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <div className="rounded-lg border border-white/[0.08] bg-[#0a0e0a] px-4 py-3 text-xs font-bold text-gray-400">
                  Customers
                </div>

                <div className="text-[#79c51c]">→</div>

                <div className="rounded-lg border border-[#79c51c]/20 bg-[#0a0e0a] px-4 py-3 text-xs font-bold text-gray-400">
                  RCS Marketplace
                </div>

                <div className="text-[#79c51c]">→</div>

                <div className="rounded-lg border border-white/[0.08] bg-[#0a0e0a] px-4 py-3 text-xs font-bold text-gray-400">
                  Approved Drivers
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <MarketplaceItem
                number="01"
                title="Simple for customers"
                text="Post your waste-removal requirements online and upload photographs."
              />

              <MarketplaceItem
                number="02"
                title="Flexible for drivers"
                text="Drivers can review suitable work and decide which jobs they want to quote."
              />

              <MarketplaceItem
                number="03"
                title="Designed to grow"
                text="RCS is building an online network connecting customers and waste-removal drivers."
              />
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* REVIEWS */}
      {/* ========================================================= */}

      <section className="bg-[#050705] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#79c51c]">
                Customer Reviews
              </p>

              <h2 className="mt-4 text-5xl font-black uppercase leading-[0.9] tracking-[-0.04em] sm:text-6xl">
                What our
                <span className="block text-gray-500">
                  customers say.
                </span>
              </h2>

              <p className="mt-6 max-w-2xl text-sm leading-7 text-gray-500 sm:text-base">
                Genuine customer feedback will appear here as more RCS
                collections are completed.
              </p>
            </div>

            <Link
              href="/customer/post-job"
              className="w-fit rounded-lg border border-[#79c51c]/40 px-5 py-3.5 text-sm font-black text-[#79c51c] transition hover:border-[#79c51c] hover:bg-[#79c51c]/10"
            >
              USE RCS →
            </Link>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            <ReviewPlaceholder />
            <ReviewPlaceholder />
            <ReviewPlaceholder />
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* COVERAGE */}
      {/* ========================================================= */}

      <section className="border-y border-white/[0.07] bg-[#080b08] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#79c51c]">
              Areas We Cover
            </p>

            <h2 className="mt-4 text-5xl font-black uppercase leading-[0.9] tracking-[-0.045em] sm:text-6xl md:text-7xl">
              Waste removal across
              <span className="block text-gray-500">
                the West Midlands.
              </span>
            </h2>

            <p className="mt-6 max-w-2xl text-sm leading-7 text-gray-500 sm:text-base">
              Rapid Clear Solutions provides an online marketplace for waste
              removal and rubbish clearance across Birmingham and surrounding
              West Midlands areas.
            </p>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {locations.map(([name, href]) => (
              <Link
                key={href}
                href={href}
                className="group rounded-2xl border border-white/[0.08] bg-[#0a0e0a] p-6 transition hover:border-[#79c51c]/50 hover:bg-[#0d120d]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.15em] text-[#79c51c]">
                      Waste Removal
                    </p>

                    <h3 className="mt-2 text-xl font-black uppercase">
                      {name}
                    </h3>
                  </div>

                  <span className="text-lg text-[#79c51c] transition group-hover:translate-x-1">
                    →
                  </span>
                </div>

                <p className="mt-4 text-sm leading-6 text-gray-600">
                  Rubbish removal and clearance information for {name}.
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* FAQ */}
      {/* ========================================================= */}

      <section className="bg-[#050705] py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-5 sm:px-6">
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#79c51c]">
              Frequently Asked Questions
            </p>

            <h2 className="mt-4 text-5xl font-black uppercase leading-[0.9] tracking-[-0.04em] sm:text-6xl">
              Got questions?
            </h2>

            <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-gray-500 sm:text-base">
              Find out how the RCS waste-removal marketplace works.
            </p>
          </div>

          <div className="mt-12 space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;

              return (
                <div
                  key={faq.question}
                  className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#080b08]"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenFaq(isOpen ? null : index)
                    }
                    className="flex w-full items-center justify-between gap-5 p-6 text-left"
                  >
                    <span className="text-sm font-black sm:text-base">
                      {faq.question}
                    </span>

                    <span className="shrink-0 text-xl font-light text-[#79c51c]">
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-white/[0.07] px-6 pb-6 pt-5">
                      <p className="text-sm leading-7 text-gray-500">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* FINAL CTA */}
      {/* ========================================================= */}

      <section className="relative overflow-hidden border-t border-white/[0.07] bg-[#080b08] py-24 sm:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(121,197,28,0.12),transparent_45%)]" />

        <div className="relative mx-auto max-w-4xl px-5 text-center sm:px-6">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#79c51c]">
            Get started today
          </p>

          <h2 className="mt-5 text-5xl font-black uppercase leading-[0.88] tracking-[-0.045em] sm:text-6xl md:text-8xl">
            Got waste?
            <span className="block text-[#79c51c]">
              Let's clear it.
            </span>
          </h2>

          <p className="mx-auto mt-7 max-w-xl text-base leading-7 text-gray-500 sm:text-lg">
            Post your job in minutes, upload your photos and get your
            waste-removal requirements in front of approved RCS drivers.
          </p>

          <Link
            href="/customer/post-job"
            className="mt-9 inline-flex rounded-lg bg-[#79c51c] px-9 py-4 text-sm font-black text-black transition hover:bg-[#91db32]"
          >
            GET A QUOTE →
          </Link>
        </div>
      </section>

      {/* ========================================================= */}
      {/* FOOTER */}
      {/* ========================================================= */}

      <footer className="border-t border-white/[0.07] bg-[#030403]">
        <div className="mx-auto max-w-7xl px-5 pb-[calc(3rem+env(safe-area-inset-bottom))] pt-14 sm:px-6 lg:px-8">
          <div className="grid gap-12 md:grid-cols-4">
            <div className="md:col-span-2">
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
                Rapid Clear Solutions connects customers with approved
                waste-removal drivers through the RCS Marketplace.
              </p>

              <Link
                href="/customer/post-job"
                className="mt-6 inline-flex rounded-lg bg-[#79c51c] px-5 py-3 text-xs font-black text-black transition hover:bg-[#91db32]"
              >
                GET A QUOTE →
              </Link>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white">
                Customers
              </p>

              <div className="mt-5 flex flex-col gap-3 text-sm text-gray-600">
                <Link
                  href="/customer/post-job"
                  className="transition hover:text-[#79c51c]"
                >
                  Get a Quote
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
              </div>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white">
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
                  href="/services"
                  className="transition hover:text-[#79c51c]"
                >
                  Services
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
/* SERVICE CARD */
/* ========================================================= */

function ServiceCard({
  number,
  title,
  image,
  href,
}: {
  number: string;
  title: string;
  image: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group relative h-[190px] overflow-hidden rounded-xl border border-white/[0.09] bg-[#0a0e0a] sm:h-[205px]"
    >
      <Image
        src={image}
        alt={`${title} waste removal service`}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        className="object-cover opacity-50 transition duration-500 group-hover:scale-105 group-hover:opacity-65"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-[#050705] via-[#050705]/65 to-[#050705]/10" />

      <div className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#0b110b]/90 text-[11px] font-black text-[#79c51c] backdrop-blur-sm">
        {number}
      </div>

      <div className="absolute inset-x-0 bottom-0 p-5">
        <h3 className="text-lg font-black uppercase leading-tight text-white sm:text-xl">
          {title}
        </h3>

        <div className="mt-2 text-xs font-black text-[#79c51c]">
          Explore service →
        </div>
      </div>
    </Link>
  );
}

/* ========================================================= */
/* BEFORE / AFTER */
/* ========================================================= */

function BeforeAfterCard({
  image,
  title,
  text,
}: {
  image: string;
  title: string;
  text: string;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0e0a]">
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={image}
          alt={`${title} before and after`}
          fill
          sizes="(max-width: 1024px) 100vw, 33vw"
          className="object-cover transition duration-500 hover:scale-105"
        />

        <div className="absolute left-4 top-4 rounded-lg bg-[#050705]/90 px-3 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-[#79c51c] backdrop-blur-sm">
          Before & After
        </div>
      </div>

      <div className="p-6">
        <h3 className="text-xl font-black uppercase">
          {title}
        </h3>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          {text}
        </p>
      </div>
    </article>
  );
}

/* ========================================================= */
/* WHY CARD */
/* ========================================================= */

function WhyCard({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <article className="rounded-2xl border border-white/[0.08] bg-[#0a0e0a] p-6 transition hover:border-[#79c51c]/30">
      <span className="text-xs font-black text-[#79c51c]">
        {number}
      </span>

      <h3 className="mt-7 text-lg font-black uppercase">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-7 text-gray-600">
        {text}
      </p>
    </article>
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
    <div className="px-5 py-6 text-center sm:px-8 sm:py-7 sm:text-left">
      <p className="text-xs font-black uppercase tracking-[0.15em] text-white">
        {title}
      </p>

      <p className="mt-1 text-xs text-gray-600">{text}</p>
    </div>
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
    <div className="group rounded-xl border border-white/[0.08] bg-[#0a0e0a] p-7 transition hover:border-[#79c51c]/30">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-[#79c51c]">
          {number}
        </span>

        <span className="text-gray-700 transition group-hover:text-[#79c51c]">
          →
        </span>
      </div>

      <h3 className="mt-10 text-2xl font-black uppercase">
        {title}
      </h3>

      <p className="mt-4 text-sm leading-7 text-gray-600">
        {text}
      </p>
    </div>
  );
}

/* ========================================================= */
/* FEATURE ROW */
/* ========================================================= */

function FeatureRow({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-gray-400">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#79c51c] text-[10px] font-black text-black">
        ✓
      </span>

      <span>{text}</span>
    </div>
  );
}

/* ========================================================= */
/* MARKETPLACE ITEM */
/* ========================================================= */

function MarketplaceItem({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-5 border-b border-white/[0.07] py-6 first:pt-0 last:border-b-0">
      <span className="text-xs font-black text-[#79c51c]">
        {number}
      </span>

      <div>
        <h3 className="font-black uppercase">{title}</h3>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          {text}
        </p>
      </div>
    </div>
  );
}

/* ========================================================= */
/* REVIEW PLACEHOLDER */
/* ========================================================= */

function ReviewPlaceholder() {
  return (
    <article className="rounded-2xl border border-dashed border-white/[0.12] bg-[#080b08] p-7">
      <div className="flex gap-1 text-[#79c51c]">
        <span>★</span>
        <span>★</span>
        <span>★</span>
        <span>★</span>
        <span>★</span>
      </div>

      <p className="mt-5 text-sm leading-7 text-gray-600">
        Genuine RCS customer feedback will be displayed here.
      </p>

      <div className="mt-6 border-t border-white/[0.07] pt-5">
        <p className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">
          Customer Review
        </p>

        <p className="mt-1 text-xs text-gray-700">
          Reviews coming soon
        </p>
      </div>
    </article>
  );
}

/* ========================================================= */
/* MOBILE LINK */
/* ========================================================= */

function MobileLink({
  href,
  label,
  onClick,
}: {
  href: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="border-b border-white/[0.07] py-4 text-sm font-bold text-gray-300 transition hover:text-[#79c51c]"
    >
      {label}
    </Link>
  );
}