
"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import RCSHeader from "@/app/components/RCSHeader";

const services = [
  {
    title: "Rubbish Removal",
    image: "/general-rubbish.jpg",
    href: "/services/rubbish-removal",
  },
  {
    title: "House Clearance",
    image: "/house-clearance.jpg",
    href: "/services/house-clearance",
  },
  {
    title: "Garden Waste",
    image: "/garden-waste.jpg",
    href: "/services/garden-waste-removal",
  },
  {
    title: "Furniture Removal",
    image: "/furniture-removal.jpg",
    href: "/services/furniture-removal",
  },
  {
    title: "Builders Waste",
    image: "/builders-waste.jpg",
    href: "/services/builders-waste",
  },
  {
    title: "Shed & Garage",
    image: "/shed-garage.jpg",
    href: "/customer/post-job",
  },
  {
    title: "Scrap Collection",
    image: "/scrap-collection.jpg",
    href: "/customer/post-job",
  },
  {
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
    "How does RCS work?",
    "Post your waste-removal job, add your postcode and photos, and explain what needs removing. Suitable RCS drivers can then review the job and submit their own quote. You can review your options and choose how you want to proceed.",
  ],
  [
    "Do I need an account before posting?",
    "No. You can start by posting your job. Your customer account can be created during the process so you can manage your quotes and collection online.",
  ],
  [
    "Can I upload photos?",
    "Yes. Photos are recommended because they help drivers understand the type and amount of waste before deciding whether to quote.",
  ],
  [
    "What can I post on RCS?",
    "Common jobs include household rubbish, garden waste, furniture, house clearances, builders waste, shed and garage clearances, scrap and other suitable waste-removal jobs.",
  ],
  [
    "Where does RCS operate?",
    "RCS is building its driver network across Birmingham and the West Midlands. Availability depends on the postcode, job requirements and drivers available in that area.",
  ],
  [
    "How does it work for drivers?",
    "Drivers can create an account, review suitable marketplace jobs and choose which jobs they want to quote for. Drivers submit their own prices and decide which work they want to take on.",
  ],
];

function Arrow() {
  return <span aria-hidden="true">→</span>;
}

function Check() {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#79c51c]/15 text-[#79c51c]">
      ✓
    </span>
  );
}

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050705] pb-20 text-white lg:pb-0">
      <RCSHeader />

      {/* =========================================================
          HERO
      ========================================================= */}
      <section className="relative overflow-hidden border-b border-white/[0.07]">
        <div className="absolute inset-0">
          <Image
            src="/rapid-clear-solutions-removal-truck.png"
            alt="Rapid Clear Solutions waste removal truck"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[68%_center] sm:object-center"
          />

          <div className="absolute inset-0 bg-[#050705]/78" />

          <div className="absolute inset-0 bg-gradient-to-r from-[#050705] via-[#050705]/90 to-[#050705]/35" />

          <div className="absolute inset-0 bg-gradient-to-t from-[#050705] via-transparent to-[#050705]/25" />
        </div>

        <div className="relative mx-auto flex min-h-[700px] max-w-7xl items-center px-5 py-24 sm:px-6 lg:min-h-[760px] lg:px-8">
          <div className="max-w-4xl">

            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#79c51c]/25 bg-[#79c51c]/10 px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-[#79c51c]" />

              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#79c51c]">
                The RCS Marketplace
              </span>
            </div>

            <h1 className="max-w-4xl text-[50px] font-black uppercase leading-[0.88] tracking-[-0.055em] sm:text-7xl md:text-8xl lg:text-[96px]">
              Waste removal.
              <span className="block text-[#79c51c]">
                The smarter way.
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-base leading-7 text-gray-200 sm:text-xl sm:leading-8">
              RCS connects customers who need waste removed with local drivers
              looking for suitable jobs. Post your job, upload photos and
              receive quotes through the RCS Marketplace.
            </p>

            <div className="mt-9 grid gap-3 sm:flex">
              <Link
                href="/customer/post-job"
                className="flex min-h-[60px] items-center justify-center rounded-2xl bg-[#79c51c] px-8 text-sm font-black text-black shadow-[0_0_40px_rgba(121,197,28,0.18)] transition hover:bg-[#91db32]"
              >
                POST YOUR WASTE JOB <Arrow />
              </Link>

              <Link
                href="/driver/register"
                className="flex min-h-[60px] items-center justify-center rounded-2xl border border-white/20 bg-black/35 px-8 text-sm font-black backdrop-blur-sm transition hover:border-[#79c51c] hover:text-[#79c51c]"
              >
                I'M A DRIVER <Arrow />
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap gap-2">
              {[
                "Post online",
                "Upload photos",
                "Receive quotes",
                "Manage online",
              ].map((item) => (
                <span
                  key={item}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-300 backdrop-blur-sm sm:text-xs"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          WHAT IS RCS
      ========================================================= */}
      <section className="border-b border-white/[0.07] bg-[#070a07] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">

            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#79c51c]">
                What is RCS?
              </p>

              <h2 className="mt-4 text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-6xl">
                A marketplace built for{" "}
                <span className="text-[#79c51c]">
                  waste removal.
                </span>
              </h2>

              <p className="mt-6 max-w-xl text-base leading-7 text-gray-400">
                Instead of searching around for a waste company and accepting
                the first price you get, RCS gives customers a simple way to
                post what they need removed and put the job in front of
                suitable drivers.
              </p>

              <Link
                href="/customer/post-job"
                className="mt-8 inline-flex items-center gap-3 text-sm font-black uppercase text-white transition hover:text-[#79c51c]"
              >
                Start a waste job <Arrow />
              </Link>
            </div>

            <div className="rounded-[2rem] border border-white/[0.08] bg-[#0a0e0a] p-5 sm:p-8">

              <div className="grid gap-3 sm:grid-cols-3">
                <FlowBox
                  label="Customer"
                  text="Posts the job"
                />

                <FlowBox
                  label="RCS"
                  text="Marketplace"
                  active
                />

                <FlowBox
                  label="Driver"
                  text="Submits a quote"
                />
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                {[
                  ["01", "POST"],
                  ["02", "QUOTE"],
                  ["03", "CHOOSE"],
                  ["04", "CLEAR"],
                ].map(([number, title]) => (
                  <div
                    key={number}
                    className="rounded-2xl border border-white/[0.07] bg-[#050705] p-4"
                  >
                    <span className="text-[10px] font-black text-[#79c51c]">
                      {number}
                    </span>

                    <p className="mt-2 text-xs font-black tracking-widest">
                      {title}
                    </p>
                  </div>
                ))}
              </div>

              <p className="mt-5 text-sm leading-6 text-gray-500">
                One simple process from posting a job to arranging your
                collection.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          HOW IT WORKS
      ========================================================= */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

          <SectionIntro
            eyebrow="How it works"
            title="Post. Quote. Clear."
            text="RCS is designed to make the process straightforward. Tell us what needs removing and let the marketplace connect the job with suitable drivers."
          />

          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-5">

            {[
              [
                "01",
                "Post your job",
                "Add your postcode, details and photos.",
              ],
              [
                "02",
                "Drivers review",
                "Suitable drivers can review the job.",
              ],
              [
                "03",
                "Receive quotes",
                "Drivers submit their own prices.",
              ],
              [
                "04",
                "Choose",
                "Review your options and decide.",
              ],
              [
                "05",
                "Get it cleared",
                "Arrange the collection and get the waste gone.",
              ],
            ].map(([num, title, text]) => (
              <div
                key={num}
                className="rounded-3xl border border-white/[0.08] bg-[#080b08] p-6 transition hover:-translate-y-1 hover:border-[#79c51c]/30"
              >
                <span className="text-xs font-black text-[#79c51c]">
                  {num}
                </span>

                <h3 className="mt-6 text-lg font-black uppercase">
                  {title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-gray-500">
                  {text}
                </p>
              </div>
            ))}

          </div>
        </div>
      </section>

      {/* =========================================================
          CUSTOMER / DRIVER
      ========================================================= */}
      <section className="border-y border-white/[0.07] bg-[#070a07] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

          <div className="grid gap-5 lg:grid-cols-2">

            <AudienceCard
              eyebrow="For customers"
              title="Need something removed?"
              text="Post the job once and give drivers the information they need to decide whether they want to quote. Keep your job and quotes together online."
              items={[
                "Post your job online",
                "Upload photos",
                "Receive driver quotes",
                "Manage your collection online",
              ]}
              href="/customer/post-job"
              button="POST A JOB"
            />

            <AudienceCard
              eyebrow="For drivers"
              title="Got a van? Find local work."
              text="Join the RCS driver network, see suitable marketplace jobs and choose which ones you want to quote for."
              items={[
                "Create a driver account",
                "Find suitable local jobs",
                "Choose what you quote for",
                "Submit your own prices",
              ]}
              href="/driver/register"
              button="JOIN AS A DRIVER"
            />

          </div>
        </div>
      </section>

      {/* =========================================================
          CUSTOMER ACCOUNT / APP
      ========================================================= */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

          <div className="overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#090d09]">

            <div className="grid lg:grid-cols-[1fr_0.85fr] lg:items-center">

              <div className="p-7 sm:p-12 lg:p-16">

                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#79c51c]">
                  Your RCS account
                </p>

                <h2 className="mt-4 max-w-2xl text-4xl font-black uppercase leading-[0.95] sm:text-6xl">
                  Everything in one place.
                </h2>

                <p className="mt-6 max-w-xl text-base leading-7 text-gray-400">
                  The RCS website explains the service. Your customer or driver
                  account is where the marketplace work happens — jobs, quotes
                  and collections are managed online.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">

                  {[
                    "Post and manage jobs",
                    "Upload job photos",
                    "Review quotes",
                    "Manage collections",
                    "View your jobs",
                    "Keep everything online",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-[#050705] p-3 text-sm font-bold text-gray-300"
                    >
                      <Check />
                      {item}
                    </div>
                  ))}

                </div>

                <div className="mt-8 flex flex-wrap gap-3">

                  <Link
                    href="/customer/register"
                    className="rounded-xl bg-[#79c51c] px-6 py-4 text-xs font-black text-black transition hover:bg-[#91db32]"
                  >
                    CREATE CUSTOMER ACCOUNT
                  </Link>

                  <Link
                    href="/customer/login"
                    className="rounded-xl border border-white/15 px-6 py-4 text-xs font-black transition hover:border-[#79c51c]"
                  >
                    CUSTOMER LOGIN
                  </Link>

                </div>
              </div>

              {/* APP MOCKUP */}
              <div className="relative min-h-[360px] border-t border-white/[0.07] bg-[#050705] lg:min-h-[520px] lg:border-l lg:border-t-0">

                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(121,197,28,0.14),transparent_55%)]" />

                <div className="absolute left-8 right-8 top-10 rounded-3xl border border-white/10 bg-[#0b100b] p-5 shadow-2xl sm:left-12 sm:right-12 sm:top-16">

                  <div className="flex items-center justify-between border-b border-white/[0.07] pb-4">

                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-[#79c51c]">
                        RCS Marketplace
                      </p>

                      <p className="mt-1 text-lg font-black">
                        My jobs
                      </p>
                    </div>

                    <span className="rounded-lg bg-[#79c51c]/10 px-2 py-1 text-[9px] font-black text-[#79c51c]">
                      ONLINE
                    </span>

                  </div>

                  <div className="mt-4 space-y-3">

                    {[
                      "House clearance",
                      "Garden waste",
                      "Furniture removal",
                    ].map((job, i) => (
                      <div
                        key={job}
                        className="rounded-2xl border border-white/[0.07] bg-[#050705] p-4"
                      >

                        <div className="flex items-center justify-between">

                          <p className="text-sm font-black">
                            {job}
                          </p>

                          <span className="text-[9px] font-black text-[#79c51c]">
                            {i + 2} QUOTES
                          </span>

                        </div>

                        <p className="mt-2 text-[10px] text-gray-600">
                          Photos uploaded · Job posted online
                        </p>

                      </div>
                    ))}

                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          SERVICES
      ========================================================= */}
      <section className="border-y border-white/[0.07] bg-[#070a07] py-20 sm:py-28">

        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

          <SectionIntro
            eyebrow="What can RCS help with?"
            title="Waste removal for real jobs."
            text="From a few bags of rubbish to a full clearance, post the job with the details and photos needed for drivers to understand what you need."
          />

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {services.map((service) => (
              <ServiceCard
                key={service.title}
                {...service}
              />
            ))}

          </div>
        </div>
      </section>

      {/* =========================================================
          REAL RCS WORK
      ========================================================= */}
      <section className="py-20 sm:py-28">

        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

          <SectionIntro
            eyebrow="Real RCS clearances"
            title="Real jobs. Real results."
            text="The marketplace is backed by an actual waste-removal service. Here are examples of the type of clearance work RCS handles."
          />

          <div className="mt-12 grid gap-5 md:grid-cols-3">

            <BeforeAfterCard
              image="/before-after-garden.png"
              title="Garden clearance"
            />

            <BeforeAfterCard
              image="/before-after-room.png"
              title="Room clearance"
            />

            <BeforeAfterCard
              image="/before-after-storage.png"
              title="Storage clearance"
            />

          </div>
        </div>
      </section>

      {/* =========================================================
          WHY RCS
      ========================================================= */}
      <section className="border-y border-white/[0.07] bg-[#070a07] py-20 sm:py-28">

        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#79c51c]">
                Why use RCS?
              </p>

              <h2 className="mt-4 text-4xl font-black uppercase leading-[0.95] sm:text-6xl">
                Built to make waste removal easier.
              </h2>

              <p className="mt-6 max-w-xl text-base leading-7 text-gray-500">
                RCS brings the customer, the job and the driver together in
                one simple online process.
              </p>

              <Link
                href="/customer/post-job"
                className="mt-8 inline-flex rounded-xl bg-[#79c51c] px-6 py-4 text-xs font-black text-black transition hover:bg-[#91db32]"
              >
                POST YOUR JOB →
              </Link>

            </div>

            <div className="grid gap-3 sm:grid-cols-2">

              {[
                [
                  "01",
                  "Post online",
                  "Tell us what needs removing.",
                ],
                [
                  "02",
                  "Upload photos",
                  "Give drivers a better idea of the job.",
                ],
                [
                  "03",
                  "Driver quotes",
                  "Suitable drivers can submit their own prices.",
                ],
                [
                  "04",
                  "Online account",
                  "Keep your job and information together.",
                ],
                [
                  "05",
                  "Job management",
                  "Manage the process online.",
                ],
                [
                  "06",
                  "Local network",
                  "Connect with suitable drivers in your area.",
                ],
              ].map(([number, title, text]) => (

                <div
                  key={number}
                  className="rounded-2xl border border-white/[0.08] bg-[#080b08] p-6"
                >

                  <span className="text-xs font-black text-[#79c51c]">
                    {number}
                  </span>

                  <h3 className="mt-5 text-base font-black uppercase">
                    {title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    {text}
                  </p>

                </div>

              ))}

            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          MARKETPLACE EXPLANATION
      ========================================================= */}
      <section className="py-20 sm:py-28">

        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

          <div className="rounded-[2rem] border border-white/[0.08] bg-[#080b08] p-7 sm:p-12 lg:p-16">

            <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center">

              <div>

                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#79c51c]">
                  More than a waste company
                </p>

                <h2 className="mt-4 text-4xl font-black uppercase leading-[0.95] sm:text-6xl">
                  RCS is a{" "}
                  <span className="text-[#79c51c]">
                    marketplace.
                  </span>
                </h2>

                <p className="mt-6 text-base leading-7 text-gray-400">
                  Customers post what they need removed. Drivers can find
                  suitable jobs, review the requirements and submit their own
                  prices.
                </p>

                <p className="mt-5 text-base leading-7 text-gray-500">
                  This gives customers another way to arrange waste removal
                  while giving drivers more control over the work they choose
                  to quote for.
                </p>

              </div>

              <div className="space-y-3">

                {[
                  [
                    "Simple for customers",
                    "Post the job and let suitable drivers review it.",
                  ],
                  [
                    "Flexible for drivers",
                    "Choose the jobs you actually want to quote for.",
                  ],
                  [
                    "Built to grow",
                    "RCS is building a growing network of customers and drivers.",
                  ],
                ].map(([title, text], index) => (

                  <div
                    key={title}
                    className="flex gap-5 rounded-2xl border border-white/[0.08] bg-[#050705] p-5"
                  >

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#79c51c]/10 text-xs font-black text-[#79c51c]">
                      0{index + 1}
                    </div>

                    <div>
                      <h3 className="text-sm font-black uppercase">
                        {title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-gray-500">
                        {text}
                      </p>
                    </div>

                  </div>

                ))}

              </div>

            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          DRIVER CTA
      ========================================================= */}
      <section className="border-y border-white/[0.07] bg-[#79c51c] text-black">

        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 sm:py-20 lg:px-8">

          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.24em] text-black/60">
                For waste removal drivers
              </p>

              <h2 className="mt-3 max-w-3xl text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-6xl">
                Got a van? Want more local work?
              </h2>

              <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-black/70">
                Join the RCS driver network, review suitable jobs and submit
                your own prices. You choose which jobs you want to quote for.
              </p>

            </div>

            <Link
              href="/driver/register"
              className="inline-flex min-h-[58px] items-center justify-center rounded-2xl bg-black px-8 text-sm font-black text-white transition hover:bg-[#111]"
            >
              JOIN RCS AS A DRIVER
              <span className="ml-2">→</span>
            </Link>

          </div>
        </div>
      </section>

      {/* =========================================================
          REVIEWS
      ========================================================= */}
      <section className="py-20 sm:py-28">

        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#79c51c]">
                Customer reviews
              </p>

              <h2 className="mt-3 text-4xl font-black uppercase tracking-tight sm:text-5xl">
                What customers say.
              </h2>

            </div>

            <Link
              href="https://www.facebook.com/profile.php?id=61590147416808&sk=reviews"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-black uppercase tracking-wider text-gray-500 hover:text-[#79c51c]"
            >
              View Facebook recommendations →
            </Link>

          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">

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
        </div>
      </section>

      {/* =========================================================
          AREAS
      ========================================================= */}
      <section className="border-y border-white/[0.07] bg-[#070a07] py-20 sm:py-24">

        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

          <SectionIntro
            eyebrow="Areas we cover"
            title="Waste removal across the West Midlands."
            text="RCS is building its local driver network across the region. Check your postcode by starting a job."
          />

          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">

            {locations.map(([name, href]) => (

              <Link
                key={name}
                href={href}
                className="rounded-2xl border border-white/[0.08] bg-[#050705] p-5 text-sm font-black uppercase transition hover:-translate-y-1 hover:border-[#79c51c]/40 hover:text-[#79c51c]"
              >
                {name}

                <span className="mt-3 block text-[#79c51c]">
                  ↗
                </span>
              </Link>

            ))}

          </div>
        </div>
      </section>

      {/* =========================================================
          FAQ
      ========================================================= */}
      <section className="py-20 sm:py-28">

        <div className="mx-auto max-w-4xl px-5 sm:px-6">

          <SectionIntro
            eyebrow="Frequently asked questions"
            title="Questions, answered."
            text="A few things customers and drivers commonly want to know about the RCS Marketplace."
          />

          <div className="mt-10 space-y-3">

            {faqs.map(([question, answer], index) => {

              const open = openFaq === index;

              return (
                <div
                  key={question}
                  className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#080b08]"
                >

                  <button
                    type="button"
                    onClick={() =>
                      setOpenFaq(open ? null : index)
                    }
                    aria-expanded={open}
                    className="flex w-full items-center justify-between gap-5 px-5 py-5 text-left sm:px-6"
                  >

                    <span className="text-sm font-black uppercase sm:text-base">
                      {question}
                    </span>

                    <span
                      className={`text-xl font-light text-[#79c51c] transition ${
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

      {/* =========================================================
          FINAL CTA
      ========================================================= */}
      <section className="relative overflow-hidden border-t border-white/[0.07] bg-[#0a0e0a]">

        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#79c51c]/10 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-5 py-24 text-center sm:px-6 sm:py-32">

          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#79c51c]">
            Ready to get started?
          </p>

          <h2 className="mt-4 text-5xl font-black uppercase leading-[0.9] tracking-tight sm:text-7xl">
            Got waste?
            <span className="block text-[#79c51c]">
              Let&apos;s clear it.
            </span>
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-gray-500">
            Post your waste-removal job in minutes and put it in front of
            suitable RCS drivers.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">

            <Link
              href="/customer/post-job"
              className="rounded-2xl bg-[#79c51c] px-8 py-5 text-sm font-black text-black transition hover:bg-[#91db32]"
            >
              POST YOUR WASTE JOB <Arrow />
            </Link>

            <Link
              href="/driver/register"
              className="rounded-2xl border border-white/15 px-8 py-5 text-sm font-black transition hover:border-[#79c51c] hover:text-[#79c51c]"
            >
              JOIN AS A DRIVER <Arrow />
            </Link>

          </div>
        </div>
      </section>

      {/* =========================================================
          FOOTER
      ========================================================= */}
      <footer className="border-t border-white/[0.07] bg-[#050705]">

        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8">

          <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">

            <div>

              <Image
                src="/rapid-clear-logo.png"
                alt="Rapid Clear Solutions"
                width={70}
                height={70}
                className="h-14 w-14 object-contain"
              />

              <p className="mt-5 max-w-sm text-sm leading-6 text-gray-600">
                Rapid Clear Solutions connects customers who need waste
                removed with drivers looking for suitable work through the RCS
                Marketplace.
              </p>

            </div>

            <FooterLinks
              title="Customers"
              links={[
                ["Post a Waste Job", "/customer/post-job"],
                ["Services", "/services"],
                ["Customer Login", "/customer/login"],
              ]}
            />

            <FooterLinks
              title="Drivers"
              links={[
                ["Become a Driver", "/driver/register"],
                ["Driver Login", "/driver/login"],
              ]}
            />

            <FooterLinks
              title="Company"
              links={[
                ["Contact", "/contact"],
                ["Privacy", "/privacy"],
                ["Terms", "/terms"],
                ["Cookies", "/cookies"],
                ["Admin Login", "/admin/login"],
              ]}
            />

          </div>

          <div className="mt-12 flex flex-col gap-3 border-t border-white/[0.07] pt-6 text-[10px] font-bold uppercase tracking-wider text-gray-700 sm:flex-row sm:items-center sm:justify-between">

            <span>
              © {new Date().getFullYear()} Rapid Clear Solutions
            </span>

            <span>
              RCS Marketplace
            </span>

          </div>
        </div>
      </footer>

      {/* =========================================================
          MOBILE CTA
      ========================================================= */}
      <div className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-2 gap-px border-t border-white/10 bg-black/95 p-2 backdrop-blur-xl lg:hidden">

        <Link
          href="/customer/post-job"
          className="flex min-h-12 items-center justify-center rounded-xl bg-[#79c51c] text-[11px] font-black text-black"
        >
          POST A JOB
        </Link>

        <Link
          href="/driver/register"
          className="flex min-h-12 items-center justify-center rounded-xl border border-white/15 text-[11px] font-black text-white"
        >
          I&apos;M A DRIVER
        </Link>

      </div>
    </main>
  );
}

/* ===============================================================
   SECTION INTRO
=============================================================== */

function SectionIntro({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="max-w-3xl">

      <p className="text-xs font-black uppercase tracking-[0.24em] text-[#79c51c]">
        {eyebrow}
      </p>

      <h2 className="mt-3 text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-6xl">
        {title}
      </h2>

      <p className="mt-5 max-w-2xl text-base leading-7 text-gray-500">
        {text}
      </p>

    </div>
  );
}

/* ===============================================================
   FLOW BOX
=============================================================== */

function FlowBox({
  label,
  text,
  active = false,
}: {
  label: string;
  text: string;
  active?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        active
          ? "border-[#79c51c]/40 bg-[#79c51c]/10"
          : "border-white/[0.07] bg-[#050705]"
      }`}
    >

      <p
        className={`text-[10px] font-black uppercase tracking-widest ${
          active
            ? "text-[#79c51c]"
            : "text-gray-600"
        }`}
      >
        {label}
      </p>

      <p className="mt-3 text-sm font-black uppercase">
        {text}
      </p>

    </div>
  );
}

/* ===============================================================
   AUDIENCE CARD
=============================================================== */

function AudienceCard({
  eyebrow,
  title,
  text,
  items,
  href,
  button,
}: {
  eyebrow: string;
  title: string;
  text: string;
  items: string[];
  href: string;
  button: string;
}) {
  return (
    <div className="rounded-[2rem] border border-white/[0.08] bg-[#0a0e0a] p-7 sm:p-10">

      <p className="text-xs font-black uppercase tracking-[0.24em] text-[#79c51c]">
        {eyebrow}
      </p>

      <h3 className="mt-4 text-3xl font-black uppercase leading-[0.95] sm:text-5xl">
        {title}
      </h3>

      <p className="mt-5 text-sm leading-7 text-gray-500">
        {text}
      </p>

      <div className="mt-7 space-y-3">

        {items.map((item) => (
          <div
            key={item}
            className="flex items-center gap-3 text-sm font-bold text-gray-300"
          >
            <Check />
            {item}
          </div>
        ))}

      </div>

      <Link
        href={href}
        className="mt-8 inline-flex rounded-xl bg-[#79c51c] px-6 py-4 text-xs font-black text-black transition hover:bg-[#91db32]"
      >
        {button}
        <span className="ml-2">→</span>
      </Link>

    </div>
  );
}

/* ===============================================================
   SERVICE CARD
=============================================================== */

function ServiceCard({
  title,
  image,
  href,
}: {
  title: string;
  image: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group relative min-h-[260px] overflow-hidden rounded-3xl border border-white/[0.08] bg-[#050705]"
    >

      <Image
        src={image}
        alt={title}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        className="object-cover transition duration-700 group-hover:scale-105 group-hover:opacity-70"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-5">

        <h3 className="text-lg font-black uppercase">
          {title}
        </h3>

        <span className="mt-2 block text-xs font-black text-[#79c51c]">
          VIEW SERVICE →
        </span>

      </div>

    </Link>
  );
}

/* ===============================================================
   BEFORE / AFTER CARD
=============================================================== */

function BeforeAfterCard({
  image,
  title,
}: {
  image: string;
  title: string;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[#080b08]">

      <div className="relative aspect-[4/3]">

        <Image
          src={image}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover"
        />

      </div>

      <div className="p-5">

        <p className="text-xs font-black uppercase tracking-wider text-[#79c51c]">
          RCS clearance
        </p>

        <h3 className="mt-2 text-lg font-black uppercase">
          {title}
        </h3>

      </div>

    </div>
  );
}

/* ===============================================================
   REVIEW CARD
=============================================================== */

function ReviewCard({
  name,
  text,
}: {
  name: string;
  text: string;
}) {
  return (
    <div className="rounded-3xl border border-white/[0.08] bg-[#080b08] p-6">

      <div className="flex gap-1 text-[#79c51c]">
        ★★★★★
      </div>

      <p className="mt-5 text-sm leading-7 text-gray-400">
        “{text}”
      </p>

      <p className="mt-6 text-xs font-black uppercase tracking-wider text-white">
        {name}
      </p>

      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-700">
        RCS customer
      </p>

    </div>
  );
}

/* ===============================================================
   FOOTER LINKS
=============================================================== */

function FooterLinks({
  title,
  links,
}: {
  title: string;
  links: [string, string][];
}) {
  return (
    <div>

      <p className="text-xs font-black uppercase tracking-wider text-white">
        {title}
      </p>

      <div className="mt-5 space-y-3">

        {links.map(([label, href]) => (
          <Link
            key={label}
            href={href}
            className="block text-sm text-gray-600 transition hover:text-[#79c51c]"
          >
            {label}
          </Link>
        ))}

      </div>

    </div>
  );
}