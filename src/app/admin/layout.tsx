import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/shell/AdminShell";
import "../globals.css";
import "./admin.css";

export const metadata: Metadata = {
  title: "Overwatch Admin",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col admin-body antialiased bg-[#F7F8FA]">
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
