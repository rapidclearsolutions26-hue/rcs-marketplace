"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const services = [
  {
    number: "01",
    title: "Rubbish Removal",
    image: "/general-rubbish.jpg",
    href: "/services/rubbish-removal",
  },
  {
    number: "02",
    title: "House Clearance",
    image: "/house-clearance.jpg",
    href: "/services/house-clearance",
  },
  {
    number: "03",
    title: "Garden Waste",
    image: "/garden-waste.jpg",
    href: "/services/garden-waste-removal",
  },
  {
    number: "04",
    title: "Furniture Removal",
    image: "/furniture-removal.jpg",
    href: "/services/furniture-removal",
  },
  {
    number: "05",
    title: "Builders Waste",
    image: "/builders-waste.jpg",
    href: "/services/builders-waste",
  },
  {
    number: "06",
    title: "Shed & Garage",
    image: "/shed-garage.jpg",
    href: "/customer/post-job",
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
  ["Wolverhampton", "/waste-removal-wolverhampton"],
  ["Walsall", "/waste-removal-walsall"],
  ["Sandwell", "/waste-removal-sandwell"],
  ["Solihull", "/waste-removal-solihull"],
];

const faqs = [
  [
    "How do I get a waste removal quote?",
    "Post your waste-removal job through RCS, add your postcode, describe what needs removing and upload photos. Your job can then be made available to suitable RCS drivers who can review it and submit quotes.",
  ],
  [
    "Do I need an account before posting a job?",
    "No. You can start by posting your waste-removal job. Your customer account can then be created as part of the process so you can manage your quotes and collection online.",
  ],
  [
    "What type of waste can I post?",
    "RCS can be used for common collections including household rubbish, garden waste, furniture, house clearances, builders waste, shed and garage clearances and other suitable waste-removal jobs.",
  ],
  [
    "Can I upload photos?",
    "Yes. Photos can be added to your job to help drivers understand the amount and type of waste before deciding whether to quote.",
  ],
  [
    "Where does RCS operate?",
    "RCS is building its driver network across Birmingham and the West Midlands. Availability depends on the postcode, collection requirements and the drivers available in that area.",
  ],
  [
    "How does the marketplace work for drivers?",
    "Drivers can review suitable jobs available through the RCS Marketplace and choose which jobs they want to quote for.",
  ],
];

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050705] pb-20 text-white lg:pb-0">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#050705]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[64px] max-w-7xl items-center justify-between px-4 sm:h-[72px] sm:px-6 lg:px-8">
          <Link href="/" className="shrink-0">
            <Image
              src="/rapid-clear-logo.png"
              alt="Rapid Clear Solutions"
              width={220}
              height={90}
              priority
              className="h-9 w-auto object-contain sm:h-12"
            />
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            <Link
              href="/services"
              className="text-sm font-semibold text-gray-300 transition hover:text-[#79c51c]"
            >
              Services
            </Link>

            <Link
              href="#how-it-works"
              className="text-sm font-semibold text-gray-300 transition hover:text-[#79c51c]"
            >
              How It Works
            </Link>

            <Link
              href="#drivers"
              className="text-sm font-semibold text-gray-300 transition hover:text-[#79c51c]"
            >
              For Drivers
            </Link>

            <Link
              href="#reviews"
              className="text-sm font-semibold text-gray-300 transition hover:text-[#79c51c]"
            >
              Reviews
            </Link>
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <Link
              href="/customer/login"
              className="rounded-xl border border-white/[0.12] px-4 py-2.5 text-sm font-semibold transition hover:border-white/30"
            >
              Login
            </Link>

            <Link
              href="/customer/post-job"
              className="rounded-xl bg-[#79c51c] px-5 py-2.5 text-sm font-black text-black transition hover:bg-[#91db32]"
            >
              POST A WASTE JOB
            </Link>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <Link
              href="/customer/post-job"
              className="rounded-xl bg-[#79c51c] px-3.5 py-2.5 text-[10px] font-black text-black"
            >
              POST A JOB
            </Link>

            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.12]"
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
          <div className="border-t border-white/[0.07] bg-[#050705] px-4 pb-5 lg:hidden">
            <nav className="flex flex-col">
              {[
                ["/customer/post-job", "Post a Waste Job"],
                ["/services", "Services"],
                ["#how-it-works", "How It Works"],
                ["#drivers", "For Drivers"],
                ["#reviews", "Customer Reviews"],
                ["/customer/login", "Customer Login"],
                ["/driver/login", "Driver Login"],
                ["/driver/register", "Join as a Driver"],
              ].map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="border-b border-white/[0.07] py-4 text-sm font-bold text-gray-300 hover:text-[#79c51c]"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/[0.07]">
        <div className="absolute inset-0">
          <Image
            src="/rapid-clear-solutions-removal-truck.png"
            alt="Rapid Clear Solutions waste removal truck"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[62%_center] sm:object-center"
          />

          <div className="absolute inset-0 bg-[#050705]/75" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050705] via-[#050705]/90 to-[#050705]/35" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050705] via-transparent to-[#050705]/20" />
        </div>

        <div className="relative mx-auto flex min-h-[650px] max-w-7xl items-end px-5 pb-12 pt-20 sm:min-h-[720px] sm:items-center sm:px-6 sm:py-20 lg:px-8">
          <div className="w-full max-w-4xl">
            <div className="mb-5 flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-[#79c51c]" />

              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#79c51c]">
                The RCS Marketplace
              </span>
            </div>

            <h1 className="max-w-4xl text-[48px] font-black uppercase leading-[0.88] tracking-[-0.055em] sm:text-7xl md:text-8xl lg:text-[96px]">
              Need waste
              <span className="block text-[#79c51c]">removed?</span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-gray-200 sm:mt-8 sm:text-xl sm:leading-8">
              Post your waste-removal job, upload photos and receive quotes
              from RCS drivers in your area.
            </p>

            <div className="mt-8 grid gap-3 sm:flex">
              <Link
                href="/customer/post-job"
                className="flex min-h-[58px] items-center justify-center rounded-2xl bg-[#79c51c] px-8 text-sm font-black text-black shadow-[0_0_35px_rgba(121,197,28,0.18)] transition hover:bg-[#91db32]"
              >
                POST YOUR WASTE JOB →
              </Link>

              <Link
                href="/driver/register"
                className="flex min-h-[58px] items-center justify-center rounded-2xl border border-white/20 bg-black/30 px-8 text-sm font-black backdrop-blur-sm transition hover:border-[#79c51c] hover:text-[#79c51c]"
              >
                I'M A DRIVER →
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
              {[
                "Post online",
                "Upload photos",
                "Receive quotes",
                "Manage online",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-300 backdrop-blur-sm sm:text-xs"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CUSTOMER / DRIVER SPLIT */}
      <section className="bg-[#080b08] py-14 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 sm:px-6 lg:grid-cols-2 lg:px-8">
          <AudienceCard
            label="For Customers"
            title="Need waste removed?"
            text="Post your job once, upload photos and let suitable RCS drivers review the requirements and submit their prices."
            items={[
              "Post your job online",
              "Upload photos",
              "Receive available quotes",
              "Manage your collection",
            ]}
            href="/customer/post-job"
            button="POST YOUR WASTE JOB →"
          />

          <AudienceCard
            label="For Drivers"
            title="Got a van?"
            text="Looking for more work in your local area? Join the RCS driver network and find suitable waste-removal jobs."
            items={[
              "Driver accounts free for now",
              "Find local waste jobs",
              "Choose which jobs to quote",
              "Submit your own prices",
            ]}
            href="/driver/register"
            button="JOIN AS A DRIVER →"
            outline
          />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        id="how-it-works"
        className="border-y border-white/[0.07] bg-[#050705] py-16 sm:py-24"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#79c51c]">
              How RCS works
            </p>

            <h2 className="mt-3 text-4xl font-black uppercase leading-[0.9] sm:text-6xl">
              Post. Quote. Clear.
            </h2>

            <p className="mt-5 text-sm leading-7 text-gray-500 sm:text-base">
              RCS connects customers who need waste removed with drivers
              looking for suitable work.
            </p>
          </div>

          <div className="mt-9 grid gap-3 md:grid-cols-3">
            <ProcessCard
              number="01"
              title="Post"
              text="Tell us what needs removing, where it is and when you need it collected. Upload photos to show drivers the job."
            />

            <ProcessCard
              number="02"
              title="Get quotes"
              text="Your job can be made available through the RCS Marketplace where suitable drivers can review it and submit their prices."
            />

            <ProcessCard
              number="03"
              title="Choose"
              text="Review the available quote information, choose your collection and manage the job through your RCS account."
            />
          </div>

          <Link
            href="/customer/post-job"
            className="mt-8 flex min-h-[56px] items-center justify-center rounded-2xl bg-[#79c51c] text-sm font-black text-black transition hover:bg-[#91db32] sm:mx-auto sm:max-w-xs"
          >
            START YOUR JOB →
          </Link>
        </div>
      </section>

      {/* REAL WORK */}
      <section className="bg-[#080b08] py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#79c51c]">
                Real RCS clearances
              </p>

              <h2 className="mt-3 text-4xl font-black uppercase leading-[0.9] sm:text-6xl">
                Real jobs.
                <span className="block text-[#79c51c]">Real results.</span>
              </h2>
            </div>

            <p className="max-w-md text-sm leading-6 text-gray-500">
              See examples of the type of waste-removal work customers use RCS
              to arrange.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <BeforeAfterCard
              image="/before-after-garden.png"
              title="Garden Clearance"
            />

            <BeforeAfterCard
              image="/before-after-room.png"
              title="Room Clearance"
            />

            <BeforeAfterCard
              image="/before-after-storage.png"
              title="Storage Clearance"
            />
          </div>
        </div>
      </section>

      {/* WHY RCS */}
      <section className="bg-[#050705] py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#79c51c]">
              Why use RCS?
            </p>

            <h2 className="mt-3 text-4xl font-black uppercase leading-[0.9] sm:text-6xl">
              Built around
              <span className="block text-[#79c51c]">your job.</span>
            </h2>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              "Post online",
              "Upload photos",
              "Driver quotes",
              "Online account",
              "Job management",
              "Local network",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/[0.08] bg-[#0a0e0a] p-5"
              >
                <span className="text-xl font-black text-[#79c51c]">✓</span>

                <p className="mt-5 text-sm font-black uppercase leading-tight">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MARKETPLACE */}
      <section className="border-y border-white/[0.07] bg-[#080b08] py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#79c51c]">
                More than a waste company
              </p>

              <h2 className="mt-3 text-4xl font-black uppercase leading-[0.9] sm:text-6xl">
                RCS is a
                <span className="block text-[#79c51c]">marketplace.</span>
              </h2>

              <p className="mt-6 max-w-xl text-sm leading-7 text-gray-500 sm:text-base">
                Customers post what they need removed. Drivers can find
                suitable jobs, review the requirements and submit their own
                prices.
              </p>

              <Link
                href="/customer/post-job"
                className="mt-7 inline-flex min-h-[52px] items-center rounded-2xl bg-[#79c51c] px-6 text-sm font-black text-black transition hover:bg-[#91db32]"
              >
                POST A JOB →
              </Link>
            </div>

            <div className="space-y-2">
              <MarketplaceItem
                number="01"
                title="Simple for customers"
                text="Post your job once instead of making multiple enquiries."
              />

              <MarketplaceItem
                number="02"
                title="Flexible for drivers"
                text="Review suitable work and decide which jobs you want to quote."
              />

              <MarketplaceItem
                number="03"
                title="Built to grow"
                text="RCS is designed to grow as more customers and drivers join the platform."
              />
            </div>
          </div>
        </div>
      </section>

      {/* DRIVER SECTION */}
      <section
        id="drivers"
        className="relative overflow-hidden bg-[#050705] py-20 sm:py-28"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_50%,rgba(121,197,28,0.12),transparent_40%)]" />

        <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1fr_0.8fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#79c51c]">
                For waste removal drivers
              </p>

              <h2 className="mt-3 text-4xl font-black uppercase leading-[0.9] sm:text-6xl">
                Got a van?
                <span className="block text-[#79c51c]">
                  Want more local work?
                </span>
              </h2>

              <p className="mt-6 max-w-xl text-sm leading-7 text-gray-400 sm:text-base">
                Join the RCS driver network and find waste-removal jobs in your
                local area. Choose the jobs you want to quote for and submit
                your own price.
              </p>

              <div className="mt-7 rounded-2xl border border-[#79c51c]/30 bg-[#0a0e0a] p-5">
                <p className="text-sm font-black uppercase text-[#79c51c]">
                  Driver accounts are free for now
                </p>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Driver account pricing may change in the future, so get
                  signed up while accounts are currently free.
                </p>
              </div>

              <Link
                href="/driver/register"
                className="mt-7 inline-flex min-h-[56px] items-center rounded-2xl bg-[#79c51c] px-7 text-sm font-black text-black transition hover:bg-[#91db32]"
              >
                JOIN RCS AS A DRIVER →
              </Link>
            </div>

            <div className="rounded-3xl border border-white/[0.08] bg-[#080b08] p-6 sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#79c51c]">
                Why join?
              </p>

              <div className="mt-6 space-y-4">
                {[
                  "Free driver account for now",
                  "Find jobs in your local area",
                  "Choose which jobs you want",
                  "Submit your own price",
                  "Manage jobs online",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 border-b border-white/[0.07] pb-4 last:border-0 last:pb-0"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#79c51c] text-xs font-black text-black">
                      ✓
                    </span>

                    <span className="text-sm font-bold text-gray-300">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section id="reviews" className="bg-[#080b08] py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#79c51c]">
                Customer reviews
              </p>

              <h2 className="mt-3 text-4xl font-black uppercase leading-[0.9] sm:text-6xl">
                What customers say.
              </h2>

              <p className="mt-5 text-sm leading-7 text-gray-500">
                Genuine recommendations from customers on the Rapid Clear
                Solutions Facebook page.
              </p>
            </div>

            <div className="rounded-2xl border border-[#79c51c]/20 bg-[#0a0e0a] px-5 py-4">
              <p className="text-sm font-black">100% recommend RCS</p>
              <p className="mt-1 text-xs text-gray-500">
                6 Facebook recommendations
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            <ReviewCard
              name="Jamie Penn"
              text="We would definitely recommend Rapid Clear Solutions! Their communication was fantastic from the very start, the price was very fair and they were incredibly efficient. They cleared a load of garden waste for us and made the whole process really easy from start to finish. Friendly, reliable and a great service all round. We wouldn’t hesitate to use them again. Highly recommended!"
            />

            <ReviewCard
              name="Amy Austin"
              text="Did a fantastic job moving a substantial amount of waste from a back garden! Speedy and great people, and was cheaper than hiring a skip. Will use in the future."
            />

            <ReviewCard
              name="Simpson Craig"
              text="Managed to come a lot earlier from the time given which was better for me. The price was good and I will be using them again very soon. Thanks."
            />
          </div>

          <a
            href="https://www.facebook.com/profile.php?id=61590147416808&sk=reviews"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-7 flex min-h-[52px] items-center justify-center rounded-2xl border border-white/[0.12] text-xs font-black uppercase tracking-wider transition hover:border-[#79c51c] hover:text-[#79c51c] sm:mx-auto sm:max-w-xs"
          >
            VIEW ALL FACEBOOK REVIEWS →
          </a>
        </div>
      </section>

      {/* SERVICES */}
      <section className="bg-[#050705] py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#79c51c]">
                What can we clear?
              </p>

              <h2 className="mt-3 text-4xl font-black uppercase leading-[0.9] sm:text-6xl">
                Waste removal
                <span className="block text-[#79c51c]">for real jobs.</span>
              </h2>

              <p className="mt-5 text-sm leading-7 text-gray-500 sm:text-base">
                From household rubbish to clearances, post your job and tell
                us what needs removing.
              </p>
            </div>

            <Link
              href="/services"
              className="w-fit text-xs font-black uppercase tracking-wider text-[#79c51c]"
            >
              VIEW ALL SERVICES →
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
            {services.map((service) => (
              <ServiceCard key={service.number} {...service} />
            ))}
          </div>
        </div>
      </section>

      {/* LOCATIONS */}
      <section className="border-y border-white/[0.07] bg-[#080b08] py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#79c51c]">
                Areas we cover
              </p>

              <h2 className="mt-3 max-w-3xl text-4xl font-black uppercase leading-[0.9] sm:text-6xl">
                Waste removal across the
                <span className="block text-[#79c51c]">
                  West Midlands.
                </span>
              </h2>
            </div>

            <Link
              href="/customer/post-job"
              className="text-xs font-black uppercase tracking-wider text-[#79c51c]"
            >
              CHECK YOUR AREA →
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {locations.map(([city, href]) => (
              <Link
                key={city}
                href={href}
                className="group rounded-2xl border border-white/[0.08] bg-[#0a0e0a] p-5 transition hover:border-[#79c51c]/40"
              >
                <p className="text-lg font-black">{city}</p>

                <p className="mt-2 text-xs font-bold text-gray-600 transition group-hover:text-[#79c51c]">
                  Waste removal →
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[#050705] py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-5 sm:px-6">
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#79c51c]">
              Frequently asked questions
            </p>

            <h2 className="mt-3 text-4xl font-black uppercase leading-[0.9] sm:text-6xl">
              Got questions?
            </h2>
          </div>

          <div className="mt-8 space-y-2">
            {faqs.map(([question, answer], index) => {
              const open = openFaq === index;

              return (
                <div
                  key={question}
                  className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0e0a]"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : index)}
                    className="flex w-full items-center justify-between gap-4 p-5 text-left sm:p-6"
                  >
                    <span className="text-sm font-black sm:text-base">
                      {question}
                    </span>

                    <span
                      className={`shrink-0 text-xl text-[#79c51c] transition-transform ${
                        open ? "rotate-45" : ""
                      }`}
                    >
                      +
                    </span>
                  </button>

                  {open && (
                    <div className="border-t border-white/[0.07] px-5 pb-6 pt-5 text-sm leading-7 text-gray-500 sm:px-6">
                      {answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative overflow-hidden bg-[#080b08] py-20 sm:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(121,197,28,0.13),transparent_45%)]" />

        <div className="relative mx-auto max-w-4xl px-5 text-center sm:px-6">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#79c51c]">
            Get started today
          </p>

          <h2 className="mt-4 text-5xl font-black uppercase leading-[0.86] tracking-tight sm:text-7xl">
            Got waste?
            <span className="block text-[#79c51c]">Let's clear it.</span>
          </h2>

          <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-gray-500 sm:text-base">
            Post your waste-removal job in minutes and get it in front of
            suitable RCS drivers.
          </p>

          <div className="mt-8 grid gap-3 sm:mx-auto sm:max-w-xl sm:grid-cols-2">
            <Link
              href="/customer/post-job"
              className="flex min-h-[58px] items-center justify-center rounded-2xl bg-[#79c51c] px-8 text-sm font-black text-black transition hover:bg-[#91db32]"
            >
              POST A WASTE JOB →
            </Link>

            <Link
              href="/driver/register"
              className="flex min-h-[58px] items-center justify-center rounded-2xl border border-[#79c51c] px-8 text-sm font-black text-[#79c51c] transition hover:bg-[#79c51c] hover:text-black"
            >
              JOIN AS A DRIVER →
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.07] bg-[#030403]">
        <div className="mx-auto max-w-7xl px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <Image
                src="/rapid-clear-logo.png"
                alt="Rapid Clear Solutions"
                width={220}
                height={90}
                className="h-12 w-auto object-contain"
              />

              <p className="mt-4 max-w-md text-sm leading-7 text-gray-600">
                Rapid Clear Solutions connects customers who need waste
                removed with drivers looking for suitable work through the RCS
                Marketplace.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href="/customer/post-job"
                  className="rounded-xl bg-[#79c51c] px-5 py-3 text-xs font-black text-black"
                >
                  POST A WASTE JOB →
                </Link>

                <Link
                  href="/driver/register"
                  className="rounded-xl border border-[#79c51c] px-5 py-3 text-xs font-black text-[#79c51c]"
                >
                  JOIN AS A DRIVER →
                </Link>
              </div>
            </div>

            <FooterColumn
              title="Customers"
              links={[
                ["Post a Waste Job", "/customer/post-job"],
                ["Services", "/services"],
                ["Customer Login", "/customer/login"],
              ]}
            />

            <FooterColumn
              title="Drivers"
              links={[
                ["Become a Driver", "/driver/register"],
                ["Driver Login", "/driver/login"],
                ["How It Works", "#how-it-works"],
              ]}
            />
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-white/[0.06] pt-5 text-xs text-gray-700 sm:flex-row sm:items-center sm:justify-between">
            <span>
              © {new Date().getFullYear()} Rapid Clear Solutions. All rights
              reserved.
            </span>

            <div className="flex gap-4">
              <Link href="/privacy" className="hover:text-[#79c51c]">
                Privacy
              </Link>

              <Link href="/terms" className="hover:text-[#79c51c]">
                Terms
              </Link>

              <Link href="/cookies" className="hover:text-[#79c51c]">
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* MOBILE CTA */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#050705]/95 p-2 backdrop-blur-xl lg:hidden"
        style={{
          paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))",
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/customer/post-job"
            className="flex min-h-[52px] items-center justify-center rounded-xl bg-[#79c51c] text-xs font-black text-black"
          >
            POST A JOB
          </Link>

          <Link
            href="/driver/register"
            className="flex min-h-[52px] items-center justify-center rounded-xl border border-[#79c51c] text-xs font-black text-[#79c51c]"
          >
            I'M A DRIVER
          </Link>
        </div>
      </div>
    </main>
  );
}

/* -------------------------------- */
/* COMPONENTS */
/* -------------------------------- */

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
      className="group relative h-[170px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0e0a] sm:h-[210px]"
    >
      <Image
        src={image}
        alt={title}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
        className="object-cover opacity-50 transition duration-500 group-hover:scale-105 group-hover:opacity-70"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-[#050705] via-[#050705]/65 to-transparent" />

      <span className="absolute right-2.5 top-2.5 rounded-lg bg-[#0a0e0a]/90 px-2.5 py-1.5 text-[9px] font-black text-[#79c51c]">
        {number}
      </span>

      <div className="absolute inset-x-0 bottom-0 p-4">
        <h3 className="text-sm font-black uppercase leading-tight sm:text-lg">
          {title}
        </h3>

        <p className="mt-1.5 text-[10px] font-black text-[#79c51c]">
          Explore →
        </p>
      </div>
    </Link>
  );
}

function BeforeAfterCard({
  image,
  title,
}: {
  image: string;
  title: string;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#080b08]">
      <div className="relative aspect-[4/3]">
        <Image
          src={image}
          alt={`${title} before and after`}
          fill
          sizes="(max-width: 640px) 100vw, 33vw"
          className="object-cover"
        />
      </div>

      <div className="flex items-center justify-between p-4">
        <h3 className="text-sm font-black uppercase">{title}</h3>

        <span className="text-[10px] font-black text-[#79c51c]">
          RCS WORK
        </span>
      </div>
    </article>
  );
}

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
    <article className="rounded-2xl border border-white/[0.08] bg-[#0a0e0a] p-6 sm:p-7">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-[#79c51c]">{number}</span>
        <span className="text-gray-700">→</span>
      </div>

      <h3 className="mt-8 text-xl font-black uppercase">{title}</h3>

      <p className="mt-3 text-sm leading-7 text-gray-600">{text}</p>
    </article>
  );
}

function AudienceCard({
  title,
  label,
  text,
  items,
  href,
  button,
  outline,
}: {
  title: string;
  label: string;
  text: string;
  items: string[];
  href: string;
  button: string;
  outline?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border p-6 sm:p-9 ${
        outline
          ? "border-[#79c51c]/30 bg-[#0a0e0a]"
          : "border-white/[0.08] bg-[#0a0e0a]"
      }`}
    >
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#79c51c]">
        {label}
      </p>

      <h2 className="mt-4 text-3xl font-black uppercase leading-none sm:text-5xl">
        {title}
      </h2>

      <p className="mt-5 max-w-md text-sm leading-7 text-gray-500">
        {text}
      </p>

      <div className="mt-6 grid gap-3">
        {items.map((item) => (
          <div
            key={item}
            className="flex items-center gap-3 text-sm text-gray-400"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#79c51c] text-[10px] font-black text-black">
              ✓
            </span>

            {item}
          </div>
        ))}
      </div>

      <Link
        href={href}
        className={`mt-7 inline-flex min-h-[52px] items-center rounded-xl px-6 text-xs font-black transition ${
          outline
            ? "border border-[#79c51c] text-[#79c51c] hover:bg-[#79c51c] hover:text-black"
            : "bg-[#79c51c] text-black hover:bg-[#91db32]"
        }`}
      >
        {button}
      </Link>
    </div>
  );
}

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
    <div className="flex gap-4 border-b border-white/[0.07] py-5 first:pt-0 last:border-b-0">
      <span className="text-xs font-black text-[#79c51c]">{number}</span>

      <div>
        <h3 className="text-sm font-black uppercase">{title}</h3>

        <p className="mt-2 text-sm leading-6 text-gray-600">{text}</p>
      </div>
    </div>
  );
}

function ReviewCard({
  name,
  text,
}: {
  name: string;
  text: string;
}) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-white/[0.08] bg-[#0a0e0a] p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-black">{name}</p>

        <span className="text-[9px] font-black uppercase tracking-wider text-[#79c51c]">
          Facebook recommendation
        </span>
      </div>

      <p className="mt-5 flex-1 text-sm leading-7 text-gray-400">
        “{text}”
      </p>

      <div className="mt-5 border-t border-white/[0.07] pt-4 text-xs font-bold text-gray-600">
        Genuine customer feedback
      </div>
    </article>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: string[][];
}) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-white">
        {title}
      </p>

      <div className="mt-5 flex flex-col gap-3 text-sm text-gray-600">
        {links.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className="transition hover:text-[#79c51c]"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}