import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  BriefcaseBusiness,
  Captions,
  Clapperboard,
  ExternalLink,
  FileDown,
  FileText,
  Languages,
  Mail,
  MessageSquare,
  SquarePlay,
} from "lucide-react";
import ScrollReveal from "@/components/portfolio/ScrollReveal";

export const metadata: Metadata = {
  title: "About Ebube Michael | UGC Video Editor",
  description:
    "About Ebube Michael, a UGC video editor and AI-assisted short-form creative producer.",
};

const resumeHref =
  "/portfolio/docs/Ebube-Michael-UGC-Video-Editor-Resume.pdf";
const coverLetterHref =
  "/portfolio/docs/Ebube-Michael-Dialed-In-Cover-Letter.pdf";
const linkedinHref = "https://www.linkedin.com/in/ebube-michael-7911b1366/";
const portfolioHref = "https://mejforge.com/portfolio";

const fitCards = [
  {
    title: "Short-Form First",
    body: "Builds for the first three seconds: hook, pace, subtitle rhythm, and a clear next action.",
    icon: Clapperboard,
  },
  {
    title: "AI Creative Production",
    body: "Uses ChatGPT, Google Flow, Gemini, Higgsfield AI, CapCut, and Magnific Space to move from storyline to generated visuals and finished edits.",
    icon: BrainCircuit,
  },
  {
    title: "Social Strategy",
    body: "Plans content, scripts, captions, carousels, Reels, and campaign messaging across social channels.",
    icon: MessageSquare,
  },
  {
    title: "Localized Messaging",
    body: "Creates English and Portuguese-facing content with market-aware phrasing and customer clarity.",
    icon: Languages,
  },
];

const timeline = [
  {
    role: "Social Media Manager",
    company: "OverwatchMoz",
    period: "Mar 2026 - Present",
    body:
      "Manages content for a security technology company focused on intelligent CCTV monitoring and virtual guarding. Produces branded graphics, carousels, Reels, AI-assisted visual concepts, scripts, captions, and campaign messaging.",
  },
  {
    role: "Social Media Content Manager & Visual Designer",
    company: "Wamina",
    period: "Oct 2025 - Present",
    body:
      "Creates social visuals and short-form content with a focus on consistent brand presentation, audience engagement, and practical campaign output.",
  },
  {
    role: "Freelance Video Editor & Creative Designer",
    company: "Independent",
    period: "Project-based",
    body:
      "Edits social videos, builds graphics, and develops creative directions for online campaigns, portfolio work, and digital brand assets.",
  },
];

const workingStyle = [
  "I look for the hook before I polish the edit.",
  "I make captions readable on mobile and paced for fast scrolling.",
  "I create variations so the team can test angles instead of guessing.",
  "I can follow direction closely while still suggesting stronger creative options.",
];

const tools = [
  "ChatGPT",
  "Google Flow",
  "Gemini",
  "Higgsfield AI",
  "Magnific Space (formerly Freepik AI)",
  "CapCut",
  "Canva",
  "Premiere Pro",
  "After Effects",
  "Meta Business Suite",
  "Notion",
  "Slack",
];

export default function AboutPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#070b10] text-white">
      <AboutNav />
      <section className="px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <ScrollReveal className="relative order-2 mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-lg border border-white/12 bg-black shadow-2xl shadow-black/40 lg:order-1 lg:mx-0">
            <Image
              src="/portfolio/ebube-portrait.png"
              alt="Portrait of Ebube Michael"
              fill
              sizes="(max-width: 768px) 90vw, 410px"
              className="object-cover object-[52%_25%]"
              priority
            />
            <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(transparent,rgba(7,11,16,0.94))] px-5 pb-5 pt-28">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#86efac]">
                UGC Video Editor
              </p>
              <p className="mt-2 text-xl font-black">Ebube Junior Michael</p>
              <p className="mt-2 text-sm leading-6 text-white/68">
                Short-form ads, AI-assisted concepts, captions, graphics, and
                social creative systems.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.08} className="order-1 lg:order-2">
            <p className="inline-flex rounded-md border border-[#38bdf8]/35 bg-[#38bdf8]/10 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#7dd3fc]">
              About Me
            </p>
            <h1 className="mt-6 max-w-4xl text-3xl font-black leading-[1.06] sm:text-5xl">
              I create practical short-form ads that are built to be watched,
              tested, and improved.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-white/70 sm:text-lg">
              I am a social media manager, video editor, and visual designer
              focused on short-form content. My current work at OverwatchMoz
              gives me daily practice turning technical services into clear
              creative assets: Reels, graphics, captions, scripts, campaign
              concepts, localized messaging, and AI-assisted visuals.
            </p>
            <p className="mt-4 max-w-3xl text-base leading-8 text-white/70">
              What makes me useful for Dialed In is the mix: I understand social
              pacing, I can create visual assets, I use ChatGPT for storylines
              and image generation, and I can bring Google Flow, Gemini,
              Higgsfield AI, CapCut, and Magnific Space into a fast creative
              testing loop.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/portfolio#reels"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#f97316] px-5 text-sm font-black text-[#111827] transition hover:bg-[#fb923c]"
              >
                <SquarePlay size={17} aria-hidden="true" />
                Watch My Reels
              </Link>
              <Link
                href="/portfolio/resume"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-white/18 px-5 text-sm font-black text-white transition hover:border-[#38bdf8] hover:text-[#38bdf8]"
              >
                <FileText size={17} aria-hidden="true" />
                Resume Page
              </Link>
              <a
                href={linkedinHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-white/18 px-5 text-sm font-black text-white transition hover:border-[#86efac] hover:text-[#86efac]"
              >
                <ExternalLink size={17} aria-hidden="true" />
                LinkedIn
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="bg-[#f8fafc] px-4 py-16 text-[#111827] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#f97316]">
              Why I Fit
            </p>
            <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight text-[#13254b] sm:text-4xl">
              A creator profile aligned with daily UGC production.
            </h2>
          </ScrollReveal>

          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {fitCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <ScrollReveal
                  key={card.title}
                  delay={index * 0.05}
                  className="rounded-lg border border-[#d7dde8] bg-white p-5"
                >
                  <Icon size={24} className="text-[#0f766e]" aria-hidden="true" />
                  <h3 className="mt-5 text-lg font-black text-[#13254b]">
                    {card.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[#4b5563]">
                    {card.body}
                  </p>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 text-[#111827] sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.08fr_0.92fr]">
          <ScrollReveal>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0f766e]">
              Experience
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#13254b] sm:text-4xl">
              Current work that maps directly to the role.
            </h2>
            <div className="mt-8 space-y-4">
              {timeline.map((item) => (
                <article
                  key={`${item.role}-${item.company}`}
                  className="rounded-lg border border-[#d7dde8] bg-[#f8fafc] p-5"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-xl font-black text-[#13254b]">
                        {item.role}
                      </h3>
                      <p className="mt-1 text-sm font-bold text-[#0f766e]">
                        {item.company}
                      </p>
                    </div>
                    <p className="text-sm font-black uppercase tracking-[0.12em] text-[#f97316]">
                      {item.period}
                    </p>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-[#4b5563]">
                    {item.body}
                  </p>
                </article>
              ))}
            </div>
          </ScrollReveal>

          <div className="space-y-4">
            <ScrollReveal
              delay={0.08}
              className="rounded-lg border border-[#d7dde8] bg-[#f8fafc] p-5"
            >
              <BriefcaseBusiness
                size={24}
                className="text-[#0f766e]"
                aria-hidden="true"
              />
              <h3 className="mt-5 text-xl font-black text-[#13254b]">
                Working Style
              </h3>
              <div className="mt-5 grid gap-3">
                {workingStyle.map((item) => (
                  <div key={item} className="flex gap-2 text-sm leading-6 text-[#4b5563]">
                    <BadgeCheck
                      size={17}
                      className="mt-1 shrink-0 text-[#0f766e]"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </ScrollReveal>

            <ScrollReveal
              delay={0.12}
              className="rounded-lg border border-[#d7dde8] bg-[#f8fafc] p-5"
            >
              <Captions size={24} className="text-[#0f766e]" aria-hidden="true" />
              <h3 className="mt-5 text-xl font-black text-[#13254b]">
                Tools I Can Work With
              </h3>
              <div className="mt-5 flex flex-wrap gap-2">
                {tools.map((tool) => (
                  <span
                    key={tool}
                    className="rounded-md border border-[#d7dde8] bg-white px-3 py-2 text-sm font-bold text-[#13254b]"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section className="bg-[#111827] px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <ScrollReveal>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#86efac]">
              Application Ready
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
              Portfolio, resume, cover letter, and AI examples are organized for
              the hiring form.
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-8 text-white/68">
              The page is tailored to the role&apos;s focus on UGC ads,
              short-form formats, simple graphics, AI-generated content, quick
              revisions, and organized creative testing.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.1} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <a
              href={resumeHref}
              download
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#f97316] px-5 text-sm font-black text-[#111827] transition hover:bg-[#fb923c]"
            >
              <FileDown size={17} aria-hidden="true" />
              Download Resume
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
              View LinkedIn
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
            <a
              href="https://www.behance.net/ebubemichael"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-white/18 px-5 text-sm font-black text-white transition hover:border-[#38bdf8] hover:text-[#38bdf8]"
            >
              <ExternalLink size={17} aria-hidden="true" />
              View Behance
            </a>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}

function AboutNav() {
  return (
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
            href="/portfolio/resume"
            className="hidden min-h-11 items-center gap-2 rounded-md border border-white/14 px-3 text-sm font-black text-white/74 transition hover:border-[#86efac] hover:text-[#86efac] sm:inline-flex"
          >
            <FileText size={16} aria-hidden="true" />
            Resume
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
  );
}
