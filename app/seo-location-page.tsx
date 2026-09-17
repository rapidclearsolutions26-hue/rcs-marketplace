import Link from "next/link";

export default function SeoLocationPage({ city, title, intro, areas }: { city: string; title: string; intro: string; areas: string[] }) {
  return <main className="min-h-screen bg-[#050705] text-white">
    <section className="border-b border-white/[0.07]"><div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#79c51c]">Rapid Clear Solutions</p>
      <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">{title}</h1>
      <p className="mt-6 max-w-3xl text-base leading-8 text-[#87917f] sm:text-lg">{intro}</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href="/customer/post-job" className="inline-flex min-h-[54px] items-center justify-center rounded-xl bg-[#79c51c] px-7 text-sm font-black text-[#050705] hover:bg-[#91db32]">GET A QUOTE →</Link><Link href="/" className="inline-flex min-h-[54px] items-center justify-center rounded-xl border border-white/10 px-7 text-sm font-black hover:border-[#79c51c]/50">BACK TO RCS</Link></div>
    </div></section>
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <div className="grid gap-5 lg:grid-cols-3">{[["Post your job","Tell us what needs removing, add your postcode and upload photos."],["Receive quotes","Your job can be made available to drivers on the RCS Marketplace."],["Choose your collection","Review available quote information and arrange your collection."]].map(([a,b])=><article key={a} className="rounded-3xl border border-white/[0.08] bg-[#080b08] p-6"><h2 className="text-xl font-black">{a}</h2><p className="mt-3 text-sm leading-7 text-[#87917f]">{b}</p></article>)}</div>
      <div className="mt-12 max-w-4xl"><h2 className="text-3xl font-black">Waste removal in {city}</h2><p className="mt-5 text-base leading-8 text-[#87917f]">Rapid Clear Solutions provides an online way to request waste removal and clearance services in {city}. Whether you have household rubbish, garden waste, furniture, builders waste or a larger clearance, you can post the details online and upload photographs to help drivers understand the collection.</p><p className="mt-5 text-base leading-8 text-[#87917f]">The RCS Marketplace is designed to connect customers with waste-removal drivers. Availability can vary by postcode, collection date and job requirements, so posting the job online gives the marketplace the information needed for drivers to consider the collection.</p></div>
      <div className="mt-12 rounded-3xl border border-[#79c51c]/20 bg-[#080b08] p-7"><h2 className="text-2xl font-black">Areas around {city}</h2><div className="mt-5 flex flex-wrap gap-2">{areas.map(a=><span key={a} className="rounded-full border border-white/[0.08] px-4 py-2 text-sm text-[#c6d0c2]">{a}</span>)}</div></div>
      <div className="mt-12"><h2 className="text-3xl font-black">Common collections</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[["Rubbish removal","/services/rubbish-removal"],["House clearance","/services/house-clearance"],["Garden waste","/services/garden-waste-removal"],["Furniture removal","/services/furniture-removal"],["Builders waste","/services/builders-waste"]].map(([a,h])=><Link key={a} href={h} className="rounded-2xl border border-white/[0.08] bg-[#080b08] p-5 text-sm font-black hover:border-[#79c51c]/40">{a}<span className="float-right text-[#79c51c]">→</span></Link>)}</div></div>
    </section>
  </main>;
}
