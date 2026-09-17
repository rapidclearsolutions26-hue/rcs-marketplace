
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Garden Waste Removal Birmingham & West Midlands",
  description:
    "Garden waste removal across Birmingham and the West Midlands. Remove branches, grass cuttings, soil, garden furniture and outdoor waste through the Rapid Clear Solutions Marketplace.",
  alternates: {
    canonical:
      "https://rapidclearsolutions.co.uk/services/garden-waste-removal",
  },
  openGraph: {
    title: "Garden Waste Removal Birmingham & West Midlands",
    description:
      "Post your garden waste collection, upload photos and receive available quotes through the Rapid Clear Solutions Marketplace.",
    url: "https://rapidclearsolutions.co.uk/services/garden-waste-removal",
    siteName: "Rapid Clear Solutions",
    type: "website",
    locale: "en_GB",
  },
};

const wasteTypes = [
  "Branches & cuttings",
  "Grass & garden waste",
  "Soil & outdoor waste",
  "Garden furniture",
];

const steps = [
  {
    title: "Tell us what needs removing",
    description:
      "Add your collection details, postcode and information about the garden waste that needs clearing.",
  },
  {
    title: "Upload photos",
    description:
      "Photos help drivers understand the amount and type of garden waste involved.",
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
            Garden waste removal
            <span className="block text-[#79c51c]">
              Birmingham &amp; West Midlands
            </span>
          </h1>

          <p className="mt-6 max-w-3xl text-base leading-8 text-gray-400 sm:text-lg">
            Need garden waste cleared? Post your collection through Rapid
            Clear Solutions, provide the details of the waste and upload
            photos. Your job can then be reviewed by drivers on the RCS
            Marketplace.
          </p>

          <Link
            href="/customer/post-job"
            className="mt-8 inline-flex min-h-[54px] items-center justify-center rounded-xl bg-[#79c51c] px-7 text-sm font-black text-black transition hover:bg-[#91db32]"
          >
            GET A QUOTE →
          </Link>
        </div>
      </section>

      {/* TYPES */}
      <section className="bg-[#080b08]">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#79c51c]">
            Garden waste
          </p>

          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            What can be collected?
          </h2>

          <p className="mt-5 max-w-3xl text-base leading-8 text-gray-400">
            Garden clearances can involve different types of outdoor waste.
            Add as much information as possible when posting your job so
            drivers can understand the collection requirements.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {wasteTypes.map((item) => (
              <article
                key={item}
                className="rounded-2xl border border-white/[0.08] bg-[#0a0e0a] p-5"
              >
                <p className="font-bold text-gray-300">{item}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-t border-white/[0.07] bg-[#050705]">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#79c51c]">
            How it works
          </p>

          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Arrange your garden waste collection
          </h2>

          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {steps.map((step, index) => (
              <article
                key={step.title}
                className="rounded-3xl border border-white/[0.08] bg-[#080b08] p-6"
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

      {/* AREAS */}
      <section className="border-t border-white/[0.07] bg-[#080b08]">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#79c51c]">
            Areas we cover
          </p>

          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Garden waste removal across the West Midlands
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
      <section className="border-t border-white/[0.07] bg-[#050705]">
        <div className="mx-auto max-w-4xl px-5 py-20 text-center sm:px-6 sm:py-28">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#79c51c]">
            Get started
          </p>

          <h2 className="mt-5 text-4xl font-black uppercase leading-[0.92] tracking-[-0.04em] sm:text-6xl">
            Got garden waste?
            <span className="block text-[#79c51c]">
              Let&apos;s clear it.
            </span>
          </h2>

          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-gray-500">
            Post your garden waste collection in minutes and provide the
            details drivers need to quote for the job.
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