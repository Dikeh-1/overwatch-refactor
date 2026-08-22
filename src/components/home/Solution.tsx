"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { IMAGES } from "@/lib/constants";

type ProcessStep = {
  title: string;
  description: string;
};

export default function Solution() {
  const t = useTranslations("solution");
  const steps = t.raw("steps") as ProcessStep[];

  return (
    <section
      id="how"
      className="relative overflow-hidden border-y border-border/60 bg-background py-20 md:py-28"
    >
      <div className="pointer-events-none absolute inset-0 tech-grid opacity-[0.18]" />
      <div className="pointer-events-none absolute -right-32 top-12 h-[30rem] w-[30rem] rounded-full bg-foreground/[0.025] blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-end gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">
              {t("label")}
            </p>
            <h2 className="mt-3 max-w-2xl text-balance text-3xl font-bold leading-tight tracking-[-0.035em] text-foreground sm:text-4xl lg:text-5xl">
              {t("title")}
            </h2>
          </div>
          <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted sm:text-lg lg:pb-1">
            {t("description")}
          </p>
        </div>

        <div className="mt-10 grid items-start gap-10 lg:mt-14 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16">
          <motion.figure
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="lg:sticky lg:top-28"
          >
            <div className="relative mx-auto aspect-[16/10] w-full max-w-3xl overflow-hidden rounded-[1.75rem] border border-border shadow-[0_24px_70px_rgba(2,6,23,0.13)] sm:aspect-[16/9] lg:aspect-[4/5] lg:max-w-none">
              <Image
                src={IMAGES.process}
                alt={t("imageAlt")}
                fill
                unoptimized
                className="object-cover object-[center_32%] lg:object-center"
                sizes="(max-width: 1024px) 100vw, 46vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080b11] via-[#080b11]/15 to-transparent" />

              <figcaption className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7">
                <div className="flex items-start gap-3 sm:gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white backdrop-blur-sm sm:h-11 sm:w-11">
                    <ShieldCheck size={20} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-white/55 sm:text-xs">
                      {t("visualLabel")}
                    </p>
                    <h3 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                      {t("visualTitle")}
                    </h3>
                    <p className="mt-2 max-w-md text-xs leading-relaxed text-white/62 sm:text-sm">
                      {t("visualDescription")}
                    </p>
                  </div>
                </div>
              </figcaption>
            </div>
          </motion.figure>

          <ol className="relative border-y border-border/85">
            {steps.map((step, index) => {
              const isFinalStep = index === steps.length - 1;

              return (
                <motion.li
                  key={step.title}
                  initial={{ opacity: 0, x: 16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-45px" }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  className="group relative grid grid-cols-[2.5rem_1fr] gap-4 border-b border-border/75 py-5 last:border-b-0 sm:grid-cols-[3rem_1fr] sm:gap-5 sm:py-6"
                >
                  <span
                    className={
                      isFinalStep
                        ? "relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-xs font-bold tabular-nums text-background shadow-sm sm:h-12 sm:w-12 sm:text-sm"
                        : "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-xs font-bold tabular-nums text-muted transition-colors group-hover:border-foreground/25 group-hover:text-foreground sm:h-12 sm:w-12 sm:text-sm"
                    }
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 pt-0.5 sm:pt-1">
                    <h3 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                      {step.title}
                    </h3>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
                      {step.description}
                    </p>
                  </div>
                </motion.li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
