import type { Metadata, Viewport } from "next";
import { DM_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { PwaProvider } from "@/components/providers/PwaProvider";
import { ToastProvider } from "@/components/ui/Toast";

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "Feedwise — doomscroll, but wiser",
    template: "%s · Feedwise",
  },
  description:
    "A calm, endless feed of ideas from the best engineering essays. Built to turn mindless scrolling into something worth remembering.",
  applicationName: "Feedwise",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Feedwise",
  },
  icons: {
    icon: [
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    title: "Feedwise — doomscroll, but wiser",
    description: "An endless feed of ideas worth remembering, pulled from the best engineering essays.",
    type: "website",
    siteName: "Feedwise",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Feedwise — doomscroll, but wiser.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Feedwise — doomscroll, but wiser",
    description: "An endless feed of ideas worth remembering.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#08080a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body className="min-h-dvh bg-ink text-cream antialiased">
        <ToastProvider>
          <PwaProvider>{children}</PwaProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
