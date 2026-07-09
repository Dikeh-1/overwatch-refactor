"use client";

import { useTranslations } from "next-intl";
import { ArrowRight, HelpCircle, ShieldCheck } from "lucide-react";
import GlowCard from "@/components/ui/GlowCard";
import ScrollReveal from "@/components/animations/ScrollReveal";
import { IMAGES } from "@/lib/constants";

export default function GuardingAngle() {
  const t = useTranslations("guardingAngle");

  return (
    <section className="py-20 md:py-28 border-t border-border bg-primary-darker/40 relative overflow-hidden dark">
      {/* Background Video */}
      <div className="absolute inset-0 z-0 opacity-45 pointer-events-none">
        <video
          className="w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={IMAGES.videoPoster}
        >
          <source src={IMAGES.videoSrc} type="video/mp4" />
        </video>
      </div>
      {/* Overlay to dim video using the main dark theme background color (#0f1117) */}
      <div className="absolute inset-0 bg-[#0f1117]/85 z-0 pointer-events-none" />

      {/* Force white text in this section since the video overlay is always dark */}
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 z-10 text-white">
        <ScrollReveal direction="up" className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 glow-text">
            {t("title")}
          </h2>
          <p className="text-muted text-lg max-w-2xl mx-auto leading-relaxed">
            {t("subtitle")}
          </p>
        </ScrollReveal>

        {/* Transition Grid */}
        <div className="flex flex-col md:flex-row items-stretch justify-between gap-6 md:gap-4 mb-12">
          {/* From State */}
          <ScrollReveal direction="left" delay={0.1} className="flex-1">
            <GlowCard techCorners={true} accentColor="slate" className="h-full border-border/40 bg-primary-darker/20 text-center p-8 flex flex-col items-center justify-center">
              <HelpCircle className="text-muted mb-4" size={40} />
              <span className="text-xs text-muted uppercase tracking-widest font-semibold mb-2 block">
                {t("fromLabel")}
              </span>
              <p className="text-2xl font-bold text-foreground/60 italic">
                {t("fromText")}
              </p>
            </GlowCard>
          </ScrollReveal>

          {/* Arrow Connector */}
          <div className="flex items-center justify-center shrink-0">
            <div className="w-12 h-12 rounded-full border border-border bg-primary-dark/80 flex items-center justify-center text-accent rotate-90 md:rotate-0">
              <ArrowRight size={24} className="animate-pulse" />
            </div>
          </div>

          {/* To State */}
          <ScrollReveal direction="right" delay={0.2} className="flex-1">
            <GlowCard techCorners={true} accentColor="cyan" className="h-full border-accent/30 bg-primary-darker/20 text-center p-8 flex flex-col items-center justify-center">
              <ShieldCheck className="text-accent mb-4 animate-pulse" size={40} />
              <span className="text-xs text-accent uppercase tracking-widest font-semibold mb-2 block">
                {t("toLabel")}
              </span>
              <p className="text-2xl font-bold text-foreground">
                {t("toText")}
              </p>
            </GlowCard>
          </ScrollReveal>
        </div>

        {/* Outro */}
        <ScrollReveal direction="up" delay={0.3} className="text-center text-white font-semibold text-lg max-w-xl mx-auto leading-relaxed border-t border-white/20 pt-8">
          <p>{t("outro")}</p>
        </ScrollReveal>
      </div>
    </section>
  );
}
