import type { Metadata } from "next";
import SeoLocationPage from "../seo-location-page";

export const metadata: Metadata = { title: "Waste Removal Solihull | Rubbish Removal & Clearance", description: "Waste removal and rubbish clearance across Solihull. Post your collection online through Rapid Clear Solutions and upload photos for drivers to review.", alternates: { canonical: "https://rapidclearsolutions.co.uk/waste-removal-solihull" } };

export default function Page() { return <SeoLocationPage city="Solihull" title="Waste Removal Solihull | Rubbish Removal & Clearance" intro="Waste removal and rubbish clearance across Solihull. Post your collection online through Rapid Clear Solutions and upload photos for drivers to review." areas={["Shirley", "Knowle", "Dorridge", "Olton", "Balsall Common"] } />; }

