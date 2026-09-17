import type { Metadata } from "next";
import SeoLocationPage from "../seo-location-page";

export const metadata: Metadata = { title: "Waste Removal Wolverhampton | Rubbish Removal & Clearance", description: "Waste removal and rubbish clearance across Wolverhampton. Post your collection online through Rapid Clear Solutions and make the job available to RCS drivers.", alternates: { canonical: "https://rapidclearsolutions.co.uk/waste-removal-wolverhampton" } };

export default function Page() { return <SeoLocationPage city="Wolverhampton" title="Waste Removal Wolverhampton | Rubbish Removal & Clearance" intro="Waste removal and rubbish clearance across Wolverhampton. Post your collection online through Rapid Clear Solutions and make the job available to RCS drivers." areas={["Bilston", "Wednesfield", "Tettenhall", "Codsall", "Coseley"] } />; }

