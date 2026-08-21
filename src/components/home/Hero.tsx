"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";
import ParticleNetwork from "@/components/ui/ParticleNetwork";
import ScrambleText from "@/components/ui/ScrambleText";
import ScrollFadeHero from "@/components/animations/ScrollFadeHero";
import { WHATSAPP_URL } from "@/lib/constants";

export default function Hero() {
  const t = useTranslations("hero");
  const tStats = useTranslations("stats");

  const stats = [
    { value: tStats("monitoring.value"), label: tStats("monitoring.label") },
    { value: tStats("response.value"), label: tStats("response.label") },
    { value: tStats("compliance.value"), label: tStats("compliance.label") },
  ];

  return (
    <section className="hero-section relative min-h-screen flex items-center overflow-hidden bg-[#0f1117] text-white dark">
      {/* Theme-aware background via CSS (see globals.css) */}
      <div className="hero-bg absolute inset-0 z-0" />

      {/* Interactive Particle Network */}
      <ParticleNetwork forceDark />

      {/* Gradient overlay — theme-aware */}
      <div className="hero-overlay absolute inset-0 z-10 pointer-events-none" />

      {/* ── CONTENT with scroll-fade-out effect ──────────────────────────────────────── */}
      <ScrollFadeHero className="relative z-20 w-full">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16 md:pt-28 md:pb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="max-w-2xl"
          >
            {/* Badge */}
            <motion.span
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="inline-block px-4 py-1.5 rounded-full border border-white/50 bg-white/10 text-white text-xs font-bold tracking-[0.2em] uppercase mb-6 shadow-lg shadow-white/10"
            >
              {t("badge")}
            </motion.span>

            {/* Headline */}
            <h1 className="text-[clamp(2rem,8.5vw,3rem)] sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6 min-h-[6.75rem] sm:min-h-[150px]">
              <span className="text-white block">
                <ScrambleText text={t("headline")} delay={0.2} />
              </span>
              {t("headlineAccent") && (
                <span className="text-white glow-text block mt-2">
                  <ScrambleText text={t("headlineAccent")} delay={0.8} />
                </span>
              )}
            </h1>

            {/* Description */}
            <p className="text-white/85 text-base sm:text-lg leading-relaxed mb-8 sm:mb-10 font-medium max-w-xl">
              {t("description")}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-start gap-4 mb-14">
              <Button href="/contact" size="md" className="bg-white text-[#0f1117] hover:bg-white/90">
                {t("ctaPrimary")}
              </Button>
              <Button
                href={WHATSAPP_URL}
                variant="secondary"
                size="md"
                className="border-white/50 text-white hover:border-white hover:bg-white/10"
                external
              >
                {t("ctaSecondary")}
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8 border-t border-white/10">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.35 + i * 0.1 }}
                >
                  <div className="text-xl md:text-2xl font-bold text-white">
                    {stat.value}
                  </div>
                  <div className="text-[10px] sm:text-xs text-white/65 mt-1 uppercase tracking-wider font-semibold">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </ScrollFadeHero>
    </section>
  );
}
