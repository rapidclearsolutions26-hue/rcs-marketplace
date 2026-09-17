import type { Metadata } from "next";
import SeoLocationPage from "../seo-location-page";

export const metadata: Metadata = {
  title: "Waste Removal Sandwell | Rubbish Clearance",
  description:
    "Waste removal and rubbish clearance across Sandwell and surrounding West Midlands areas. Post your job online, upload photos and receive available quotes through the Rapid Clear Solutions Marketplace.",
  alternates: {
    canonical: "https://rapidclearsolutions.co.uk/waste-removal-sandwell",
  },
  openGraph: {
    title: "Waste Removal Sandwell | Rubbish Clearance",
    description:
      "Arrange waste removal and rubbish clearance in Sandwell through the Rapid Clear Solutions Marketplace.",
    url: "https://rapidclearsolutions.co.uk/waste-removal-sandwell",
    siteName: "Rapid Clear Solutions",
    type: "website",
    locale: "en_GB",
  },
};

export default function Page() {
  return (
    <SeoLocationPage
      city="Sandwell"
      title="Waste Removal Sandwell"
      intro="Need waste or rubbish removed in Sandwell? Post your collection online through Rapid Clear Solutions, provide your job details and upload photos so available RCS drivers can review the collection."
      areas={[
        "West Bromwich",
        "Oldbury",
        "Smethwick",
        "Tipton",
        "Rowley Regis",
      ]}
    />
  );
}