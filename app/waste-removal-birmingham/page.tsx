
import type { Metadata } from "next";
import SeoLocationPage from "../seo-location-page";

export const metadata: Metadata = {
  title: "Waste Removal Birmingham | Rubbish Clearance",
  description:
    "Waste removal and rubbish clearance across Birmingham. Post your job online, upload photos and receive available quotes through the Rapid Clear Solutions Marketplace.",
  alternates: {
    canonical: "https://rapidclearsolutions.co.uk/waste-removal-birmingham",
  },
  openGraph: {
    title: "Waste Removal Birmingham | Rubbish Clearance",
    description:
      "Arrange waste removal and rubbish clearance in Birmingham through the Rapid Clear Solutions Marketplace.",
    url: "https://rapidclearsolutions.co.uk/waste-removal-birmingham",
    siteName: "Rapid Clear Solutions",
    type: "website",
    locale: "en_GB",
  },
};

export default function Page() {
  return (
    <SeoLocationPage
      city="Birmingham"
      title="Waste Removal Birmingham"
      intro="Need waste or rubbish removed in Birmingham? Post your collection online through Rapid Clear Solutions, provide your job details and upload photos so available RCS drivers can review the collection."
      areas={[
        "Acocks Green",
        "Erdington",
        "Selly Oak",
        "Sutton Coldfield",
        "Kings Heath",
      ]}
    />
  );
}