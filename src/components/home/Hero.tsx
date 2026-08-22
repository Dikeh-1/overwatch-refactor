"use client";

import { motion } from "framer-motion";
import { ArrowRight, BadgeCheck, RadioTower, ShieldCheck, TimerReset } from "lucide-react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";
import { darkEyebrowClassName } from "@/components/ui/eyebrow";
import ScrambleText from "@/components/ui/ScrambleText";
import ScrollFadeHero from "@/components/animations/ScrollFadeHero";
import { WHATSAPP_URL } from "@/lib/constants";

export default function Hero() {
  const t = useTranslations("hero");
  const tStats = useTranslations("stats");

  const stats = [
    {
      value: tStats("monitoring.value"),
      label: tStats("monitoring.label"),
      shortLabel: tStats("monitoring.shortLabel"),
      icon: RadioTower,
    },
    {
      value: tStats("response.value"),
      label: tStats("response.label"),
      shortLabel: tStats("response.shortLabel"),
      icon: TimerReset,
    },
    {
      value: tStats("compliance.value"),
      label: tStats("compliance.label"),
      shortLabel: tStats("compliance.shortLabel"),
      icon: BadgeCheck,
    },
  ];

  return (
    <section className="hero-section dark relative flex min-h-[100svh] items-center overflow-hidden bg-[#0d0f14] text-white">
      <div className="hero-bg absolute inset-0 z-0" />
      <div className="hero-overlay absolute inset-0 z-10 pointer-events-none" />
      <div className="pointer-events-none absolute inset-0 z-[11] bg-[radial-gradient(circle_at_16%_24%,rgba(255,255,255,0.09),transparent_27%),radial-gradient(circle_at_78%_70%,rgba(59,130,246,0.10),transparent_30%)]" />
      <div className="pointer-events-none absolute -right-44 top-28 z-[11] h-[38rem] w-[38rem] rounded-full border border-white/[0.05]" />
      <div className="pointer-events-none absolute -right-20 top-52 z-[11] h-[25rem] w-[25rem] rounded-full border border-white/[0.06]" />

      <ScrollFadeHero className="relative z-20 w-full">
        <div className="mx-auto max-w-7xl px-4 pb-14 pt-28 sm:px-6 sm:pb-16 sm:pt-32 lg:px-8 lg:pb-20 lg:pt-36">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-[43rem]"
          >
            <motion.span
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className={darkEyebrowClassName}
            >
              <ShieldCheck size={15} className="shrink-0" aria-hidden="true" />
              <span>{t("badge")}</span>
            </motion.span>

            <h1 className="mt-5 min-h-[7.7rem] max-w-[43rem] text-balance text-[clamp(2.35rem,5vw,3.5rem)] font-bold leading-[1.04] tracking-[-0.04em] text-white sm:min-h-[7.25rem]">
              <span className="block">
                <ScrambleText text={t("headline")} delay={0.2} />
              </span>
              {" "}
              {t("headlineAccent") ? (
                <span className="mt-1 block text-white">
                  <ScrambleText text={t("headlineAccent")} delay={0.75} />
                </span>
              ) : null}
            </h1>

            <p className="mt-5 max-w-[37rem] text-pretty text-base font-normal leading-relaxed text-white/68 sm:text-lg">
              {t("description")}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button
                href="/contact#assessment-form"
                size="lg"
                className="w-full whitespace-nowrap bg-white px-4 text-[clamp(0.68rem,3.5vw,0.875rem)] text-[#0d0f14] hover:bg-white/90 sm:w-auto sm:px-5 sm:text-sm"
              >
                {t("ctaPrimary")}
                <ArrowRight size={17} className="ml-2" aria-hidden="true" />
              </Button>
              <Button
                href={WHATSAPP_URL}
                variant="secondary"
                size="lg"
                className="w-full whitespace-nowrap border-white/25 px-4 text-[clamp(0.68rem,3.5vw,0.875rem)] text-white hover:border-white/55 hover:bg-white/[0.07] sm:w-auto sm:px-5 sm:text-sm"
                external
              >
                {t("ctaSecondary")}
              </Button>
            </div>

            <div className="mt-8 max-w-[43rem] border-y border-white/12 py-3.5 sm:py-4">
              <div className="grid grid-cols-3 divide-x divide-white/12">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.28 + index * 0.07 }}
                  className="flex min-w-0 items-center gap-2 px-2 first:pl-0 last:pr-0 sm:gap-3 sm:px-4"
                >
                  <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.05] text-white/72 sm:flex">
                    <stat.icon size={15} aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[0.72rem] font-bold leading-none tracking-[-0.02em] text-white min-[360px]:text-xs sm:text-sm">
                      {stat.value}
                    </span>
                    <span className="mt-1.5 block truncate text-[0.48rem] font-semibold uppercase leading-none tracking-[0.08em] text-white/48 min-[360px]:text-[0.52rem] sm:hidden">
                      {stat.shortLabel}
                    </span>
                    <span className="mt-1.5 hidden text-[0.58rem] font-semibold uppercase leading-tight tracking-[0.08em] text-white/48 sm:block">
                      {stat.label}
                    </span>
                  </span>
                </motion.div>
              ))}
              </div>
            </div>
          </motion.div>
        </div>
      </ScrollFadeHero>
    </section>
  );
}
