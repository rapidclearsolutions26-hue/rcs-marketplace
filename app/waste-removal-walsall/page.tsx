import type { Metadata } from "next";
import SeoLocationPage from "../seo-location-page";

export const metadata: Metadata = { title: "Waste Removal Walsall | Rubbish Removal & Clearance", description: "Waste removal and rubbish clearance across Walsall. Post your collection online through Rapid Clear Solutions and upload photos of the waste.", alternates: { canonical: "https://rapidclearsolutions.co.uk/waste-removal-walsall" } };

export default function Page() { return <SeoLocationPage city="Walsall" title="Waste Removal Walsall | Rubbish Removal & Clearance" intro="Waste removal and rubbish clearance across Walsall. Post your collection online through Rapid Clear Solutions and upload photos of the waste." areas={["Aldridge", "Brownhills", "Bloxwich", "Willenhall", "Pelsall"] } />; }

