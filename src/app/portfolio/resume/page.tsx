import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ExternalLink,
  FileDown,
  FileText,
  Mail,
  UserRound,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Resume | Ebube Michael UGC Video Editor",
  description:
    "View and download Ebube Michael's tailored UGC video editor resume and cover letter.",
};

const resumeHref =
  "/portfolio/docs/Ebube-Michael-UGC-Video-Editor-Resume.pdf";
const coverLetterHref =
  "/portfolio/docs/Ebube-Michael-Dialed-In-Cover-Letter.pdf";
const linkedinHref = "https://www.linkedin.com/in/ebube-michael-7911b1366/";
const portfolioHref = "https://mejforge.com/portfolio";

export default function ResumePage() {
  return (
    <main className="min-h-screen bg-[#070b10] text-white">
      <header className="border-b border-white/10 bg-[#070b10]/92 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link
            href="/portfolio"
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/14 px-3 text-sm font-black text-white/74 transition hover:border-[#38bdf8] hover:text-[#38bdf8]"
          >
            <ArrowRight size={16} className="rotate-180" aria-hidden="true" />
            Portfolio
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/portfolio/about"
              className="hidden min-h-11 items-center gap-2 rounded-md border border-white/14 px-3 text-sm font-black text-white/74 transition hover:border-[#86efac] hover:text-[#86efac] sm:inline-flex"
            >
              <UserRound size={16} aria-hidden="true" />
              About
            </Link>
            <a
              href={linkedinHref}
              target="_blank"
              rel="noopener noreferrer"
              title="View LinkedIn profile"
              className="hidden min-h-11 items-center gap-2 rounded-md border border-white/14 px-3 text-sm font-black text-white/74 transition hover:border-[#38bdf8] hover:text-[#38bdf8] md:inline-flex"
            >
              <ExternalLink size={16} aria-hidden="true" />
              LinkedIn
            </a>
            <a
              href="mailto:ebubemichael033@gmail.com"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-white/62 transition hover:text-white"
            >
              <Mail size={16} aria-hidden="true" />
              <span className="hidden sm:inline">ebubemichael033@gmail.com</span>
              <span className="sm:hidden">Email</span>
            </a>
          </div>
        </nav>
      </header>

      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
            <aside className="lg:sticky lg:top-8 lg:self-start">
              <div className="relative mb-6 h-24 w-24 overflow-hidden rounded-lg border border-white/12 bg-black">
                <Image
                  src="/portfolio/ebube-portrait.png"
                  alt="Portrait of Ebube Michael"
                  fill
                  sizes="96px"
                  className="object-cover object-[52%_25%]"
                  priority
                />
              </div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#86efac]">
                Tailored Resume
              </p>
              <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">
                Ebube Michael
              </h1>
              <p className="mt-4 text-base leading-8 text-white/68 sm:text-lg">
                UGC video editor, short-form ads creator, visual designer, and
                AI-assisted creative producer.
              </p>

              <div className="mt-7 grid gap-3">
                <a
                  href={resumeHref}
                  download
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#f97316] px-5 text-sm font-black text-[#111827] transition hover:bg-[#fb923c]"
                >
                  <FileDown size={17} aria-hidden="true" />
                  Download Resume PDF
                </a>
                <a
                  href={resumeHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-white/18 px-5 text-sm font-black text-white transition hover:border-[#38bdf8] hover:text-[#38bdf8]"
                >
                  <ExternalLink size={17} aria-hidden="true" />
                  Open Resume
                </a>
                <a
                  href={coverLetterHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-white/18 px-5 text-sm font-black text-white transition hover:border-[#86efac] hover:text-[#86efac]"
                >
                  <FileText size={17} aria-hidden="true" />
                  Open Cover Letter
                </a>
                <a
                  href={linkedinHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-white/18 px-5 text-sm font-black text-white transition hover:border-[#38bdf8] hover:text-[#38bdf8]"
                >
                  <ExternalLink size={17} aria-hidden="true" />
                  LinkedIn
                </a>
                <a
                  href={portfolioHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-white/18 px-5 text-sm font-black text-white transition hover:border-[#86efac] hover:text-[#86efac]"
                >
                  <ExternalLink size={17} aria-hidden="true" />
                  mejforge.com/portfolio
                </a>
              </div>

              <div className="mt-8 rounded-lg border border-white/12 bg-white/[0.04] p-5">
                <h2 className="text-lg font-black">Role Match</h2>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-white/68">
                  <li>Current Social Media Manager at OverwatchMoz.</li>
                  <li>UGC ads, Reels, TikTok, Shorts, and creative variants.</li>
                  <li>
                    AI workflow: ChatGPT, Google Flow, Gemini, Higgsfield AI,
                    CapCut, and Magnific Space.
                  </li>
                  <li>
                    Public portfolio link:{" "}
                    <a
                      href={portfolioHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-[#86efac] underline-offset-4 hover:underline"
                    >
                      mejforge.com/portfolio
                    </a>
                    .
                  </li>
                  <li>AI-assisted content, captions, scripts, graphics, and fast cuts.</li>
                  <li>Localized campaign messaging for English and Portuguese audiences.</li>
                </ul>
              </div>
            </aside>

            <section className="overflow-hidden rounded-lg border border-white/12 bg-[#111827]">
              <iframe
                title="Ebube Michael UGC Video Editor Resume"
                src={resumeHref}
                className="h-[78vh] w-full bg-white"
              />
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
