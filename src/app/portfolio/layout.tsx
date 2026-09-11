import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Ebube Michael | UGC Video Editor Portfolio",
  description:
    "Role-specific UGC ads, short-form reels, AI-assisted video content, creative graphics, resume, and cover letter for Dialed In.",
  openGraph: {
    title: "Ebube Michael | UGC Video Editor Portfolio",
    description:
      "Short-form video portfolio featuring UGC ads, AI-assisted creatives, hook variants, captions, and bilingual social content.",
    type: "website",
    images: [
      {
        url: "/portfolio/reels/english/overwatch-ai-ugc-ad-cover.jpg",
        width: 1080,
        height: 1920,
        alt: "Ebube Michael UGC video editor portfolio preview",
      },
    ],
  },
};

const themeInitScript = `
(function(){
  try {
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
    document.documentElement.style.colorScheme = "dark";
  } catch (error) {}
})();
`;

export default function PortfolioLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="dark"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full bg-[#070b10] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
