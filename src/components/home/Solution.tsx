"use client";

import Image from "next/image";
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
      className="relative border-y border-border/60 bg-background py-16 md:py-24 lg:py-28"
    >
      <div className="pointer-events-none absolute inset-0 tech-grid opacity-[0.12]" />
      <div className="pointer-events-none absolute -right-32 top-12 h-[30rem] w-[30rem] rounded-full bg-foreground/[0.025] blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl items-start gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:px-8">
        <aside className="lg:sticky lg:top-24">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">
            {t("label")}
          </p>
          <h2 className="mt-3 max-w-xl text-balance text-3xl font-bold leading-tight tracking-[-0.035em] text-foreground sm:text-4xl lg:text-5xl">
            {t("title")}
          </h2>
          <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted sm:text-lg">
            {t("description")}
          </p>

          <figure className="relative mt-8 aspect-[16/10] w-full overflow-hidden rounded-xl border border-border shadow-[0_20px_55px_rgba(2,6,23,0.10)] sm:aspect-[16/9] lg:aspect-[4/3]">
            <Image
              src={IMAGES.process}
              alt={t("imageAlt")}
              fill
              unoptimized
              className="object-cover object-[center_32%] lg:object-center"
              sizes="(max-width: 1023px) 100vw, 42vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080b11]/95 via-[#080b11]/10 to-transparent" />

            <figcaption className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-5 text-white sm:p-6">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white">
                <ShieldCheck size={17} aria-hidden="true" />
              </span>
              <div>
                <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-white/55 sm:text-[0.68rem]">
                  {t("visualLabel")}
                </p>
                <h3 className="mt-1 text-lg font-semibold tracking-tight text-white sm:text-xl">
                  {t("visualTitle")}
                </h3>
              </div>
            </figcaption>
          </figure>
        </aside>

        <ol className="relative border-t border-border/85 lg:mt-1">
          {steps.map((step, index) => {
            const isFinalStep = index === steps.length - 1;

            return (
              <li
                key={step.title}
                className="group relative grid grid-cols-[2.5rem_1fr] gap-4 border-b border-border/75 py-6 last:border-b-0 sm:grid-cols-[3rem_1fr] sm:gap-5 sm:py-8 lg:min-h-[12.5rem] lg:content-center"
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
                  <h3 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl lg:text-2xl">
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
                    {step.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
