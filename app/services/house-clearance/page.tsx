import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "House Clearance Birmingham & West Midlands",
  description:
    "House clearance across Birmingham and the West Midlands. Clear unwanted furniture, household items and general waste by posting your job through the Rapid Clear Solutions Marketplace.",
  alternates: {
    canonical:
      "https://rapidclearsolutions.co.uk/services/house-clearance",
  },
  openGraph: {
    title: "House Clearance Birmingham & West Midlands",
    description:
      "Post your house clearance job, upload photos and receive available quotes through the Rapid Clear Solutions Marketplace.",
    url: "https://rapidclearsolutions.co.uk/services/house-clearance",
    siteName: "Rapid Clear Solutions",
    type: "website",
    locale: "en_GB",
  },
};

const steps = [
  {
    title: "Tell us what needs clearing",
    description:
      "Add your property details, postcode and information about the furniture, household items or waste that needs removing.",
  },
  {
    title: "Upload photos",
    description:
      "Photos help drivers understand the amount and type of items involved in your house clearance.",
  },
  {
    title: "Receive available quotes",
    description:
      "Your job can be reviewed by drivers on the RCS Marketplace and you can choose a suitable quote.",
  },
];

export default function Page() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050705] text-white">
      {/* HERO */}
      <section className="border-b border-white/[0.07]">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#79c51c]">
            Rapid Clear Solutions
          </p>

          <h1 className="mt-4 max-w-4xl text-4xl font-black uppercase leading-[0.95] tracking-[-0.04em] sm:text-6xl">
            House clearance
            <span className="block text-[#79c51c]">
              Birmingham &amp; West Midlands
            </span>
          </h1>

          <p className="mt-6 max-w-3xl text-base leading-8 text-gray-400 sm:text-lg">
            Need a house cleared? Post your job through Rapid Clear
            Solutions, provide the collection details and upload photos of
            the items that need removing. Your job can then be reviewed by
            drivers on the RCS Marketplace.
          </p>

          <Link
            href="/customer/post-job"
            className="mt-8 inline-flex min-h-[54px] items-center justify-center rounded-xl bg-[#79c51c] px-7 text-sm font-black text-black transition hover:bg-[#91db32]"
          >
            GET A QUOTE →
          </Link>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-[#080b08]">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#79c51c]">
              House clearance
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              Arrange your clearance online
            </h2>

            <p className="mt-5 text-base leading-8 text-gray-400">
              From unwanted furniture and household contents to general
              rubbish, you can provide the details of your clearance online
              and give drivers the information they need to understand the
              collection.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {steps.map((step, index) => (
              <article
                key={step.title}
                className="rounded-3xl border border-white/[0.08] bg-[#0a0e0a] p-6"
              >
                <p className="text-xs font-black tracking-[0.15em] text-[#79c51c]">
                  0{index + 1}
                </p>

                <h3 className="mt-4 text-lg font-black">
                  {step.title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-gray-500">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* TYPES OF CLEARANCE */}
      <section className="border-t border-white/[0.07] bg-[#050705]">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#79c51c]">
            What can be cleared
          </p>

          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            House clearance for different requirements
          </h2>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              "Unwanted furniture",
              "Household items",
              "General rubbish",
              "Property clearances",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/[0.08] bg-[#080b08] p-5"
              >
                <p className="font-bold text-gray-300">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AREAS */}
      <section className="border-t border-white/[0.07] bg-[#080b08]">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#79c51c]">
            Areas we cover
          </p>

          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            House clearance across the West Midlands
          </h2>

          <p className="mt-5 max-w-3xl text-base leading-8 text-gray-500">
            Rapid Clear Solutions is building a network of waste-removal
            drivers across the region. Availability can depend on the drivers
            operating in your area.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {[
              "Birmingham",
              "Dudley",
              "Wolverhampton",
              "Walsall",
              "Sandwell",
              "Solihull",
            ].map((area) => (
              <span
                key={area}
                className="rounded-full border border-white/[0.08] bg-[#050705] px-4 py-2 text-sm font-bold text-gray-300"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/[0.07] bg-[#080b08]">
        <div className="mx-auto max-w-4xl px-5 py-20 text-center sm:px-6 sm:py-28">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#79c51c]">
            Get started
          </p>

          <h2 className="mt-5 text-4xl font-black uppercase leading-[0.92] tracking-[-0.04em] sm:text-6xl">
            Need a house
            <span className="block text-[#79c51c]">
              cleared?
            </span>
          </h2>

          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-gray-500">
            Post your house clearance job in minutes and provide the details
            drivers need to quote for your collection.
          </p>

          <Link
            href="/customer/post-job"
            className="mt-8 inline-flex rounded-xl bg-[#79c51c] px-8 py-4 text-sm font-black text-black transition hover:bg-[#91db32]"
          >
            GET A QUOTE →
          </Link>
        </div>
      </section>
    </main>
  );
}