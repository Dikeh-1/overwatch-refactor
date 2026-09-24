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
      {/* Hide parent layout chrome: Navbar, Footer, chat, scroll-to-top, launch experience */}
      <style>{`
        header { display: none !important; }
        footer { display: none !important; }
        [class*="ZohoChatbot"], [id*="zoho"], [id*="zsiq"] { display: none !important; }
        [class*="ScrollToTop"] { display: none !important; }
        [class*="LaunchExperience"] { display: none !important; }
        main { padding-top: 0 !important; margin-top: 0 !important; }
        body { background-color: #F6F7F9 !important; }
      `}</style>
      {children}
    </>
  );
}
