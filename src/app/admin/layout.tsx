import { Suspense } from "react";
import OverwatchOrbitLoader from "@/components/admin/ui/OverwatchOrbitLoader";
import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/shell/AdminShell";
import NavigationProgressBar from "@/components/layout/NavigationProgressBar";
import AdminLaunchExperience from "@/components/admin/ui/AdminLaunchExperience";
import "../globals.css";
import "./admin.css";

export const metadata: Metadata = {
  title: "Overwatch Admin",
  robots: { index: false, follow: false },
  other: { google: "notranslate" },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" translate="no" className="h-full antialiased notranslate">
      <body translate="no" className="min-h-full flex flex-col admin-body antialiased bg-[#F7F8FA] notranslate">
        <AdminLaunchExperience />
        <NavigationProgressBar />
        <Suspense fallback={<div role="status" className="flex min-h-screen items-center justify-center"><OverwatchOrbitLoader label="Loading admin workspace…" /></div>}>
          <AdminShell>{children}</AdminShell>
        </Suspense>
      </body>
    </html>
  );
}
