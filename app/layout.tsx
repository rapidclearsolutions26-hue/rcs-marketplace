import type {
  Metadata,
  Viewport,
} from "next";
import "./globals.css";
import InstallPWA from "./components/pwa/InstallPWA";

export const metadata: Metadata = {
  title: "Rapid Clear Solutions",
  description:
    "Fast and reliable waste removal services.",
  applicationName:
    "Rapid Clear Solutions",
  manifest:
    "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle:
      "black-translucent",
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
        type: "image/png",
      },
    ],
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

        <div className="mx-auto max-w-5xl px-4 pb-6 sm:px-6">
          <InstallPWA />
        </div>
      </body>
    </html>
  );
}