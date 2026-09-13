import Image from "next/image";
import Link from "next/link";

const services = [
  {
    number: "01",
    title: "House Clearance",
    description:
      "Complete house clearances for homes, moves, landlords, probate properties and unwanted contents.",
    image: "/house-clearance.jpg",
  },
  {
    number: "02",
    title: "Garden Waste",
    description:
      "Remove garden waste, branches, grass, soil, garden furniture and general outdoor rubbish.",
    image: "/garden-waste.jpg",
  },
  {
    number: "03",
    title: "Builders Waste",
    description:
      "Clear building and renovation waste including rubble, timber, plasterboard and general site waste.",
    image: "/builders-waste.jpg",
  },
  {
    number: "04",
    title: "Furniture Removal",
    description:
      "Old sofas, beds, wardrobes, tables, chairs and other unwanted furniture collected and removed.",
    image: "/furniture-removal.jpg",
  },
  {
    number: "05",
    title: "Shed & Garage Clearance",
    description:
      "Clear out unwanted items, tools, furniture, garden equipment and general waste from sheds and garages.",
    image: "/shed-garage.jpg",
  },
  {
    number: "06",
    title: "General Rubbish",
    description:
      "From household rubbish to unwanted items, post your job and let RCS drivers provide a quote.",
    image: "/general-rubbish.jpg",
  },
  {
    number: "07",
    title: "Scrap Collection",
    description:
      "Arrange collection of suitable scrap metal and unwanted metal items through the RCS Marketplace.",
    image: "/scrap-collection.jpg",
  },
  {
    number: "08",
    title: "Commercial Waste",
    description:
      "Flexible waste removal for businesses, offices, shops, landlords and commercial properties.",
    image: "/commercial-waste.jpg",
  },
];

export default function ServicesPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050705] text-white">
      {/* ========================================================= */}
      {/* HEADER */}
      {/* ========================================================= */}

      <header className="pwa-header sticky top-0 z-50 border-b border-white/[0.07] bg-[#050705]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-4 sm:h-[76px] sm:px-6 lg:px-8">
          {/* LOGO */}

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

          {/* DESKTOP NAV */}

          <nav className="hidden items-center gap-8 lg:flex">
            <Link
              href="/customer/post-job"
              className="text-sm font-medium text-gray-300 transition hover:text-[#79c51c]"
            >
              Get a Quote
            </Link>

            <Link
              href="/services"
              className="text-sm font-semibold text-[#79c51c]"
            >
              Services
            </Link>

            <Link
              href="/#how-it-works"
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

            <Link
              href="/contact"
              className="text-sm font-medium text-gray-300 transition hover:text-[#79c51c]"
            >
              Contact
            </Link>
          </nav>

          {/* DESKTOP BUTTONS */}

          <div className="hidden items-center gap-2 lg:flex">
            <Link
              href="/customer/login"
              className="rounded-lg border border-white/[0.12] px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/[0.04]"
            >
              Customer Login
            </Link>

            <Link
              href="/customer/post-job"
              className="rounded-lg bg-[#79c51c] px-4 py-2.5 text-sm font-bold text-black transition hover:bg-[#91db32]"
            >
              Get a Quote
            </Link>
          </div>

          {/* MOBILE BUTTON */}

          <Link
            href="/customer/post-job"
            className="rounded-lg bg-[#79c51c] px-4 py-3 text-xs font-black text-black lg:hidden"
          >
            GET A QUOTE
          </Link>
        </div>
      </header>

      {/* ========================================================= */}
      {/* HERO */}
      {/* ========================================================= */}

      <section className="relative overflow-hidden border-b border-white/[0.07]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_45%,rgba(121,197,28,0.11),transparent_35%)]" />

        <div className="pointer-events-none absolute inset-0 opacity-[0.025] [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:80px_80px]" />

        <div className="relative mx-auto max-w-7xl px-5 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
          <div className="max-w-4xl">
            <div className="mb-6 flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-[#79c51c]" />

              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#79c51c] sm:text-xs">
                RCS Services
              </span>
            </div>

            <h1 className="text-5xl font-black uppercase leading-[0.9] tracking-[-0.05em] sm:text-7xl lg:text-8xl">
              Waste removal
              <span className="block text-[#79c51c]">
                made simple.
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-base leading-7 text-gray-400 sm:text-lg sm:leading-8">
              From household clearances to garden waste and builders waste,
              post your job through the RCS Marketplace and receive quotes
              from approved drivers.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/customer/post-job"
                className="rounded-lg bg-[#79c51c] px-7 py-4 text-center text-sm font-black text-black transition hover:bg-[#91db32]"
              >
                GET A QUOTE →
              </Link>

              <Link
                href="/#how-it-works"
                className="rounded-lg border border-white/[0.14] px-7 py-4 text-center text-sm font-bold text-white transition hover:border-[#79c51c] hover:text-[#79c51c]"
              >
                HOW IT WORKS
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* SERVICES */}
      {/* ========================================================= */}

      <section className="bg-[#050705] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#79c51c]">
              What We Remove
            </p>

            <h2 className="mt-4 text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-5xl">
              Choose your
              <br />
              <span className="text-gray-500">service.</span>
            </h2>

            <p className="mt-6 text-base leading-7 text-gray-500">
              Tell us what needs removing, upload your photos and provide
              your collection details. Approved RCS drivers can then review
              suitable jobs and submit their quotes.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <ServiceCard
                key={service.number}
                number={service.number}
                title={service.title}
                description={service.description}
                image={service.image}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* MARKETPLACE */}
      {/* ========================================================= */}

      <section className="border-y border-white/[0.07] bg-[#080b08] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-20">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#79c51c]">
                The RCS Marketplace
              </p>

              <h2 className="mt-4 text-4xl font-black uppercase leading-[0.95] sm:text-5xl md:text-6xl">
                One job.
                <br />
                <span className="text-[#79c51c]">
                  Multiple options.
                </span>
              </h2>

              <p className="mt-7 max-w-xl text-base leading-7 text-gray-500 sm:text-lg sm:leading-8">
                Instead of contacting multiple waste-removal companies,
                post your requirements once. Approved RCS drivers can review
                your job and submit their quotes through the marketplace.
              </p>

              <Link
                href="/customer/post-job"
                className="mt-8 inline-flex rounded-lg bg-[#79c51c] px-7 py-4 text-sm font-black text-black transition hover:bg-[#91db32]"
              >
                POST YOUR JOB →
              </Link>
            </div>

            <div className="space-y-3">
              <MarketplaceStep
                number="01"
                title="Describe the waste"
                text="Tell us what needs removing and choose the service that best fits."
              />

              <MarketplaceStep
                number="02"
                title="Upload photos"
                text="Give drivers a clear idea of the job before they submit a quote."
              />

              <MarketplaceStep
                number="03"
                title="Receive driver quotes"
                text="Approved RCS drivers can review suitable jobs and choose whether to quote."
              />

              <MarketplaceStep
                number="04"
                title="Choose your option"
                text="Review the available quotes and select the option that works for you."
              />
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* WHY RCS */}
      {/* ========================================================= */}

      <section className="bg-[#050705] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#79c51c]">
                Why RCS
              </p>

              <h2 className="mt-4 text-4xl font-black uppercase leading-[0.95] sm:text-5xl md:text-6xl">
                Simple.
                <br />
                <span className="text-gray-500">
                  Straightforward.
                </span>
              </h2>

              <p className="mt-6 max-w-md text-base leading-7 text-gray-500">
                RCS brings customers and approved waste-removal drivers
                together through one simple marketplace.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <WhyCard
                title="Approved Drivers"
                text="Drivers apply to join the RCS network before accessing marketplace work."
              />

              <WhyCard
                title="Photo-Based Jobs"
                text="Upload photos so drivers can better understand what needs removing."
              />

              <WhyCard
                title="Simple Process"
                text="Post your job once rather than contacting multiple companies."
              />

              <WhyCard
                title="Online Management"
                text="Keep your job, quotes and collection information together in your RCS account."
              />
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* FINAL CTA */}
      {/* ========================================================= */}

      <section className="relative overflow-hidden border-t border-white/[0.07] bg-[#080b08] py-20 sm:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(121,197,28,0.10),transparent_45%)]" />

        <div className="relative mx-auto max-w-4xl px-5 text-center sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#79c51c]">
            Ready to get started?
          </p>

          <h2 className="mt-5 text-5xl font-black uppercase leading-[0.9] tracking-[-0.04em] sm:text-6xl md:text-7xl">
            Tell us what
            <span className="block text-[#79c51c]">
              needs removing.
            </span>
          </h2>

          <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-gray-500 sm:text-lg sm:leading-8">
            Post your waste-removal job, upload your photos and let approved
            RCS drivers provide their quotes.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/customer/post-job"
              className="rounded-lg bg-[#79c51c] px-8 py-4 text-sm font-black text-black transition hover:bg-[#91db32]"
            >
              GET A QUOTE →
            </Link>

            <Link
              href="/"
              className="rounded-lg border border-white/[0.15] px-8 py-4 text-sm font-black transition hover:border-[#79c51c] hover:text-[#79c51c]"
            >
              BACK TO HOME
            </Link>
          </div>
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
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white">
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
                  href="/"
                  className="transition hover:text-[#79c51c]"
                >
                  Home
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
  description,
  image,
}: {
  number: string;
  title: string;
  description: string;
  image: string;
}) {
  return (
    <Link
      href="/customer/post-job"
      className="group relative min-h-[340px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0e0a] transition duration-300 hover:-translate-y-1 hover:border-[#79c51c]/40"
    >
      <div className="absolute inset-0">
        <Image
          src={image}
          alt={title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover opacity-40 transition duration-500 group-hover:scale-105 group-hover:opacity-50"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[#050705] via-[#050705]/75 to-[#050705]/20" />
      </div>

      <div className="relative flex min-h-[340px] flex-col justify-between p-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-[#79c51c]">
            {number}
          </span>

          <span className="text-xs font-bold text-gray-400 transition group-hover:text-[#79c51c]">
            →
          </span>
        </div>

        <div>
          <h3 className="text-xl font-black uppercase leading-tight">
            {title}
          </h3>

          <p className="mt-3 text-xs leading-5 text-gray-300">
            {description}
          </p>

          <div className="mt-5 text-[10px] font-black uppercase tracking-[0.15em] text-[#79c51c]">
            Get a quote →
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ========================================================= */
/* MARKETPLACE STEP */
/* ========================================================= */

function MarketplaceStep({
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
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] text-xs font-black text-[#79c51c] transition group-hover:border-[#79c51c]/40">
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