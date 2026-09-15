import type { Metadata } from "next";
import "../globals.css";
import "../admin/admin.css";

export const metadata: Metadata = {
  title: "Portaria de Segurança | Overwatch",
  robots: { index: false, follow: false },
};

export default function GateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt" className="dark h-full bg-[#07080f] text-white antialiased">
      <body className="min-h-full flex flex-col bg-[#07080f] text-white antialiased selection:bg-sky-500/20 selection:text-sky-200">
        {children}
      </body>
    </html>
  );
}
