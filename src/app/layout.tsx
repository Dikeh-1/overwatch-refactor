import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.overwatchmoz.com"),
  applicationName: "Overwatch",
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
