import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  Captions,
  Clapperboard,
  ExternalLink,
  FileDown,
  FileText,
  GalleryVerticalEnd,
  Languages,
  Mail,
  MessageSquare,
  MousePointerClick,
  PanelsTopLeft,
  Scissors,
  SquarePlay,
  UserRound,
  WandSparkles,
  Workflow,
} from "lucide-react";
import ReelGallery from "@/components/portfolio/ReelGallery";
import ScrollReveal from "@/components/portfolio/ScrollReveal";

export const metadata: Metadata = {
  title: "Ebube Michael | UGC Video Editor for Dialed In",
  description:
    "A tailored portfolio for UGC ads, short-form videos, creative graphics, AI-assisted content, and daily creative production.",
};

const resumeHref =
  "/portfolio/docs/Ebube-Michael-UGC-Video-Editor-Resume.pdf";
const coverLetterHref =
  "/portfolio/docs/Ebube-Michael-Dialed-In-Cover-Letter.pdf";
const linkedinHref = "https://www.linkedin.com/in/ebube-michael-7911b1366/";
const portfolioHref = "https://mejforge.com/portfolio";

const fitSignals = [
  { label: "Short-form UGC edits", value: "Reels, TikTok, Shorts", icon: Clapperboard },
  { label: "AI creative edge", value: "ChatGPT, Flow, Higgsfield", icon: BrainCircuit },
  { label: "Current experience", value: "OverwatchMoz social lead", icon: PanelsTopLeft },
  { label: "Creative systems", value: "Hooks, captions, variants", icon: Workflow },
];

const currentExperienceHighlights = [
  {
    title: "Short-form Campaigns",
    body: "Plans and produces branded graphics, carousels, Reels, and short-form video campaigns for LinkedIn, Instagram, and Facebook.",
    icon: Clapperboard,
  },
  {
    title: "AI Creative Assets",
    body: "Uses ChatGPT, Google Flow, Gemini, Higgsfield AI, CapCut, and Magnific Space to develop realistic visual concepts, videos, and campaign assets.",
    icon: WandSparkles,
  },
  {
    title: "Localized Messaging",
    body: "Adapts campaign messaging for the Mozambican market, including Portuguese communication and customer-facing security concepts.",
    icon: Languages,
  },
];

const featuredWork = [
  {
    title: "AI UGC Ad Concept",
    eyebrow: "AI-assisted creative",
    source: "/portfolio/reels/english/overwatch-ai-ugc-ad.mp4",
    poster: "/portfolio/reels/english/overwatch-ai-ugc-ad-cover.jpg",
    copy:
      "Built as a realistic short-form ad concept with a crisp service hook, strong visual direction, and a clear CTA path.",
    points: ["AI-assisted visuals", "Ad pacing", "UGC-style framing"],
    icon: WandSparkles,
  },
  {
    title: "Founder/CEO Trust Angle",
    eyebrow: "Spokesperson style",
    source: "/portfolio/reels/english/good-monitoring-ceo.mp4",
    copy:
      "A trust-led message shaped for viewers who need to understand the value fast before they scroll away.",
    points: ["Authority hook", "Caption rhythm", "B2B clarity"],
    icon: MessageSquare,
  },
  {
    title: "Hook Testing Variant",
    eyebrow: "Creative testing",
    source: "/portfolio/reels/english/before-hiring-guard-check-cameras.mp4",
    copy:
      "A direct-response angle that reframes the audience's buying decision before introducing the solution.",
    points: ["Cold-scroll hook", "Problem setup", "Variant thinking"],
    icon: MousePointerClick,
  },
];

const processSteps = [
  {
    title: "Hook Bank",
    body: "Develop platform-native openings from trends, pain points, comments, and product benefits.",
    icon: MousePointerClick,
  },
  {
    title: "Fast Cut",
    body: "Turn raw footage or generated scenes into tight vertical edits with clean pacing and sound cues.",
    icon: Scissors,
  },
  {
    title: "Caption Pass",
    body: "Add readable subtitles, punchy on-screen text, motion emphasis, and accessible formatting.",
    icon: Captions,
  },
  {
    title: "Variant Export",
    body: "Create multiple versions for hooks, CTAs, visuals, languages, or audience segments.",
    icon: Workflow,
  },
];

const aiToolStack = [
  {
    name: "ChatGPT",
    use: "Storyline development, hook writing, script structure, prompt planning, and image generation for ad concepts.",
    icon: BrainCircuit,
  },
  {
    name: "Google Flow",
    use: "Video generative AI for scene exploration, motion tests, and fast visual concept development.",
    icon: Clapperboard,
  },
  {
    name: "Gemini",
    use: "Creative research, prompt iteration, concept expansion, and AI-assisted campaign thinking.",
    icon: WandSparkles,
  },
  {
    name: "Higgsfield AI",
    use: "Generative video shots, AI motion tests, and creative variations for short-form ads.",
    icon: SquarePlay,
  },
  {
    name: "CapCut",
    use: "Final editing, captions, pacing, transitions, sound effects, vertical exports, and revision passes.",
    icon: Scissors,
  },
  {
    name: "Magnific Space",
    use: "AI image generation and enhancement workflow, formerly known as Freepik AI.",
    icon: GalleryVerticalEnd,
  },
];

const toolStack = [
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
  "Slack",
  "Notion",
];

export default function PortfolioPage() {
  return (
    <main className="overflow-hidden bg-[#070b10] text-white">
      <PortfolioNav />
      <HeroSection />
      <FitBar />
      <ExperienceSnapshot />
      <AboutPreview />
      <FeaturedWork />
      <ReelGallery />
      <AIProductionStack />
      <CreativeSystem />
      <ApplicationPanel />
      <PortfolioFooter />
    </main>
  );
}

function PortfolioNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#070b10]/82 backdrop-blur-xl">
      <nav
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
        aria-label="Portfolio navigation"
      >
        <a href="#top" className="flex min-h-11 items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-[#f97316] text-sm font-black text-[#111827]">
            EM
          </span>
          <span className="hidden text-sm font-black uppercase tracking-[0.16em] text-white sm:block">
            UGC Portfolio
          </span>
        </a>
        <div className="hidden items-center gap-5 text-sm font-bold text-white/68 md:flex">
          <a className="transition hover:text-white" href="#experience">
            Experience
          </a>
          <a className="transition hover:text-white" href="#about">
            About
          </a>
          <a className="transition hover:text-white" href="#work">
            Work
          </a>
          <a className="transition hover:text-white" href="#reels">
            Reels
          </a>
          <a className="transition hover:text-white" href="#application">
            Resume
          </a>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={linkedinHref}
            target="_blank"
            rel="noopener noreferrer"
            title="View LinkedIn profile"
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/14 px-3 text-sm font-bold text-white transition hover:border-[#38bdf8] hover:text-[#38bdf8]"
          >
            <ExternalLink size={16} aria-hidden="true" />
            <span className="hidden sm:inline">LinkedIn</span>
          </a>
          <a
            href="mailto:ebubemichael033@gmail.com"
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/14 px-3 text-sm font-bold text-white transition hover:border-[#86efac] hover:text-[#86efac]"
          >
            <Mail size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Contact</span>
          </a>
        </div>
      </nav>
    </header>
  );
}

function HeroSection() {
  return (
    <section
      id="top"
      className="relative min-h-[92svh] overflow-hidden border-b border-white/10 bg-[#070b10] px-4 pb-14 pt-24 text-white sm:px-6 lg:px-8"
    >
      <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:84px_84px]" />
      <div className="absolute inset-x-0 top-0 h-2 bg-[linear-gradient(90deg,#f97316,#38bdf8,#22c55e,#f8fafc)]" />
      <div className="absolute right-0 top-16 hidden h-[72%] w-[42%] bg-[#13254b]/30 [clip-path:polygon(18%_0,100%_0,100%_100%,0_100%)] sm:block" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:min-h-[calc(92svh-6rem)] lg:grid-cols-[0.92fr_1.08fr]">
        <div>
          <p className="inline-flex rounded-md border border-[#38bdf8]/35 bg-[#38bdf8]/10 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#7dd3fc]">
            Built for Dialed In&apos;s UGC video editor role
          </p>
          <h1 className="mt-6 max-w-4xl text-3xl font-black leading-[1.06] text-white sm:text-5xl lg:text-6xl">
            Ebube Michael edits short-form ads that get to the point fast.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-white/70 sm:text-lg">
            UGC ads, AI-assisted video concepts, creative graphics, captions,
            revisions, and testing-ready variations for brands that move every
            day.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#work"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#f97316] px-5 text-sm font-black text-[#111827] transition hover:bg-[#fb923c]"
            >
              <SquarePlay size={17} aria-hidden="true" />
              View Work
            </a>
            <Link
              href="/portfolio/resume"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-white/18 px-5 text-sm font-black text-white transition hover:border-[#38bdf8] hover:text-[#38bdf8]"
            >
              <FileText size={17} aria-hidden="true" />
              Resume Page
            </Link>
            <Link
              href="/portfolio/about"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-white/18 px-5 text-sm font-black text-white transition hover:border-[#86efac] hover:text-[#86efac]"
            >
              <UserRound size={17} aria-hidden="true" />
              About Me
            </Link>
          </div>
          <div className="mt-9 grid gap-3 text-sm text-white/65 sm:grid-cols-3">
            {[
              "ChatGPT + Google Flow",
              "Higgsfield + Magnific Space",
              "CapCut feedback cycles",
            ].map((item) => (
              <div
                key={item}
                className="flex min-h-11 items-center gap-2 border-l-2 border-[#22c55e] pl-3"
              >
                <BadgeCheck size={17} className="text-[#86efac]" aria-hidden="true" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <HeroProfile />
        </div>

        <div className="mx-auto grid w-full max-w-md grid-cols-1 items-center gap-4 sm:max-w-none sm:grid-cols-[0.72fr_1fr] sm:gap-5">
          <div className="grid grid-cols-2 gap-4 sm:block sm:space-y-5">
            <HeroVideo
              title="Portuguese AI ad variant"
              source="/portfolio/reels/portuguese/overwatch-ai-ugc-ad-pt.mp4"
              className="sm:translate-y-5"
            />
            <HeroVideo
              title="Hook test reel"
              source="/portfolio/reels/english/cctv-not-protecting-business.mp4"
            />
          </div>
          <HeroVideo
            title="Overwatch AI UGC ad"
            source="/portfolio/reels/english/overwatch-ai-ugc-ad.mp4"
            poster="/portfolio/reels/english/overwatch-ai-ugc-ad-cover.jpg"
            featured
          />
        </div>
      </div>
    </section>
  );
}

function HeroProfile() {
  return (
    <div className="mt-7 flex max-w-md items-center gap-4 rounded-lg border border-white/12 bg-white/[0.04] p-3">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-white/12 bg-black">
        <Image
          src="/portfolio/ebube-portrait.png"
          alt="Portrait of Ebube Michael"
          fill
          sizes="64px"
          className="object-cover object-[52%_25%]"
          priority
        />
      </div>
      <div>
        <p className="text-sm font-black text-white">Ebube Junior Michael</p>
        <p className="mt-1 text-sm leading-6 text-white/62">
          Social media manager creating Reels, AI-assisted ad concepts, captions,
          graphics, and localized campaigns.
        </p>
      </div>
    </div>
  );
}

function HeroVideo({
  title,
  source,
  poster,
  featured,
  className = "",
}: {
  title: string;
  source: string;
  poster?: string;
  featured?: boolean;
  className?: string;
}) {
  return (
    <figure
      className={`overflow-hidden rounded-lg border border-white/12 bg-black shadow-2xl shadow-black/40 ${className}`}
    >
      <video
        className={`w-full object-cover ${featured ? "aspect-[9/16]" : "aspect-[9/16]"}`}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster={poster}
        src={source}
        aria-label={title}
      />
      <figcaption className="border-t border-white/10 bg-[#0f1720] px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white/58">
        {title}
      </figcaption>
    </figure>
  );
}

function FitBar() {
  return (
    <section className="bg-[#f8fafc] px-4 py-8 text-[#111827] sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {fitSignals.map((signal, index) => {
          const Icon = signal.icon;
          return (
            <ScrollReveal
              key={signal.label}
              delay={index * 0.04}
              className="rounded-lg border border-[#d7dde8] bg-white p-5"
            >
              <Icon size={22} className="text-[#0f766e]" aria-hidden="true" />
              <p className="mt-4 text-sm font-black uppercase tracking-[0.12em] text-[#5b667a]">
                {signal.label}
              </p>
              <p className="mt-2 text-lg font-black leading-snug text-[#13254b]">
                {signal.value}
              </p>
            </ScrollReveal>
          );
        })}
      </div>
    </section>
  );
}

function ExperienceSnapshot() {
  return (
    <section
      id="experience"
      className="bg-[#f8fafc] px-4 pb-20 pt-12 text-[#111827] sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
          <ScrollReveal>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#f97316]">
              Current Experience
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#13254b] sm:text-4xl">
              Social Media Manager at OverwatchMoz.
            </h2>
            <p className="mt-4 text-base font-bold text-[#0f766e]">
              Full-time, remote | Mar 2026 - Present
            </p>
            <p className="mt-5 text-base leading-8 text-[#4b5563]">
              Manages and develops social media content for a security
              technology company focused on intelligent CCTV monitoring and
              virtual guarding. The work blends content planning, scripts,
              captions, campaign messaging, AI-assisted visuals, and
              customer-facing education.
            </p>
          </ScrollReveal>

          <div className="grid gap-4 sm:grid-cols-3">
            {currentExperienceHighlights.map((item, index) => {
              const Icon = item.icon;
              return (
                <ScrollReveal
                  key={item.title}
                  delay={index * 0.06}
                  className="rounded-lg border border-[#d7dde8] bg-white p-5"
                >
                  <Icon size={24} className="text-[#0f766e]" aria-hidden="true" />
                  <h3 className="mt-5 text-lg font-black text-[#13254b]">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[#4b5563]">
                    {item.body}
                  </p>
                </ScrollReveal>
              );
            })}
          </div>
        </div>

        <ScrollReveal className="mt-6 grid gap-3 rounded-lg border border-[#d7dde8] bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            "Content concepts, scripts, captions, and campaign messaging",
            "Brand consistency across social and digital marketing materials",
            "Management collaboration on technical security-service messaging",
            "Campaign support for CCTV monitoring, assessments, and AI-assisted security",
          ].map((item) => (
            <div key={item} className="flex gap-2 text-sm leading-6 text-[#4b5563]">
              <BadgeCheck
                size={17}
                className="mt-1 shrink-0 text-[#0f766e]"
                aria-hidden="true"
              />
              <span>{item}</span>
            </div>
          ))}
        </ScrollReveal>
      </div>
    </section>
  );
}

function AboutPreview() {
  return (
    <section id="about" className="bg-[#111827] px-4 py-20 text-white sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
        <ScrollReveal className="relative order-2 mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-lg border border-white/12 bg-black shadow-2xl shadow-black/40 lg:order-1 lg:mx-0">
          <Image
            src="/portfolio/ebube-portrait.png"
            alt="Portrait of Ebube Michael"
            fill
            sizes="(max-width: 768px) 90vw, 390px"
            className="object-cover object-[52%_25%]"
          />
          <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(transparent,rgba(7,11,16,0.92))] px-5 pb-5 pt-24">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#86efac]">
              Creator Profile
            </p>
            <p className="mt-2 text-xl font-black">Ebube Junior Michael</p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.08} className="order-1 lg:order-2">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#38bdf8]">
            About Me
          </p>
          <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight sm:text-4xl">
            I turn raw ideas into short-form creative that feels native, clear,
            and test-ready.
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-8 text-white/68">
            My background sits at the intersection of social media management,
            brand storytelling, video editing, and AI-assisted content. At
            OverwatchMoz, I create campaign concepts, scripts, captions,
            branded graphics, Reels, localized messaging, and realistic AI
            visuals for a security technology audience.
          </p>
          <p className="mt-4 max-w-3xl text-base leading-8 text-white/68">
            For Dialed In, that means I can help produce daily creative, shape
            hooks, build variations, follow feedback quickly, and keep the work
            practical for TikTok, Reels, Facebook Reels, and YouTube Shorts.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              "Comfortable with fast revisions and creative direction",
              "Strong eye for captions, pacing, hooks, and simple graphics",
              "Experience with AI-assisted visuals and ad concepts",
              "Organized creative handoff for feedback and testing",
            ].map((item) => (
              <div
                key={item}
                className="flex min-h-12 items-center gap-2 rounded-md border border-white/12 bg-white/[0.04] px-3 text-sm font-bold text-white/76"
              >
                <BadgeCheck
                  size={16}
                  className="shrink-0 text-[#86efac]"
                  aria-hidden="true"
                />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/portfolio/about"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#38bdf8] px-5 text-sm font-black text-[#111827] transition hover:bg-[#7dd3fc]"
            >
              <UserRound size={17} aria-hidden="true" />
              Open About Page
            </Link>
            <a
              href="#reels"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-white/18 px-5 text-sm font-black text-white transition hover:border-[#f97316] hover:text-[#f97316]"
            >
              <SquarePlay size={17} aria-hidden="true" />
              Watch Reels
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

function FeaturedWork() {
  return (
    <section id="work" className="bg-white px-4 py-20 text-[#111827] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
          <ScrollReveal>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0f766e]">
              Featured Work
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#13254b] sm:text-4xl">
              Clear ad thinking, not just nice edits.
            </h2>
          </ScrollReveal>
          <ScrollReveal
            delay={0.08}
            className="max-w-3xl text-base leading-8 text-[#4b5563] lg:justify-self-end"
          >
            The samples are organized the way Dialed In would evaluate creative:
            hook strength, production speed, visual clarity, testable variants,
            and whether the edit feels native to short-form platforms.
          </ScrollReveal>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {featuredWork.map((work, index) => {
            const Icon = work.icon;
            return (
              <ScrollReveal
                key={work.title}
                delay={index * 0.06}
                className="overflow-hidden rounded-lg border border-[#d7dde8] bg-[#f8fafc]"
              >
                <div className="aspect-[9/16] bg-black">
                  <video
                    className="h-full w-full object-cover"
                    controls
                    playsInline
                    preload="metadata"
                    poster={work.poster}
                    src={work.source}
                    aria-label={work.title}
                  />
                </div>
                <div className="p-5">
                  <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">
                    <Icon size={15} aria-hidden="true" />
                    {work.eyebrow}
                  </p>
                  <h3 className="mt-3 text-2xl font-black leading-tight text-[#13254b]">
                    {work.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[#4b5563]">
                    {work.copy}
                  </p>
                  <div className="mt-5 grid gap-2">
                    {work.points.map((point) => (
                      <div
                        key={point}
                        className="flex min-h-10 items-center gap-2 rounded-md bg-white px-3 text-sm font-bold text-[#1f2937]"
                      >
                        <BadgeCheck
                          size={16}
                          className="text-[#0f766e]"
                          aria-hidden="true"
                        />
                        {point}
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function AIProductionStack() {
  return (
    <section className="bg-white px-4 py-20 text-[#111827] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
          <ScrollReveal>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#f97316]">
              AI Production Stack
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#13254b] sm:text-4xl">
              The tools behind the storylines, generated visuals, and final
              edits.
            </h2>
          </ScrollReveal>
          <ScrollReveal
            delay={0.08}
            className="max-w-3xl text-base leading-8 text-[#4b5563] lg:justify-self-end"
          >
            I use AI where it speeds up creative thinking and production:
            storylines, hooks, image generation, generative video scenes,
            motion ideas, and fast ad variations before polishing the final
            edit.
          </ScrollReveal>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {aiToolStack.map((tool, index) => {
            const Icon = tool.icon;
            return (
              <ScrollReveal
                key={tool.name}
                delay={index * 0.04}
                className="rounded-lg border border-[#d7dde8] bg-[#f8fafc] p-5"
              >
                <Icon size={24} className="text-[#0f766e]" aria-hidden="true" />
                <h3 className="mt-5 text-xl font-black text-[#13254b]">
                  {tool.name}
                </h3>
                <p className="mt-3 text-sm leading-6 text-[#4b5563]">
                  {tool.use}
                </p>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CreativeSystem() {
  return (
    <section className="bg-[#f8fafc] px-4 py-20 text-[#111827] sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr]">
        <ScrollReveal>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#f97316]">
            Production Workflow
          </p>
          <h2 className="mt-3 text-3xl font-black leading-tight text-[#13254b] sm:text-4xl">
            Built for daily creative output, revisions, and testing.
          </h2>
          <p className="mt-5 text-base leading-8 text-[#4b5563]">
            Dialed In needs someone who can keep up with a fast creative loop.
            This workflow is designed to move from idea to tested variant
            without waiting on a heavy production process.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            {toolStack.map((tool) => (
              <span
                key={tool}
                className="rounded-md border border-[#d7dde8] bg-white px-3 py-2 text-sm font-bold text-[#13254b]"
              >
                {tool}
              </span>
            ))}
          </div>
        </ScrollReveal>

        <div className="grid gap-4 sm:grid-cols-2">
          {processSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <ScrollReveal
                key={step.title}
                delay={index * 0.05}
                className="rounded-lg border border-[#d7dde8] bg-white p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <Icon size={24} className="text-[#0f766e]" aria-hidden="true" />
                  <span className="text-sm font-black text-[#f97316]">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-xl font-black text-[#13254b]">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-[#4b5563]">
                  {step.body}
                </p>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ApplicationPanel() {
  return (
    <section
      id="application"
      className="relative overflow-hidden bg-[#111827] px-4 py-20 text-white sm:px-6 lg:px-8"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#38bdf8,#f97316,transparent)]" />
      <div className="mx-auto max-w-5xl">
        <ScrollReveal className="text-center">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#86efac]">
            Application Kit
          </p>
          <h2 className="mx-auto mt-3 max-w-4xl text-3xl font-black leading-tight sm:text-4xl">
            Resume, cover letter, LinkedIn, AI tool stack, and short-form
            examples in one place.
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-white/68">
            Everything here is tailored to the exact role: UGC ads,
            short-form videos, AI-assisted creative production, simple graphics,
            named AI tools, creative variants, and fast revision cycles.
          </p>

          <div className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-2">
            <Link
              href="/portfolio/resume"
              className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#f97316] px-5 text-sm font-black text-[#111827] transition hover:bg-[#fb923c]"
            >
              <FileText size={17} aria-hidden="true" />
              View Resume Page
              <ArrowRight
                size={16}
                className="transition group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
            <a
              href={resumeHref}
              download
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-white/18 px-5 text-sm font-black text-white transition hover:border-[#38bdf8] hover:text-[#38bdf8]"
            >
              <FileDown size={17} aria-hidden="true" />
              Download Resume
            </a>
            <a
              href={coverLetterHref}
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
            <a
              href="https://www.behance.net/ebubemichael"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-white/18 px-5 text-sm font-black text-white transition hover:border-[#38bdf8] hover:text-[#38bdf8]"
            >
              <ExternalLink size={17} aria-hidden="true" />
              Behance
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

function PortfolioFooter() {
  return (
    <footer className="bg-[#070b10] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 border-t border-white/10 pt-6 text-sm text-white/52 sm:flex-row sm:items-center sm:justify-between">
        <p>Ebube Junior Michael - UGC Video Editor Portfolio</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <a
            href={linkedinHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 font-bold text-white/70 transition hover:text-white"
          >
            <ExternalLink size={16} aria-hidden="true" />
            LinkedIn
          </a>
          <a
            href="mailto:ebubemichael033@gmail.com"
            className="inline-flex min-h-11 items-center gap-2 font-bold text-white/70 transition hover:text-white"
          >
            <Mail size={16} aria-hidden="true" />
            ebubemichael033@gmail.com
          </a>
        </div>
      </div>
    </footer>
  );
}
