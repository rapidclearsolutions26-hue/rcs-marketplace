import type { Metadata } from "next";
import SeoLocationPage from "../seo-location-page";

export const metadata: Metadata = { title: "Waste Removal Birmingham | Rubbish Removal & Clearance", description: "Waste removal and rubbish clearance across Birmingham. Post your waste collection online through Rapid Clear Solutions and upload photos so available RCS drivers can review the job.", alternates: { canonical: "https://rapidclearsolutions.co.uk/waste-removal-birmingham" } };

export default function Page() { return <SeoLocationPage city="Birmingham" title="Waste Removal Birmingham | Rubbish Removal & Clearance" intro="Waste removal and rubbish clearance across Birmingham. Post your waste collection online through Rapid Clear Solutions and upload photos so available RCS drivers can review the job." areas={["Acocks Green", "Erdington", "Selly Oak", "Sutton Coldfield", "Kings Heath"] } />; }

