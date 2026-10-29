export default function NextPhaseTokenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          html, body { background: #ffffff !important; color: #0b1329 !important; }
          header, footer, nav, iframe, .no-print, [id*="zsiq"], [class*="zsiq"], [id*="zoho"] { display: none !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
      <div className="pt-20 sm:pt-28 pb-16">
        {children}
      </div>
    </>
  );
}
