import React from "react";

/**
 * Dedicated layout for the candidate response page.
 * Hides the public-site Navbar, Footer, and all floating widgets
 * so the page renders as a clean standalone confirmation flow.
 */
export default function NextPhaseTokenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`
        header:not(.portal-header) { display: none !important; }
        footer:not(.portal-footer) { display: none !important; }
        [class*="ZohoChatbot"], [id*="zoho"], [id*="zsiq"], [class*="zsiq"] { display: none !important; }
        [class*="ScrollToTop"] { display: none !important; }
        [class*="LaunchExperience"] { display: none !important; }
        main { padding-top: 0 !important; margin-top: 0 !important; }
        body { background-color: #f6f7f9 !important; }

        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          html, body { background: #ffffff !important; color: #1a1a2e !important; }
          header, footer, nav, iframe, .no-print, [id*="zsiq"], [class*="zsiq"], [id*="zoho"] { display: none !important; }
          .portal-root { background: #ffffff !important; min-height: 0 !important; }
          .portal-body { padding: 0 !important; max-width: none !important; }
          .print-slip { border: 1px solid #d4d6dc !important; box-shadow: none !important; page-break-inside: avoid !important; break-inside: avoid !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
      {children}
    </>
  );
}
