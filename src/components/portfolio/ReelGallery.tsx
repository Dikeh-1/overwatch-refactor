"use client";

import { useMemo, useState } from "react";
import {
  Captions,
  Clock,
  Clapperboard,
  Languages,
  SquarePlay,
  WandSparkles,
} from "lucide-react";
import ScrollReveal from "@/components/portfolio/ScrollReveal";

type Reel = {
  title: string;
  category: "UGC Ad" | "Hook Test" | "AI Assisted" | "Localized";
  language: "English" | "Portuguese";
  duration: string;
  source: string;
  poster?: string;
  insight: string;
  tags: string[];
};

const reels: Reel[] = [
  {
    title: "Overwatch AI UGC Ad",
    category: "AI Assisted",
    language: "English",
    duration: "0:27",
    source: "/portfolio/reels/english/overwatch-ai-ugc-ad.mp4",
    poster: "/portfolio/reels/english/overwatch-ai-ugc-ad-cover.jpg",
    insight: "AI-assisted ad concept built for fast awareness testing.",
    tags: ["AI scene", "UGC ad", "CTA"],
  },
  {
    title: "Good Monitoring - CEO Angle",
    category: "AI Assisted",
    language: "English",
    duration: "0:44",
    source: "/portfolio/reels/english/good-monitoring-ceo.mp4",
    insight: "Spokesperson-style creative with a clear founder-led trust angle.",
    tags: ["AI talent", "Trust", "Explainer"],
  },
  {
    title: "Before Hiring Another Guard",
    category: "Hook Test",
    language: "English",
    duration: "0:32",
    source: "/portfolio/reels/english/before-hiring-guard-check-cameras.mp4",
    insight: "Cost-saving hook shaped for cold-scroll business owners.",
    tags: ["Hook", "Problem", "B2B"],
  },
  {
    title: "Your CCTV Is Not Protecting You",
    category: "UGC Ad",
    language: "English",
    duration: "0:29",
    source: "/portfolio/reels/english/cctv-not-protecting-business.mp4",
    insight: "Direct response framing with a strong pain-point opening.",
    tags: ["Pain point", "Captions", "CTA"],
  },
  {
    title: "More Cameras, Not More Security",
    category: "Hook Test",
    language: "English",
    duration: "0:32",
    source: "/portfolio/reels/english/more-cameras-not-more-security.mp4",
    insight: "Educational myth-busting angle for testing objections.",
    tags: ["Myth busting", "Retention", "SFX"],
  },
  {
    title: "Overwatch AI UGC Ad - PT",
    category: "Localized",
    language: "Portuguese",
    duration: "0:28",
    source: "/portfolio/reels/portuguese/overwatch-ai-ugc-ad-pt.mp4",
    insight: "Localized AI-assisted ad variant for Portuguese-speaking audiences.",
    tags: ["Localization", "AI", "Ad variant"],
  },
  {
    title: "Before Hiring Another Guard - PT",
    category: "Localized",
    language: "Portuguese",
    duration: "0:32",
    source:
      "/portfolio/reels/portuguese/before-hiring-guard-check-cameras-pt.mp4",
    insight: "Same winning hook adapted for a second market and language.",
    tags: ["Portuguese", "Hook", "Market fit"],
  },
];

const filters = [
  { label: "All", value: "All", icon: Clapperboard },
  { label: "UGC Ads", value: "UGC Ad", icon: SquarePlay },
  { label: "AI", value: "AI Assisted", icon: WandSparkles },
  { label: "Hooks", value: "Hook Test", icon: Captions },
  { label: "Localized", value: "Localized", icon: Languages },
] as const;

export default function ReelGallery() {
  const [activeFilter, setActiveFilter] =
    useState<(typeof filters)[number]["value"]>("All");

  const visibleReels = useMemo(() => {
    if (activeFilter === "All") return reels;
    return reels.filter((reel) => reel.category === activeFilter);
  }, [activeFilter]);

  return (
    <section
      id="reels"
      className="relative border-y border-white/10 bg-[#0f1720] px-4 py-20 text-white sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <ScrollReveal className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#38bdf8]">
              Reel Library
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-white sm:text-4xl">
              Short-form edits built around hooks, pacing, captions, and ad
              variants.
            </h2>
          </ScrollReveal>

          <ScrollReveal
            delay={0.08}
            className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end"
            aria-label="Filter reels"
          >
            {filters.map((filter) => {
              const Icon = filter.icon;
              const isActive = activeFilter === filter.value;
              return (
                <button
                  key={filter.value}
                  type="button"
                  aria-pressed={isActive}
                  title={`Show ${filter.label} work`}
                  onClick={() => setActiveFilter(filter.value)}
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-3 text-sm font-bold transition ${
                    isActive
                      ? "border-[#f97316] bg-[#f97316] text-[#111827]"
                      : "border-white/15 bg-white/5 text-white/78 hover:border-white/35 hover:bg-white/10"
                  }`}
                >
                  <Icon size={16} aria-hidden="true" />
                  <span>{filter.label}</span>
                </button>
              );
            })}
          </ScrollReveal>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleReels.map((reel, index) => (
            <ScrollReveal
              key={reel.source}
              delay={(index % 3) * 0.05}
              className="overflow-hidden rounded-lg border border-white/12 bg-white/[0.04] shadow-2xl shadow-black/20"
            >
              <div className="aspect-[9/16] bg-black">
                <video
                  className="h-full w-full object-cover"
                  controls
                  playsInline
                  preload="metadata"
                  poster={reel.poster}
                  src={reel.source}
                  aria-label={`${reel.title} video sample`}
                />
              </div>
              <div className="space-y-4 p-5">
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-white/54">
                  <span className="rounded-md border border-white/12 px-2 py-1 text-[#86efac]">
                    {reel.category}
                  </span>
                  <span>{reel.language}</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock size={13} aria-hidden="true" />
                    {reel.duration}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-black leading-tight text-white">
                    {reel.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-white/68">
                    {reel.insight}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {reel.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-white/8 px-2 py-1 text-xs font-semibold text-white/70"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
