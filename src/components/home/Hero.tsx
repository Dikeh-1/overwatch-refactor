"use client";

import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";
import { darkEyebrowClassName } from "@/components/ui/eyebrow";
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
            className="max-w-[46rem]"
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

            <h1 className="mt-6 max-w-[44rem] text-balance text-[clamp(2.35rem,8.2vw,4.7rem)] font-bold leading-[1.01] tracking-[-0.045em] text-white">
              <span className="block">{t("headline")}</span>
              {t("headlineAccent") ? (
                <span className="mt-1 block text-white">{t("headlineAccent")}</span>
              ) : null}
            </h1>

            <p className="mt-6 max-w-[40rem] whitespace-pre-line text-pretty text-base font-medium leading-relaxed text-white/72 sm:text-lg lg:text-xl">
              {t("description")}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
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

            <div className="mt-9 max-w-[47rem] overflow-hidden rounded-2xl border border-white/12 bg-[#10131a]/68 p-3 shadow-[0_24px_60px_rgba(0,0,0,0.26)] backdrop-blur-md sm:p-4">
              <div className="grid gap-2.5 sm:grid-cols-3">
                {stats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.3 + index * 0.08 }}
                    className="flex min-h-20 items-center gap-3 rounded-xl border border-white/[0.075] bg-white/[0.045] px-3.5 py-3 sm:block sm:min-h-24 sm:px-4"
                  >
                    <CheckCircle2
                      size={17}
                      className="shrink-0 text-white/85 sm:mb-2"
                      aria-hidden="true"
                    />
                    <div>
                      <div className="text-lg font-bold leading-none text-white sm:text-xl">
                        {stat.value}
                      </div>
                      <div className="mt-1.5 text-[0.62rem] font-semibold uppercase leading-relaxed tracking-[0.11em] text-white/55 sm:text-[0.68rem]">
                        {stat.label}
                      </div>
                    </div>
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
