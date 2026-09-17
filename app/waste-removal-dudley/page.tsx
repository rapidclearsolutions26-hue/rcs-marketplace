import type { Metadata } from "next";
import SeoLocationPage from "../seo-location-page";

export const metadata: Metadata = { title: "Waste Removal Dudley | Rubbish Removal & Clearance", description: "Waste removal and rubbish clearance across Dudley and surrounding areas. Post your collection online through Rapid Clear Solutions and receive available driver quotes.", alternates: { canonical: "https://rapidclearsolutions.co.uk/waste-removal-dudley" } };

export default function Page() { return <SeoLocationPage city="Dudley" title="Waste Removal Dudley | Rubbish Removal & Clearance" intro="Waste removal and rubbish clearance across Dudley and surrounding areas. Post your collection online through Rapid Clear Solutions and receive available driver quotes." areas={["Brierley Hill", "Halesowen", "Stourbridge", "Kingswinford", "Sedgley"] } />; }

