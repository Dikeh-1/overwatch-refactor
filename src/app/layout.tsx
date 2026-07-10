import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.overwatchmoz.com"),
  title: "OverWatch Mozambique | AI CCTV Monitoring & Virtual Guard Service",
  description:
    "OverWatch Mozambique provides 24/7 AI-powered CCTV monitoring, human-verified alerts, deterrence support, and incident reporting for businesses in Mozambique.",
  applicationName: "Overwatch",
  openGraph: {
    title: "OverWatch Mozambique | AI CCTV Monitoring & Virtual Guard Service",
    description:
      "OverWatch Mozambique provides 24/7 AI-powered CCTV monitoring, human-verified alerts, deterrence support, and incident reporting for businesses in Mozambique.",
    url: "/",
    siteName: "Overwatch",
    type: "website",
    images: [
      {
        url: "/overwatch-social-preview.png",
        width: 1200,
        height: 630,
        alt: "Overwatch AI CCTV monitoring and virtual guarding",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OverWatch Mozambique | AI CCTV Monitoring & Virtual Guard Service",
    description:
      "OverWatch Mozambique provides 24/7 AI-powered CCTV monitoring, human-verified alerts, deterrence support, and incident reporting for businesses in Mozambique.",
    images: ["/overwatch-social-preview.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Overwatch",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/app-icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
