import type { Metadata } from "next";
import "../globals.css";

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
    <html lang="pt" className="dark h-full bg-[#07090e] text-white antialiased">
      <body className="min-h-full flex flex-col bg-[#07090e] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
