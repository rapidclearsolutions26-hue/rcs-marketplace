import type { Metadata } from "next";
import SeoLocationPage from "../seo-location-page";

export const metadata: Metadata = {
  title: "Waste Removal Dudley | Rubbish Clearance",
  description:
    "Waste removal and rubbish clearance across Dudley and surrounding areas. Post your job online, upload photos and receive available quotes through the Rapid Clear Solutions Marketplace.",
  alternates: {
    canonical: "https://rapidclearsolutions.co.uk/waste-removal-dudley",
  },
  openGraph: {
    title: "Waste Removal Dudley | Rubbish Clearance",
    description:
      "Arrange waste removal and rubbish clearance in Dudley through the Rapid Clear Solutions Marketplace.",
    url: "https://rapidclearsolutions.co.uk/waste-removal-dudley",
    siteName: "Rapid Clear Solutions",
    type: "website",
    locale: "en_GB",
  },
};

export default function Page() {
  return (
    <SeoLocationPage
      city="Dudley"
      title="Waste Removal Dudley"
      intro="Need waste or rubbish removed in Dudley? Post your collection online through Rapid Clear Solutions, provide your job details and upload photos so available RCS drivers can review the collection."
      areas={[
        "Brierley Hill",
        "Halesowen",
        "Stourbridge",
        "Kingswinford",
        "Sedgley",
      ]}
    />
  );
}