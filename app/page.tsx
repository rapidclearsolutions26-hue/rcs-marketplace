import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#050705] pt-[env(safe-area-inset-top)] text-white selection:bg-[#79c51c] selection:text-black">
      {/* ========================================================= */}
      {/* HEADER */}
      {/* ========================================================= */}

      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#050705]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
          <Link href="/" className="group shrink-0">
            <Image
              src="/rapid-clear-logo.png"
              alt="Rapid Clear Solutions"
              width={220}
              height={90}
              priority
              className="h-12 w-auto object-contain transition duration-300 group-hover:scale-[1.03] sm:h-14"
            />
          </Link>

          <nav className="hidden items-center gap-8 lg:flex">
            <Link
              href="/customer/post-job"
              className="text-sm font-semibold text-gray-300 transition hover:text-[#79c51c]"
            >
              Get a Quote
            </Link>

            <Link
              href="/driver/register"
              className="text-sm font-semibold text-gray-300 transition hover:text-[#79c51c]"
            >
              Become a Driver
            </Link>

            <Link
              href="#how-it-works"
              className="text-sm font-semibold text-gray-300 transition hover:text-[#79c51c]"
            >
              How It Works
            </Link>

            <Link
              href="/contact"
              className="text-sm font-semibold text-gray-300 transition hover:text-[#79c51c]"
            >
              Contact
            </Link>
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/customer/login"
              className="rounded-xl border border-white/[0.12] bg-white/[0.03] px-3 py-2.5 text-xs font-bold text-white backdrop-blur-sm transition hover:border-[#79c51c]/60 hover:bg-white/[0.06] sm:px-5 sm:py-3 sm:text-sm"
            >
              <span className="sm:hidden">Customer</span>
              <span className="hidden sm:inline">Customer Login</span>
            </Link>

            <Link
              href="/driver/login"
              className="rounded-xl bg-[#79c51c] px-3 py-2.5 text-xs font-black text-black shadow-[0_0_30px_rgba(121,197,28,0.18)] transition hover:-translate-y-0.5 hover:bg-[#91db32] hover:shadow-[0_0_40px_rgba(121,197,28,0.28)] sm:px-5 sm:py-3 sm:text-sm"
            >
              <span className="sm:hidden">Driver</span>
              <span className="hidden sm:inline">Driver Login</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* HERO */}
      {/* ========================================================= */}

      <section className="relative isolate min-h-[780px] overflow-hidden border-b border-white/[0.06]">
        {/* Background atmosphere */}

        <div className="absolute inset-0 -z-20 bg-[#050705]" />

        <div className="absolute left-[-180px] top-[80px] -z-10 h-[500px] w-[500px] rounded-full bg-[#79c51c]/[0.07] blur-[120px]" />

        <div className="absolute right-[-160px] top-[100px] -z-10 h-[600px] w-[600px] rounded-full bg-[#79c51c]/[0.09] blur-[140px]" />

        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_70%_45%,rgba(121,197,28,0.11),transparent_28%),radial-gradient(circle_at_20%_80%,rgba(121,197,28,0.05),transparent_30%)]" />

        {/* Grid */}

        <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.055] [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:70px_70px] [mask-image:linear-gradient(to_bottom,black,transparent_90%)]" />

        <div className="mx-auto grid min-h-[780px] max-w-7xl items-center px-6 py-20 lg:grid-cols-[0.92fr_1.08fr] lg:gap-4">
          {/* HERO COPY */}

          <div className="relative z-20 max-w-3xl">
            <div className="mb-7 inline-flex items-center gap-3 rounded-full border border-[#79c51c]/20 bg-[#79c51c]/[0.06] px-4 py-2 backdrop-blur-md">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#79c51c] opacity-50" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#79c51c]" />
              </span>

              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#a9d97c]">
                RCS Marketplace
              </span>
            </div>

            <p className="mb-5 text-xs font-black uppercase tracking-[0.28em] text-[#79c51c] sm:text-sm">
              Rapid Clear Solutions
            </p>

            <h1 className="max-w-4xl text-[3.8rem] font-black uppercase leading-[0.84] tracking-[-0.055em] sm:text-7xl md:text-8xl xl:text-[7.4rem]">
              <span className="block">WE WANT</span>

              <span className="block bg-gradient-to-r from-[#79c51c] via-[#9bdd45] to-[#5d9e15] bg-clip-text text-transparent">
                YOUR WASTE.
              </span>
            </h1>

            <div className="mt-8 max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
                Waste removal.
                <span className="text-gray-500"> Reimagined.</span>
              </h2>

              <p className="mt-5 max-w-xl text-base leading-7 text-gray-400 sm:text-lg sm:leading-8">
                Post your waste removal job, receive bids from approved RCS
                drivers and choose the option that works for you.
              </p>
            </div>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/customer/post-job"
                className="group relative overflow-hidden rounded-2xl bg-[#79c51c] px-7 py-4 text-center font-black text-black shadow-[0_15px_50px_rgba(121,197,28,0.18)] transition duration-300 hover:-translate-y-1 hover:bg-[#91db32] hover:shadow-[0_20px_60px_rgba(121,197,28,0.28)]"
              >
                <span className="relative z-10">GET A QUOTE →</span>

                <span className="absolute inset-0 -translate-x-full bg-white/20 transition duration-500 group-hover:translate-x-full" />
              </Link>

              <Link
                href="/driver/register"
                className="rounded-2xl border border-white/[0.14] bg-white/[0.03] px-7 py-4 text-center font-black text-white backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:border-[#79c51c]/60 hover:bg-[#79c51c]/[0.06]"
              >
                BECOME A DRIVER
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-7 gap-y-3 text-xs font-semibold text-gray-500 sm:text-sm">
              <span className="flex items-center gap-2">
                <span className="text-[#79c51c]">✓</span>
                Approved drivers
              </span>

              <span className="flex items-center gap-2">
                <span className="text-[#79c51c]">✓</span>
                Secure payments
              </span>

              <span className="flex items-center gap-2">
                <span className="text-[#79c51c]">✓</span>
                Online booking
              </span>
            </div>
          </div>

          {/* HERO VISUAL */}

          <div className="relative flex min-h-[430px] items-center justify-center lg:min-h-[650px]">
            {/* Main glow */}

            <div className="absolute h-[320px] w-[320px] rounded-full bg-[#79c51c]/10 blur-[90px] sm:h-[470px] sm:w-[470px]" />

            {/* Outer ring */}

            <div className="absolute h-[350px] w-[350px] rounded-full border border-[#79c51c]/10 sm:h-[500px] sm:w-[500px]" />

            <div className="absolute h-[285px] w-[285px] rounded-full border border-white/[0.05] sm:h-[420px] sm:w-[420px]" />

            {/* Floating card - top */}

            <div className="absolute right-0 top-[8%] z-20 hidden rounded-2xl border border-white/[0.1] bg-[#0c110c]/80 p-4 shadow-2xl backdrop-blur-xl sm:block lg:right-[-10px]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#79c51c]/10">
                  <span className="text-lg text-[#79c51c]">✓</span>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    Marketplace
                  </p>

                  <p className="mt-1 text-sm font-black text-white">
                    Driver network active
                  </p>
                </div>
              </div>
            </div>

            {/* Floating card - bottom */}

            <div className="absolute bottom-[9%] left-0 z-20 hidden rounded-2xl border border-white/[0.1] bg-[#0c110c]/80 p-4 shadow-2xl backdrop-blur-xl sm:block lg:left-[-10px]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#79c51c]/10 text-sm font-black text-[#79c51c]">
                  £
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    Secure checkout
                  </p>

                  <p className="mt-1 text-sm font-black text-white">
                    Simple online payment
                  </p>
                </div>
              </div>
            </div>

            {/* Truck */}

            <Image
              src="/rapid-clear-solutions-removal-truck.png"
              alt="Rapid Clear Solutions removal truck"
              width={1000}
              height={700}
              priority
              className="relative z-10 w-[115%] max-w-[780px] object-contain drop-shadow-[0_40px_80px_rgba(0,0,0,0.9)] transition duration-700 hover:scale-[1.025]"
            />

            {/* Ground shadow */}

            <div className="absolute bottom-[9%] h-10 w-[75%] rounded-[50%] bg-black/70 blur-2xl" />
          </div>
        </div>

        {/* Scroll indicator */}

        <a
          href="#how-it-works"
          className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 text-[9px] font-black uppercase tracking-[0.3em] text-gray-600 transition hover:text-[#79c51c] sm:flex"
        >
          <span>Explore RCS</span>

          <span className="h-9 w-px bg-gradient-to-b from-[#79c51c] to-transparent" />
        </a>
      </section>

      {/* ========================================================= */}
      {/* MARKETPLACE STATS */}
      {/* ========================================================= */}

      <section className="relative border-b border-white/[0.06] bg-[#080b08]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(121,197,28,0.06),transparent_35%)]" />

        <div className="relative mx-auto grid max-w-7xl grid-cols-2 divide-x divide-y divide-white/[0.06] md:grid-cols-4 md:divide-y-0">
          <Stat
            number="01"
            title="Post"
            text="Tell us what needs removing."
          />

          <Stat
            number="02"
            title="Bid"
            text="Approved drivers submit prices."
          />

          <Stat
            number="03"
            title="Choose"
            text="Select the option that suits you."
          />

          <Stat
            number="04"
            title="Collect"
            text="Your driver completes the job."
          />
        </div>
      </section>

      {/* ========================================================= */}
      {/* MARKETPLACE INTRO */}
      {/* ========================================================= */}

      <section
        id="how-it-works"
        className="relative border-b border-white/[0.06] bg-[#050705] py-24 sm:py-32"
      >
        <div className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-[#79c51c]/[0.035] blur-[120px]" />

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="grid gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-[#79c51c]">
                The RCS Marketplace
              </p>

              <h2 className="mt-5 text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-5xl md:text-6xl">
                One marketplace.
                <br />
                <span className="text-gray-500">
                  Two sides.
                </span>
              </h2>
            </div>

            <p className="max-w-2xl text-base leading-8 text-gray-400 sm:text-lg">
              RCS brings customers and independent waste removal drivers
              together in one simple marketplace. Customers post jobs.
              Approved drivers find suitable work and submit bids.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {/* CUSTOMER */}

            <MarketplaceCard
              label="Customers"
              eyebrow="Need waste removed?"
              title="Post your job."
              text="Tell us what needs removing, upload photos and provide your collection details. Approved drivers can then view suitable jobs and submit bids."
              href="/customer/post-job"
              button="POST A JOB"
              featured
            />

            {/* DRIVER */}

            <MarketplaceCard
              label="Drivers"
              eyebrow="Looking for more work?"
              title="Join the network."
              text="Apply to join the RCS driver network. Once approved, you can view available marketplace jobs and submit bids for work that suits your vehicle and business."
              href="/driver/register"
              button="BECOME A DRIVER"
            />
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* PROCESS */}
      {/* ========================================================= */}

      <section className="relative border-b border-white/[0.06] bg-[#080b08] py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#79c51c]">
              The process
            </p>

            <h2 className="mt-5 text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-5xl md:text-6xl">
              Simple from
              <br />
              <span className="text-[#79c51c]">start to finish.</span>
            </h2>
          </div>

          <div className="mt-16 grid gap-4 md:grid-cols-5">
            <ProcessCard
              number="01"
              title="Post"
              text="Tell us what needs removing, where it is and when you need it collected."
            />

            <ProcessCard
              number="02"
              title="Photos"
              text="Upload photos so drivers can understand the waste and access requirements."
            />

            <ProcessCard
              number="03"
              title="Receive bids"
              text="Approved drivers can view your job and submit their price."
            />

            <ProcessCard
              number="04"
              title="Choose"
              text="Review the available options and select your preferred driver."
            />

            <ProcessCard
              number="05"
              title="Collection"
              text="Your selected driver completes the agreed collection."
            />
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* PAYMENT */}
      {/* ========================================================= */}

      <section className="relative overflow-hidden border-b border-white/[0.06] bg-[#050705] py-24 sm:py-32">
        <div className="absolute right-[-200px] top-1/2 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-[#79c51c]/[0.05] blur-[120px]" />

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-[#79c51c]">
                Secure checkout
              </p>

              <h2 className="mt-5 text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-5xl md:text-6xl">
                Know the price.
                <br />
                <span className="text-gray-500">Then book.</span>
              </h2>

              <p className="mt-7 max-w-xl text-base leading-8 text-gray-400 sm:text-lg">
                Post your job, receive bids, choose your preferred driver and
                complete payment securely online before collection.
              </p>

              <Link
                href="/customer/post-job"
                className="mt-9 inline-flex rounded-2xl bg-[#79c51c] px-7 py-4 font-black text-black shadow-[0_15px_50px_rgba(121,197,28,0.15)] transition hover:-translate-y-1 hover:bg-[#91db32]"
              >
                START A JOB →
              </Link>
            </div>

            {/* Payment UI */}

            <div className="relative rounded-[2rem] border border-white/[0.1] bg-white/[0.025] p-5 shadow-2xl backdrop-blur-xl sm:p-8">
              <div className="absolute right-6 top-6 h-24 w-24 rounded-full bg-[#79c51c]/10 blur-3xl" />

              <div className="relative flex items-center justify-between border-b border-white/[0.08] pb-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#79c51c]/10 text-xl font-black text-[#79c51c]">
                    £
                  </div>

                  <div>
                    <p className="font-black">RCS Checkout</p>

                    <p className="mt-1 text-xs text-gray-500">
                      Secure online payment
                    </p>
                  </div>
                </div>

                <div className="rounded-full border border-[#79c51c]/20 bg-[#79c51c]/[0.06] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#79c51c]">
                  Secure
                </div>
              </div>

              <div className="pt-7">
                <PaymentStep
                  number="01"
                  title="Receive a bid"
                  text="A driver submits their price for your job."
                />

                <PaymentStep
                  number="02"
                  title="Accept the bid"
                  text="Choose the driver you want."
                />

                <PaymentStep
                  number="03"
                  title="Pay securely"
                  text="Complete checkout online."
                />

                <PaymentStep
                  number="04"
                  title="Collection"
                  text="Your selected driver completes the job."
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* DRIVER NETWORK */}
      {/* ========================================================= */}

      <section className="relative border-b border-white/[0.06] bg-[#080b08] py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <div className="order-2 lg:order-1">
              <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.09] bg-[#0b100b] p-6 shadow-2xl sm:p-8">
                <div className="absolute right-[-80px] top-[-80px] h-48 w-48 rounded-full bg-[#79c51c]/[0.06] blur-3xl" />

                <div className="relative">
                  <div className="flex items-center justify-between border-b border-white/[0.07] pb-6">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600">
                        RCS Driver Network
                      </p>

                      <p className="mt-2 text-xl font-black">
                        Application checklist
                      </p>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#79c51c]/10 text-[#79c51c]">
                      ✓
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <CheckRow text="Personal and business details" />
                    <CheckRow text="Waste carrier information" />
                    <CheckRow text="Insurance information" />
                    <CheckRow text="Vehicle information" />
                    <CheckRow text="Supporting documents" />
                  </div>

                  <div className="mt-6 rounded-xl border border-[#79c51c]/10 bg-[#79c51c]/[0.035] p-4">
                    <p className="text-xs leading-6 text-gray-500">
                      Drivers complete the application process and must be
                      approved before accessing marketplace jobs.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-[#79c51c]">
                Driver standards
              </p>

              <h2 className="mt-5 text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-5xl md:text-6xl">
                A network
                <br />
                <span className="text-gray-500">built around trust.</span>
              </h2>

              <p className="mt-7 max-w-xl text-base leading-8 text-gray-400 sm:text-lg">
                Drivers don't simply sign up and start taking marketplace
                jobs. Applications are reviewed so RCS can build a network of
                reliable waste removal businesses.
              </p>

              <Link
                href="/driver/register"
                className="mt-9 inline-flex rounded-2xl border border-[#79c51c]/50 bg-[#79c51c]/[0.04] px-7 py-4 font-black text-white transition hover:-translate-y-1 hover:border-[#79c51c] hover:bg-[#79c51c] hover:text-black"
              >
                DRIVER APPLICATION →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* WHY RCS */}
      {/* ========================================================= */}

      <section className="border-b border-white/[0.06] bg-[#050705] py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-[#79c51c]">
                Why RCS
              </p>

              <h2 className="mt-5 text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-5xl md:text-6xl">
                Waste removal,
                <br />
                <span className="text-[#79c51c]">made simpler.</span>
              </h2>

              <p className="mt-7 max-w-xl text-base leading-8 text-gray-400 sm:text-lg">
                We're building a better way to arrange waste removal. RCS
                connects customers with approved drivers while giving
                independent waste businesses another way to find work.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <InfoBox
                title="Trusted Drivers"
                text="Drivers apply and must be approved before accessing marketplace jobs."
              />

              <InfoBox
                title="More Choice"
                text="Customers can review available bids before choosing their driver."
              />

              <InfoBox
                title="Photo Details"
                text="Customers can upload photos to help drivers understand each job."
              />

              <InfoBox
                title="Secure Checkout"
                text="Accepted jobs can be paid through the online checkout."
              />
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* ABOUT */}
      {/* ========================================================= */}

      <section className="border-b border-white/[0.06] bg-[#080b08] py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.09] bg-[#0b100b] p-8 shadow-2xl sm:p-12 lg:p-16">
            <div className="absolute right-[-120px] top-[-120px] h-[350px] w-[350px] rounded-full bg-[#79c51c]/[0.07] blur-[100px]" />

            <div className="relative grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#79c51c]">
                  About Rapid Clear Solutions
                </p>

                <h2 className="mt-5 text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-5xl md:text-6xl">
                  Building the future
                  <br />
                  <span className="text-gray-500">of waste removal.</span>
                </h2>

                <p className="mt-7 max-w-2xl text-base leading-8 text-gray-400 sm:text-lg">
                  Rapid Clear Solutions is building a marketplace that
                  connects people who need waste removed with approved waste
                  removal drivers. Our goal is to make the process easier to
                  understand, easier to arrange and easier to manage from
                  start to finish.
                </p>
              </div>

              <Link
                href="/contact"
                className="inline-flex rounded-2xl border border-white/[0.12] bg-white/[0.03] px-7 py-4 text-center font-black transition hover:-translate-y-1 hover:border-[#79c51c] hover:bg-[#79c51c] hover:text-black"
              >
                CONTACT RCS
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* FINAL CTA */}
      {/* ========================================================= */}

      <section className="relative overflow-hidden bg-[#050705] py-24 sm:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(121,197,28,0.10),transparent_45%)]" />

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="relative overflow-hidden rounded-[2rem] border border-[#79c51c]/25 bg-gradient-to-br from-[#0d160c] via-[#0a1009] to-[#070907] p-8 shadow-[0_30px_100px_rgba(0,0,0,0.5)] sm:p-12 lg:p-16">
            <div className="absolute right-[-100px] top-[-150px] h-[400px] w-[400px] rounded-full bg-[#79c51c]/10 blur-[100px]" />

            <div className="absolute bottom-[-120px] left-[-100px] h-[300px] w-[300px] rounded-full bg-[#79c51c]/[0.05] blur-[100px]" />

            <div className="relative flex flex-col justify-between gap-10 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#79c51c]">
                  Rapid Clear Solutions
                </p>

                <h2 className="mt-5 text-5xl font-black uppercase leading-[0.9] tracking-tight sm:text-6xl md:text-7xl">
                  WE WANT
                  <span className="block text-[#79c51c]">YOUR WASTE.</span>
                </h2>

                <p className="mt-6 max-w-xl text-base leading-7 text-gray-400 sm:text-lg">
                  Ready to arrange your collection? Post your job and let the
                  RCS Marketplace handle the next step.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/customer/post-job"
                  className="rounded-2xl bg-[#79c51c] px-7 py-4 text-center font-black text-black shadow-[0_15px_50px_rgba(121,197,28,0.2)] transition hover:-translate-y-1 hover:bg-[#91db32]"
                >
                  POST A JOB
                </Link>

                <Link
                  href="/driver/register"
                  className="rounded-2xl border border-[#79c51c]/60 px-7 py-4 text-center font-black text-white transition hover:-translate-y-1 hover:bg-[#79c51c] hover:text-black"
                >
                  JOIN AS A DRIVER
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* FOOTER */}
      {/* ========================================================= */}

      <footer className="border-t border-white/[0.06] bg-[#020302]">
        <div className="mx-auto max-w-7xl px-6 pb-[calc(3rem+env(safe-area-inset-bottom))] pt-14">
          <div className="grid gap-12 md:grid-cols-3">
            <div>
              <Image
                src="/rapid-clear-logo.png"
                alt="Rapid Clear Solutions"
                width={220}
                height={90}
                className="h-14 w-auto object-contain"
              />

              <p className="mt-5 max-w-sm text-sm leading-7 text-gray-600">
                Connecting customers and waste removal drivers through the RCS
                Marketplace.
              </p>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white">
                Customers
              </p>

              <div className="mt-5 flex flex-col gap-3 text-sm text-gray-500">
                <Link
                  href="/customer/post-job"
                  className="transition hover:text-[#79c51c]"
                >
                  Post a Job
                </Link>

                <Link
                  href="/customer/login"
                  className="transition hover:text-[#79c51c]"
                >
                  Customer Login
                </Link>

                <Link
                  href="/quote"
                  className="transition hover:text-[#79c51c]"
                >
                  Get a Quote
                </Link>
              </div>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white">
                Rapid Clear Solutions
              </p>

              <div className="mt-5 flex flex-col gap-3 text-sm text-gray-500">
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

          <div className="mt-12 border-t border-white/[0.06] pt-6 text-xs text-gray-700">
            © {new Date().getFullYear()} Rapid Clear Solutions. All rights
            reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ========================================================= */
/* STAT */
/* ========================================================= */

function Stat({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="group relative px-5 py-7 transition hover:bg-white/[0.015] sm:px-8 sm:py-9">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black tracking-[0.2em] text-[#79c51c]">
          {number}
        </span>

        <span className="h-1.5 w-1.5 rounded-full bg-[#79c51c]/50 transition group-hover:bg-[#79c51c]" />
      </div>

      <h3 className="mt-5 text-lg font-black uppercase">{title}</h3>

      <p className="mt-2 max-w-[220px] text-xs leading-5 text-gray-600">
        {text}
      </p>
    </div>
  );
}

/* ========================================================= */
/* MARKETPLACE CARD */
/* ========================================================= */

function MarketplaceCard({
  label,
  eyebrow,
  title,
  text,
  href,
  button,
  featured = false,
}: {
  label: string;
  eyebrow: string;
  title: string;
  text: string;
  href: string;
  button: string;
  featured?: boolean;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-[2rem] border p-7 transition duration-500 hover:-translate-y-1 sm:p-9 ${
        featured
          ? "border-[#79c51c]/25 bg-gradient-to-br from-[#0e170d] to-[#0a0e0a]"
          : "border-white/[0.09] bg-white/[0.018]"
      }`}
    >
      <div className="absolute right-[-100px] top-[-100px] h-[250px] w-[250px] rounded-full bg-[#79c51c]/[0.05] blur-[80px] transition duration-500 group-hover:bg-[#79c51c]/[0.09]" />

      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="h-1 w-12 bg-[#79c51c]" />

          <span className="rounded-full border border-[#79c51c]/20 bg-[#79c51c]/[0.05] px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-[#79c51c]">
            {label}
          </span>
        </div>

        <p className="mt-9 text-xs font-black uppercase tracking-[0.2em] text-[#79c51c]">
          {eyebrow}
        </p>

        <h3 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
          {title}
        </h3>

        <p className="mt-5 max-w-xl text-sm leading-7 text-gray-500 sm:text-base">
          {text}
        </p>

        <Link
          href={href}
          className={`mt-8 inline-flex rounded-xl px-6 py-3 font-black transition duration-300 ${
            featured
              ? "bg-[#79c51c] text-black hover:bg-[#91db32]"
              : "border border-white/[0.14] text-white hover:border-[#79c51c] hover:bg-[#79c51c] hover:text-black"
          }`}
        >
          {button} →
        </Link>
      </div>
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
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0e0a] p-6 transition duration-300 hover:-translate-y-1 hover:border-[#79c51c]/30">
      <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-[#79c51c] transition-all duration-500 group-hover:w-full" />

      <div className="flex items-center justify-between">
        <p className="text-sm font-black text-[#79c51c]">{number}</p>

        <div className="h-2 w-2 rounded-full bg-white/10 transition group-hover:bg-[#79c51c]" />
      </div>

      <h3 className="mt-7 text-xl font-black uppercase">{title}</h3>

      <p className="mt-3 text-sm leading-6 text-gray-600">{text}</p>
    </div>
  );
}

/* ========================================================= */
/* PAYMENT STEP */
/* ========================================================= */

function PaymentStep({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="group flex gap-4 border-b border-white/[0.05] pb-5 last:border-0 last:pb-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#79c51c]/10 text-[10px] font-black text-[#79c51c] transition group-hover:bg-[#79c51c] group-hover:text-black">
        {number}
      </div>

      <div>
        <h4 className="font-black text-white">{title}</h4>

        <p className="mt-1 text-sm leading-6 text-gray-600">{text}</p>
      </div>
    </div>
  );
}

/* ========================================================= */
/* CHECK ROW */
/* ========================================================= */

function CheckRow({ text }: { text: string }) {
  return (
    <div className="group flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.015] px-4 py-4 transition hover:border-[#79c51c]/20">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#79c51c]/10 text-sm font-black text-[#79c51c]">
        ✓
      </div>

      <span className="text-sm font-semibold text-gray-400 transition group-hover:text-gray-200">
        {text}
      </span>
    </div>
  );
}

/* ========================================================= */
/* INFO BOX */
/* ========================================================= */

function InfoBox({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="group rounded-2xl border border-white/[0.08] bg-[#0a0e0a] p-6 transition duration-300 hover:-translate-y-1 hover:border-[#79c51c]/25">
      <div className="h-1 w-8 bg-[#79c51c] transition-all duration-300 group-hover:w-12" />

      <h3 className="mt-6 text-lg font-black uppercase">{title}</h3>

      <p className="mt-3 text-sm leading-6 text-gray-600">{text}</p>
    </div>
  );
}