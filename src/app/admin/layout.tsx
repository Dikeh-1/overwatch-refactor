import type { Metadata } from "next";
import "../globals.css";
import "./admin.css";

export const metadata: Metadata = {
  title: "Recruitment | Overwatch",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full bg-[#090d16] text-white antialiased">
      <body className="min-h-full flex flex-col bg-[#090d16] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
