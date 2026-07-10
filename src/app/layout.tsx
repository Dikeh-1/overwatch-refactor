import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.overwatchmoz.com"),
  title: "Overwatch | AI CCTV Monitoring & Virtual Guarding",
  description:
    "Turn existing CCTV into 24/7 active security. Overwatch helps businesses detect intrusions, suspicious activity, and site risks in real time.",
  applicationName: "Overwatch",
  openGraph: {
    title: "Overwatch | AI CCTV Monitoring & Virtual Guarding",
    description:
      "Turn existing CCTV into 24/7 active security. Overwatch helps businesses detect intrusions, suspicious activity, and site risks in real time.",
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
    title: "Overwatch | AI CCTV Monitoring & Virtual Guarding",
    description:
      "Turn existing CCTV into 24/7 active security. Overwatch helps businesses detect intrusions, suspicious activity, and site risks in real time.",
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
