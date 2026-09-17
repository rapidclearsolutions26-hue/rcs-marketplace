import type { Metadata } from "next";
import SeoLocationPage from "../seo-location-page";

export const metadata: Metadata = {
  title: "Waste Removal Walsall | Rubbish Clearance",
  description:
    "Waste removal and rubbish clearance across Walsall. Post your job online, upload photos and receive available quotes through the Rapid Clear Solutions Marketplace.",
  alternates: {
    canonical: "https://rapidclearsolutions.co.uk/waste-removal-walsall",
  },
  openGraph: {
    title: "Waste Removal Walsall | Rubbish Clearance",
    description:
      "Arrange waste removal and rubbish clearance in Walsall through the Rapid Clear Solutions Marketplace.",
    url: "https://rapidclearsolutions.co.uk/waste-removal-walsall",
    siteName: "Rapid Clear Solutions",
    type: "website",
    locale: "en_GB",
  },
};

export default function Page() {
  return (
    <SeoLocationPage
      city="Walsall"
      title="Waste Removal Walsall"
      intro="Need waste or rubbish removed in Walsall? Post your collection online through Rapid Clear Solutions, provide your job details and upload photos so available RCS drivers can review the collection."
      areas={[
        "Aldridge",
        "Brownhills",
        "Bloxwich",
        "Willenhall",
        "Pelsall",
      ]}
    />
  );
}