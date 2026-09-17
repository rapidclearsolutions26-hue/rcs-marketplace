import type { Metadata } from "next";
import SeoLocationPage from "../seo-location-page";

export const metadata: Metadata = { title: "Waste Removal Sandwell | Rubbish Removal & Clearance", description: "Waste removal and rubbish clearance across Sandwell and the surrounding West Midlands. Post your job online through Rapid Clear Solutions.", alternates: { canonical: "https://rapidclearsolutions.co.uk/waste-removal-sandwell" } };

export default function Page() { return <SeoLocationPage city="Sandwell" title="Waste Removal Sandwell | Rubbish Removal & Clearance" intro="Waste removal and rubbish clearance across Sandwell and the surrounding West Midlands. Post your job online through Rapid Clear Solutions." areas={["West Bromwich", "Oldbury", "Smethwick", "Tipton", "Rowley Regis"] } />; }

