import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#070907] text-white">

      {/* HEADER */}
      <header className="border-b border-[#1d251b] bg-[#070907]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

          <Link href="/">
            <Image
              src="/rapid-clear-logo.png"
              alt="Rapid Clear Solutions"
              width={220}
              height={90}
              priority
              className="h-16 w-auto object-contain"
            />
          </Link>

          <nav className="hidden items-center gap-8 lg:flex">

            <Link
              href="/quote"
              className="text-sm font-semibold text-gray-300 hover:text-[#79c51c]"
            >
              Get a Quote
            </Link>

            <Link
              href="/driver/register"
              className="text-sm font-semibold text-gray-300 hover:text-[#79c51c]"
            >
              Become a Driver
            </Link>

            <Link
              href="#how-it-works"
              className="text-sm font-semibold text-gray-300 hover:text-[#79c51c]"
            >
              How It Works
            </Link>

            <Link
              href="/contact"
              className="text-sm font-semibold text-gray-300 hover:text-[#79c51c]"
            >
              Contact
            </Link>

          </nav>

          <div className="flex items-center gap-3">

            <Link
              href="/customer/login"
              className="hidden rounded-lg border border-[#394635] px-5 py-3 text-sm font-bold text-white transition hover:border-[#79c51c] sm:block"
            >
              Customer Login
            </Link>

            <Link
              href="/driver/login"
              className="rounded-lg bg-[#79c51c] px-5 py-3 text-sm font-bold text-black transition hover:bg-[#91db32]"
            >
              Driver Login
            </Link>

          </div>

        </div>
      </header>


      {/* HERO */}
      <section className="relative overflow-hidden border-b border-[#1d251b]">

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_45%,rgba(121,197,28,0.12),transparent_38%)]" />

        <div className="relative mx-auto grid min-h-[650px] max-w-7xl items-center px-6 lg:grid-cols-2">

          {/* LEFT */}
          <div className="z-10 py-20">

            <p className="mb-5 text-sm font-bold uppercase tracking-[0.2em] text-[#79c51c]">
              Rapid Clear Solutions
            </p>

            <h1 className="max-w-3xl text-6xl font-black uppercase leading-[0.92] tracking-tight md:text-7xl xl:text-8xl">

              <span className="block">
                WE WANT
              </span>

              <span className="block text-[#79c51c]">
                YOUR WASTE.
              </span>

            </h1>

            <h2 className="mt-7 max-w-2xl text-2xl font-bold leading-tight text-white md:text-3xl">
              Connecting customers with trusted waste removal drivers.
            </h2>

            <p className="mt-5 max-w-xl text-base leading-7 text-gray-400 md:text-lg">
              Post your waste removal job and connect with available
              drivers in the RCS Marketplace. Simple for customers.
              More opportunities for drivers.
            </p>


            {/* BUTTONS */}
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
                ✓ Simple online booking
              </span>

              <span>
                ✓ UK waste removal
              </span>

            </div>

          </div>


          {/* TRUCK */}
          <div className="relative flex min-h-[480px] items-center justify-center lg:min-h-[650px]">

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


      {/* MARKETPLACE INTRO */}
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
              RCS brings the two sides of waste removal together.
              Customers can post jobs, while approved drivers can
              find work and submit bids.
            </p>

          </div>


          {/* TWO SIDES */}
          <div
            id="how-it-works"
            className="mt-12 grid gap-6 md:grid-cols-2"
          >

            {/* CUSTOMER */}
            <div className="rounded-2xl border border-[#283326] bg-[#0d120d] p-8">

              <div className="h-1 w-12 bg-[#79c51c]" />

              <p className="mt-6 text-sm font-bold uppercase tracking-widest text-[#79c51c]">
                Customers
              </p>

              <h3 className="mt-3 text-3xl font-black">
                Need waste removed?
              </h3>

              <p className="mt-4 leading-7 text-gray-400">
                Create an account, post your job and provide the
                details of what needs collecting. Drivers on the
                marketplace can then see the job and submit their bids.
              </p>

              <Link
                href="/customer/register"
                className="mt-7 inline-flex rounded-xl bg-[#79c51c] px-6 py-3 font-bold text-black transition hover:bg-[#91db32]"
              >
                POST A JOB →
              </Link>

            </div>


            {/* DRIVER */}
            <div className="rounded-2xl border border-[#283326] bg-[#0d120d] p-8">

              <div className="h-1 w-12 bg-[#79c51c]" />

              <p className="mt-6 text-sm font-bold uppercase tracking-widest text-[#79c51c]">
                Drivers
              </p>

              <h3 className="mt-3 text-3xl font-black">
                Looking for more work?
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


      {/* HOW IT WORKS */}
      <section className="border-b border-[#1d251b] bg-[#070907] py-20">

        <div className="mx-auto max-w-7xl px-6">

          <div className="text-center">

            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#79c51c]">
              How it works
            </p>

            <h2 className="mt-3 text-4xl font-black uppercase md:text-5xl">
              Simple from start to finish.
            </h2>

          </div>


          <div className="mt-14 grid gap-5 md:grid-cols-3">

            <Step
              number="01"
              title="Post your job"
              text="Tell us what needs removing, where it is and when you need it collected."
            />

            <Step
              number="02"
              title="Drivers bid"
              text="Approved RCS drivers can view available jobs and submit their price."
            />

            <Step
              number="03"
              title="Choose your driver"
              text="Review the available bid and accept the driver that's right for your job."
            />

          </div>

        </div>

      </section>


      {/* WHY RCS */}
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
                RCS gives customers access to a growing network of
                drivers while giving independent waste businesses
                another way to find work.
              </p>

            </div>


            <div className="grid gap-4 sm:grid-cols-2">

              <InfoBox
                title="Trusted Drivers"
                text="Every driver must apply and be approved before accessing marketplace jobs."
              />

              <InfoBox
                title="More Choice"
                text="Customers can receive bids from drivers available for their job."
              />

              <InfoBox
                title="Built for Drivers"
                text="Find jobs that match your vehicle, location and availability."
              />

              <InfoBox
                title="Growing Network"
                text="RCS is building a marketplace connecting waste customers and drivers."
              />

            </div>

          </div>

        </div>

      </section>


      {/* FINAL CTA */}
      <section className="bg-[#070907] py-20">

        <div className="mx-auto max-w-7xl px-6">

          <div className="rounded-3xl border border-[#405c2d] bg-[#0d130c] p-8 md:p-12">

            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#79c51c]">
              Rapid Clear Solutions
            </p>

            <div className="mt-4 flex flex-col justify-between gap-8 md:flex-row md:items-end">

              <div>

                <h2 className="text-4xl font-black uppercase md:text-5xl">
                  WE WANT
                  <span className="text-[#79c51c]">
                    {" "}YOUR WASTE.
                  </span>
                </h2>

                <p className="mt-4 max-w-xl text-gray-400">
                  Post your waste removal job or join the RCS driver
                  marketplace today.
                </p>

              </div>

              <div className="flex flex-col gap-3 sm:flex-row">

                <Link
                  href="/customer/register"
                  className="rounded-xl bg-[#79c51c] px-7 py-4 text-center font-black text-black hover:bg-[#91db32]"
                >
                  POST A JOB
                </Link>

                <Link
                  href="/driver/register"
                  className="rounded-xl border border-[#79c51c] px-7 py-4 text-center font-black text-white hover:bg-[#79c51c] hover:text-black"
                >
                  JOIN AS A DRIVER
                </Link>

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* FOOTER */}
      <footer className="border-t border-[#1d251b] bg-[#030403]">

        <div className="mx-auto max-w-7xl px-6 py-12">

          <div className="flex flex-col justify-between gap-8 md:flex-row">

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


            <div className="flex flex-wrap gap-x-10 gap-y-4 text-sm text-gray-500">

              <Link
                href="/customer/register"
                className="hover:text-white"
              >
                Post a Job
              </Link>

              <Link
                href="/customer/login"
                className="hover:text-white"
              >
                Customer Login
              </Link>

              <Link
                href="/driver/register"
                className="hover:text-white"
              >
                Become a Driver
              </Link>

              <Link
                href="/driver/login"
                className="hover:text-white"
              >
                Driver Login
              </Link>

              <Link
                href="/contact"
                className="hover:text-white"
              >
                Contact
              </Link>

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


/* ============================= */
/* STEP                          */
/* ============================= */

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
    <div className="rounded-2xl border border-[#283326] bg-[#0b0f0b] p-7">

      <p className="text-sm font-black text-[#79c51c]">
        {number}
      </p>

      <h3 className="mt-5 text-2xl font-black">
        {title}
      </h3>

      <p className="mt-3 leading-7 text-gray-500">
        {text}
      </p>

    </div>
  );
}


/* ============================= */
/* INFO BOX                      */
/* ============================= */

function InfoBox({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-[#283326] bg-[#0b0f0b] p-6">

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