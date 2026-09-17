import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import PushNotificationSetup from "./components/notifications/PushNotificationSetup";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://rapidclearsolutions.co.uk"),

  title: {
    default: "Rapid Clear Solutions | Waste Removal",
    template: "%s | Rapid Clear Solutions",
  },

  description:
    "Rapid Clear Solutions provides waste removal, rubbish removal, house clearance, garden waste, furniture removal and builders waste services across Birmingham and the West Midlands.",

  applicationName: "Rapid Clear Solutions",

  manifest: "/manifest.webmanifest",

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },

  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "https://rapidclearsolutions.co.uk",
    siteName: "Rapid Clear Solutions",
    title: "Rapid Clear Solutions | Waste Removal",
    description:
      "Waste removal, rubbish removal, house clearance, garden waste, furniture removal and builders waste across Birmingham and the West Midlands.",
    images: [
      {
        url: "/rapid-clear-logo.png",
        width: 1200,
        height: 630,
        alt: "Rapid Clear Solutions",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Rapid Clear Solutions | Waste Removal",
    description:
      "Waste removal and clearance services across Birmingham and the West Midlands.",
    images: ["/rapid-clear-logo.png"],
  },

  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Rapid Clear",
  },

  icons: {
    icon: [
      {
        url: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],

    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
      },
    ],
  },

  formatDetection: {
    telephone: true,
    email: true,
    address: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#06100c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}

        <PushNotificationSetup />

        <Analytics />
      </body>
    </html>
  );
}