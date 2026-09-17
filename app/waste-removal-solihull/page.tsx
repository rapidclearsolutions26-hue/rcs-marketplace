import type { Metadata } from "next";
import SeoLocationPage from "../seo-location-page";

export const metadata: Metadata = {
  title: "Waste Removal Solihull | Rubbish Clearance",
  description:
    "Waste removal and rubbish clearance across Solihull. Post your job online, upload photos and receive available quotes through the Rapid Clear Solutions Marketplace.",
  alternates: {
    canonical: "https://rapidclearsolutions.co.uk/waste-removal-solihull",
  },
  openGraph: {
    title: "Waste Removal Solihull | Rubbish Clearance",
    description:
      "Arrange waste removal and rubbish clearance in Solihull through the Rapid Clear Solutions Marketplace.",
    url: "https://rapidclearsolutions.co.uk/waste-removal-solihull",
    siteName: "Rapid Clear Solutions",
    type: "website",
    locale: "en_GB",
  },
};

export default function Page() {
  return (
    <SeoLocationPage
      city="Solihull"
      title="Waste Removal Solihull"
      intro="Need waste or rubbish removed in Solihull? Post your collection online through Rapid Clear Solutions, provide your job details and upload photos so available RCS drivers can review the collection."
      areas={[
        "Shirley",
        "Knowle",
        "Dorridge",
        "Olton",
        "Balsall Common",
      ]}
    />
  );
}