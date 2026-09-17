import type { Metadata } from "next";
import SeoLocationPage from "../seo-location-page";

export const metadata: Metadata = {
  title: "Waste Removal Wolverhampton | Rubbish Clearance",
  description:
    "Waste removal and rubbish clearance across Wolverhampton. Post your job online, upload photos and receive available quotes through the Rapid Clear Solutions Marketplace.",
  alternates: {
    canonical: "https://rapidclearsolutions.co.uk/waste-removal-wolverhampton",
  },
  openGraph: {
    title: "Waste Removal Wolverhampton | Rubbish Clearance",
    description:
      "Arrange waste removal and rubbish clearance in Wolverhampton through the Rapid Clear Solutions Marketplace.",
    url: "https://rapidclearsolutions.co.uk/waste-removal-wolverhampton",
    siteName: "Rapid Clear Solutions",
    type: "website",
    locale: "en_GB",
  },
};

export default function Page() {
  return (
    <SeoLocationPage
      city="Wolverhampton"
      title="Waste Removal Wolverhampton"
      intro="Need waste or rubbish removed in Wolverhampton? Post your collection online through Rapid Clear Solutions, provide your job details and upload photos so available RCS drivers can review the collection."
      areas={[
        "Bilston",
        "Wednesfield",
        "Tettenhall",
        "Codsall",
        "Coseley",
      ]}
    />
  );
}