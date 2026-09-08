import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#070907] text-white">

      {/* ========================================================= */}
      {/* HEADER */}
      {/* ========================================================= */}

      <header className="border-b border-[#1d251b] bg-[#070907]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">

          <Link
            href="/"
            className="shrink-0"
          >
            <Image
              src="/rapid-clear-logo.png"
              alt="Rapid Clear Solutions"
              width={220}
              height={90}
              priority
              className="h-14 w-auto object-contain sm:h-16"
            />
          </Link>

          <nav className="hidden items-center gap-8 lg:flex">

            <Link
              href="/quote"
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
              className="rounded-lg border border-[#394635] px-3 py-2.5 text-xs font-bold text-white transition hover:border-[#79c51c] sm:px-5 sm:py-3 sm:text-sm"
            >
              <span className="sm:hidden">
                Customer
              </span>

              <span className="hidden sm:inline">
                Customer Login
              </span>
            </Link>

            <Link
              href="/driver/login"
              className="rounded-lg bg-[#79c51c] px-3 py-2.5 text-xs font-bold text-black transition hover:bg-[#91db32] sm:px-5 sm:py-3 sm:text-sm"
            >
              <span className="sm:hidden">
                Driver
              </span>

              <span className="hidden sm:inline">
                Driver Login
              </span>
            </Link>

          </div>

        </div>
      </header>


      {/* ========================================================= */}
      {/* HERO */}
      {/* ========================================================= */}

      <section className="relative overflow-hidden border-b border-[#1d251b]">

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_45%,rgba(121,197,28,0.12),transparent_38%)]" />

        <div className="relative mx-auto grid min-h-[650px] max-w-7xl items-center px-6 lg:grid-cols-2">

          <div className="z-10 py-20">

            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#294026] bg-[#0b120a] px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-[#79c51c]" />

              <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#9ccc6b]">
                RCS Marketplace
              </span>
            </div>

            <p className="mb-5 text-sm font-bold uppercase tracking-[0.2em] text-[#79c51c]">
              Rapid Clear Solutions
            </p>

            <h1 className="max-w-3xl text-5xl font-black uppercase leading-[0.92] tracking-tight sm:text-6xl md:text-7xl xl:text-8xl">

              <span className="block">
                WE WANT
              </span>

              <span className="block text-[#79c51c]">
                YOUR WASTE.
              </span>

            </h1>

            <h2 className="mt-7 max-w-2xl text-2xl font-bold leading-tight text-white md:text-3xl">
              Waste removal made simple.
            </h2>

            <p className="mt-5 max-w-xl text-base leading-7 text-gray-400 md:text-lg">
              Post your waste removal job, receive bids from approved RCS
              drivers and choose the option that works for you.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">

              <Link
                href="/customer/register"
                className="rounded-xl bg-[#79c51c] px-7 py-4 text-center font-black text-black transition hover:bg-[#91db32]"
              >
                POST A JOB
              </Link>

              <Link
                href="/driver/register"
                className="rounded-xl border border-[#52694a] px-7 py-4 text-center font-black text-white transition hover:border-[#79c51c] hover:bg-[#101510]"
              >
                BECOME A DRIVER
              </Link>

            </div>

            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm text-gray-500">

              <span>
                ✓ Approved drivers
              </span>

              <span>
                ✓ Secure online payments
              </span>

              <span>
                ✓ Simple online booking
              </span>

            </div>

          </div>


          {/* TRUCK */}

          <div className="relative flex min-h-[420px] items-center justify-center lg:min-h-[650px]">

            <div className="absolute h-[420px] w-[420px] rounded-full bg-[#79c51c]/10 blur-3xl" />

            <Image
              src="/rapid-clear-solutions-removal-truck.png"
              alt="Rapid Clear Solutions removal truck"
              width={1000}
              height={700}
              priority
              className="relative z-10 w-full max-w-[720px] object-contain drop-shadow-[0_30px_70px_rgba(0,0,0,0.8)]"
            />

          </div>

        </div>

      </section>


      {/* ========================================================= */}
      {/* TRUST STRIP */}
      {/* ========================================================= */}

      <section className="border-b border-[#1d251b] bg-[#0b100b]">

        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-[#1d251b] md:grid-cols-4">

          <TrustItem
            title="Approved Drivers"
            text="Drivers apply before accessing marketplace jobs."
          />

          <TrustItem
            title="Secure Payments"
            text="Customer payments are processed online through Stripe."
          />

          <TrustItem
            title="Your Choice"
            text="Review available bids before choosing a driver."
          />

          <TrustItem
            title="Photo Details"
            text="Add photos to show drivers exactly what needs removing."
          />

        </div>

      </section>


      {/* ========================================================= */}
      {/* MARKETPLACE INTRO */}
      {/* ========================================================= */}

      <section className="border-b border-[#1d251b] bg-[#0a0d0a] py-20">

        <div className="mx-auto max-w-7xl px-6">

          <div className="max-w-3xl">

            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#79c51c]">
              The RCS Marketplace
            </p>

            <h2 className="mt-4 text-4xl font-black uppercase leading-tight md:text-5xl">
              One marketplace.
              <br />
              <span className="text-[#79c51c]">
                Customers and drivers.
              </span>
            </h2>

            <p className="mt-5 text-lg leading-8 text-gray-400">
              RCS brings customers and independent waste removal drivers
              together in one simple marketplace. Customers post jobs and
              approved drivers can view suitable work and submit bids.
            </p>

          </div>


          <div
            id="how-it-works"
            className="mt-12 grid gap-6 md:grid-cols-2"
          >

            {/* CUSTOMER */}

            <div className="rounded-2xl border border-[#283326] bg-[#0d120d] p-8 transition hover:border-[#49673b]">

              <div className="flex items-center justify-between">

                <div className="h-1 w-12 bg-[#79c51c]" />

                <span className="rounded-full border border-[#30442a] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#79c51c]">
                  Customers
                </span>

              </div>

              <p className="mt-6 text-sm font-bold uppercase tracking-widest text-[#79c51c]">
                Need waste removed?
              </p>

              <h3 className="mt-3 text-3xl font-black">
                Post your job.
              </h3>

              <p className="mt-4 leading-7 text-gray-400">
                Tell us what needs removing, upload photos and provide
                your collection details. Approved drivers can then view
                the job and submit their bids.
              </p>

              <Link
                href="/customer/register"
                className="mt-7 inline-flex rounded-xl bg-[#79c51c] px-6 py-3 font-bold text-black transition hover:bg-[#91db32]"
              >
                POST A JOB →
              </Link>

            </div>


            {/* DRIVER */}

            <div className="rounded-2xl border border-[#283326] bg-[#0d120d] p-8 transition hover:border-[#49673b]">

              <div className="flex items-center justify-between">

                <div className="h-1 w-12 bg-[#79c51c]" />

                <span className="rounded-full border border-[#30442a] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#79c51c]">
                  Drivers
                </span>

              </div>

              <p className="mt-6 text-sm font-bold uppercase tracking-widest text-[#79c51c]">
                Looking for more work?
              </p>

              <h3 className="mt-3 text-3xl font-black">
                Join the network.
              </h3>

              <p className="mt-4 leading-7 text-gray-400">
                Apply to join the RCS driver network. Once approved,
                you can view available jobs and submit bids for work
                that suits your vehicle and business.
              </p>

              <Link
                href="/driver/register"
                className="mt-7 inline-flex rounded-xl border border-[#79c51c] px-6 py-3 font-bold text-white transition hover:bg-[#79c51c] hover:text-black"
              >
                BECOME A DRIVER →
              </Link>

            </div>

          </div>

        </div>

      </section>


      {/* ========================================================= */}
      {/* HOW IT WORKS */}
      {/* ========================================================= */}

      <section className="border-b border-[#1d251b] bg-[#070907] py-20">

        <div className="mx-auto max-w-7xl px-6">

          <div className="mx-auto max-w-3xl text-center">

            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#79c51c]">
              How it works
            </p>

            <h2 className="mt-3 text-4xl font-black uppercase md:text-5xl">
              Simple from start to finish.
            </h2>

            <p className="mt-5 leading-7 text-gray-500">
              We've designed the marketplace around a straightforward
              process so you know what happens at every stage.
            </p>

          </div>


          <div className="mt-14 grid gap-5 md:grid-cols-5">

            <Step
              number="01"
              title="Post your job"
              text="Tell us what needs removing, where it is and when you need it collected."
            />

            <Step
              number="02"
              title="Add photos"
              text="Upload photos so drivers can understand the waste and access requirements."
            />

            <Step
              number="03"
              title="Receive bids"
              text="Approved RCS drivers can view your job and submit their price."
            />

            <Step
              number="04"
              title="Choose"
              text="Review the available bid and choose the driver that's right for your job."
            />

            <Step
              number="05"
              title="Collection"
              text="Your selected driver completes the collection and provides completion evidence."
            />

          </div>

        </div>

      </section>


      {/* ========================================================= */}
      {/* PAYMENT / BOOKING TRUST */}
      {/* ========================================================= */}

      <section className="border-b border-[#1d251b] bg-[#0a0d0a] py-20">

        <div className="mx-auto max-w-7xl px-6">

          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">

            <div>

              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#79c51c]">
                Clear payment process
              </p>

              <h2 className="mt-4 text-4xl font-black uppercase md:text-5xl">
                Know what happens
                <br />
                <span className="text-[#79c51c]">
                  before collection.
                </span>
              </h2>

              <p className="mt-5 max-w-xl leading-8 text-gray-400">
                RCS keeps the booking process simple. You post your job,
                drivers submit bids, you choose your preferred option and
                payment is completed securely online before the collection.
              </p>

              <div className="mt-8">

                <Link
                  href="/customer/register"
                  className="inline-flex rounded-xl bg-[#79c51c] px-6 py-3 font-black text-black transition hover:bg-[#91db32]"
                >
                  START A JOB →
                </Link>

              </div>

            </div>


            <div className="rounded-3xl border border-[#283326] bg-[#0d120d] p-7 md:p-9">

              <div className="flex items-center gap-4 border-b border-[#253124] pb-6">

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#79c51c]/10 text-[#79c51c]">
                  <span className="text-xl font-black">
                    £
                  </span>
                </div>

                <div>

                  <h3 className="font-black">
                    Secure online payment
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    Payment processed through Stripe
                  </p>

                </div>

              </div>


              <div className="space-y-6 pt-7">

                <PaymentStep
                  number="01"
                  title="Receive a bid"
                  text="A driver submits their price for your job."
                />

                <PaymentStep
                  number="02"
                  title="Accept the bid"
                  text="Choose the driver you want to carry out the collection."
                />

                <PaymentStep
                  number="03"
                  title="Pay securely"
                  text="Complete your payment through the online checkout."
                />

                <PaymentStep
                  number="04"
                  title="Collection"
                  text="Your selected driver carries out the agreed collection."
                />

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* ========================================================= */}
      {/* DRIVER APPROVAL */}
      {/* ========================================================= */}

      <section className="border-b border-[#1d251b] bg-[#070907] py-20">

        <div className="mx-auto max-w-7xl px-6">

          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">

            <div className="order-2 lg:order-1">

              <div className="rounded-3xl border border-[#283326] bg-[#0b100b] p-7 md:p-9">

                <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                  Driver application
                </p>

                <div className="mt-7 space-y-4">

                  <CheckRow text="Personal and business details" />

                  <CheckRow text="Waste carrier information" />

                  <CheckRow text="Insurance information" />

                  <CheckRow text="Vehicle information" />

                  <CheckRow text="Supporting documents" />

                </div>

                <div className="mt-7 border-t border-[#253124] pt-6">

                  <p className="text-sm leading-6 text-gray-500">
                    Drivers must complete the RCS application process
                    and be approved before accessing marketplace jobs.
                  </p>

                </div>

              </div>

            </div>


            <div className="order-1 lg:order-2">

              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#79c51c]">
                Driver standards
              </p>

              <h2 className="mt-4 text-4xl font-black uppercase md:text-5xl">
                A marketplace
                <br />
                <span className="text-[#79c51c]">
                  built around trust.
                </span>
              </h2>

              <p className="mt-5 max-w-xl leading-8 text-gray-400">
                Anyone can't simply sign up and start taking marketplace
                jobs. Drivers apply through RCS and provide information
                about themselves, their business, vehicle and relevant
                documents before they can be approved.
              </p>

              <Link
                href="/driver/register"
                className="mt-8 inline-flex rounded-xl border border-[#79c51c] px-6 py-3 font-bold text-white transition hover:bg-[#79c51c] hover:text-black"
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

      <section className="border-b border-[#1d251b] bg-[#0a0d0a] py-20">

        <div className="mx-auto max-w-7xl px-6">

          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">

            <div>

              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#79c51c]">
                Why RCS
              </p>

              <h2 className="mt-4 text-4xl font-black uppercase md:text-5xl">
                Waste removal,
                <br />
                <span className="text-[#79c51c]">
                  made simpler.
                </span>
              </h2>

              <p className="mt-5 max-w-xl leading-8 text-gray-400">
                We're building a better way to arrange waste removal.
                RCS gives customers a straightforward marketplace for
                finding available drivers while giving independent waste
                businesses another way to find work.
              </p>

            </div>


            <div className="grid gap-4 sm:grid-cols-2">

              <InfoBox
                title="Trusted Drivers"
                text="Drivers must apply and be approved before accessing marketplace jobs."
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
                text="Accepted jobs are paid through the online Stripe checkout."
              />

            </div>

          </div>

        </div>

      </section>


      {/* ========================================================= */}
      {/* ABOUT RCS */}
      {/* ========================================================= */}

      <section className="border-b border-[#1d251b] bg-[#070907] py-20">

        <div className="mx-auto max-w-7xl px-6">

          <div className="rounded-3xl border border-[#283326] bg-[#0b100b] p-8 md:p-12">

            <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">

              <div>

                <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#79c51c]">
                  About Rapid Clear Solutions
                </p>

                <h2 className="mt-4 text-4xl font-black uppercase md:text-5xl">
                  Making waste removal
                  <br />
                  <span className="text-[#79c51c]">
                    easier to arrange.
                  </span>
                </h2>

                <p className="mt-5 max-w-2xl leading-8 text-gray-400">
                  Rapid Clear Solutions is building a marketplace that
                  connects people who need waste removed with approved
                  waste removal drivers. Our goal is to make the process
                  easier to understand, easier to arrange and easier to
                  manage from start to finish.
                </p>

              </div>


              <div className="flex lg:justify-end">

                <Link
                  href="/contact"
                  className="rounded-xl border border-[#52694a] px-7 py-4 text-center font-black text-white transition hover:border-[#79c51c] hover:bg-[#79c51c] hover:text-black"
                >
                  CONTACT RCS
                </Link>

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* ========================================================= */}
      {/* FINAL CTA */}
      {/* ========================================================= */}

      <section className="bg-[#070907] py-20">

        <div className="mx-auto max-w-7xl px-6">

          <div className="relative overflow-hidden rounded-3xl border border-[#405c2d] bg-[#0d130c] p-8 md:p-12">

            <div className="absolute right-[-120px] top-[-120px] h-[300px] w-[300px] rounded-full bg-[#79c51c]/10 blur-3xl" />

            <div className="relative flex flex-col justify-between gap-8 md:flex-row md:items-end">

              <div>

                <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#79c51c]">
                  Rapid Clear Solutions
                </p>

                <h2 className="mt-4 text-4xl font-black uppercase md:text-5xl">
                  WE WANT
                  <span className="text-[#79c51c]">
                    {" "}YOUR WASTE.
                  </span>
                </h2>

                <p className="mt-4 max-w-xl text-gray-400">
                  Ready to arrange your collection? Post your job and
                  let the RCS Marketplace handle the next step.
                </p>

              </div>

              <div className="flex flex-col gap-3 sm:flex-row">

                <Link
                  href="/customer/register"
                  className="rounded-xl bg-[#79c51c] px-7 py-4 text-center font-black text-black transition hover:bg-[#91db32]"
                >
                  POST A JOB
                </Link>

                <Link
                  href="/driver/register"
                  className="rounded-xl border border-[#79c51c] px-7 py-4 text-center font-black text-white transition hover:bg-[#79c51c] hover:text-black"
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

      <footer className="border-t border-[#1d251b] bg-[#030403]">

        <div className="mx-auto max-w-7xl px-6 py-12">

          <div className="grid gap-10 md:grid-cols-3">

            {/* BRAND */}

            <div>

              <Image
                src="/rapid-clear-logo.png"
                alt="Rapid Clear Solutions"
                width={220}
                height={90}
                className="h-14 w-auto object-contain"
              />

              <p className="mt-4 max-w-sm text-sm leading-6 text-gray-600">
                Connecting customers and waste removal drivers through
                the RCS Marketplace.
              </p>

            </div>


            {/* CUSTOMERS */}

            <div>

              <p className="text-sm font-black uppercase tracking-wider text-white">
                Customers
              </p>

              <div className="mt-4 flex flex-col gap-3 text-sm text-gray-500">

                <Link
                  href="/customer/register"
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


            {/* RCS */}

            <div>

              <p className="text-sm font-black uppercase tracking-wider text-white">
                Rapid Clear Solutions
              </p>

              <div className="mt-4 flex flex-col gap-3 text-sm text-gray-500">

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


          <div className="mt-10 border-t border-[#1d251b] pt-6 text-sm text-gray-700">
            © {new Date().getFullYear()} Rapid Clear Solutions. All rights reserved.
          </div>

        </div>

      </footer>

    </main>
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
    <div className="px-5 py-6 sm:px-7">

      <div className="mb-3 h-1 w-7 bg-[#79c51c]" />

      <h3 className="text-sm font-black uppercase tracking-wide text-white">
        {title}
      </h3>

      <p className="mt-2 text-xs leading-5 text-gray-500">
        {text}
      </p>

    </div>
  );
}


/* ========================================================= */
/* STEP */
/* ========================================================= */

function Step({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-[#283326] bg-[#0b0f0b] p-6 transition hover:border-[#49673b]">

      <div className="flex items-center justify-between">

        <p className="text-sm font-black text-[#79c51c]">
          {number}
        </p>

        <div className="h-2 w-2 rounded-full bg-[#79c51c]" />

      </div>

      <h3 className="mt-5 text-xl font-black">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-6 text-gray-500">
        {text}
      </p>

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
    <div className="flex gap-4">

      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#79c51c]/10 text-xs font-black text-[#79c51c]">
        {number}
      </div>

      <div>

        <h4 className="font-bold text-white">
          {title}
        </h4>

        <p className="mt-1 text-sm leading-6 text-gray-500">
          {text}
        </p>

      </div>

    </div>
  );
}


/* ========================================================= */
/* CHECK ROW */
/* ========================================================= */

function CheckRow({
  text,
}: {
  text: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-[#202b20] bg-[#0d130d] px-4 py-4">

      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#79c51c]/10 text-sm font-black text-[#79c51c]">
        ✓
      </div>

      <span className="text-sm font-semibold text-gray-300">
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
    <div className="rounded-2xl border border-[#283326] bg-[#0b0f0b] p-6 transition hover:border-[#49673b]">

      <div className="h-1 w-8 bg-[#79c51c]" />

      <h3 className="mt-5 text-lg font-black">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-gray-500">
        {text}
      </p>

    </div>
  );
}