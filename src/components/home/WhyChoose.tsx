"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "framer-motion";

function SectionIntro({ id }: { id: string }) {
  const t = useTranslations("whyChoose");
  return (
    <div className="mx-auto max-w-4xl text-center">
      <h2
        id={id}
        className="text-[clamp(1.75rem,3vw,2.9rem)] font-bold leading-[1.08] text-foreground"
      >
        {t("title")}
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-[clamp(0.98rem,1.2vw,1.12rem)] leading-relaxed text-muted">
        {t("description")}
      </p>
    </div>
  );
}

function ProgressDots({ activeIndex, items }: { activeIndex: number; items: { id: string }[] }) {
  const t = useTranslations("whyChoose");
  return (
    <div
      className="flex items-center gap-2"
      aria-label={`${t("title")} progress: ${activeIndex + 1} of ${items.length}`}
    >
      {items.map((item, index) => (
        <span
          key={item.id}
          className={`h-2 rounded-full transition-all duration-300 ${
            index === activeIndex ? "w-9 bg-accent" : "w-2 bg-slate-400/35"
          }`}
        />
      ))}
    </div>
  );
}

export default function WhyChoose() {
  const t = useTranslations("whyChoose");
  const desktopSectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);

  const storytellingItems = [
    {
      id: "detection",
      title: t("benefits.detection.title"),
      description: t("benefits.detection.description"),
      image: "/weapon-detection.webp",
    },
    {
      id: "verification",
      title: t("benefits.verification.title"),
      description: t("benefits.verification.description"),
      image: "/monitoring.webp",
    },
    {
      id: "existingCCTV",
      title: t("benefits.existingCCTV.title"),
      description: t("benefits.existingCCTV.description"),
      image: "/security-problems.webp",
    },
    {
      id: "accountability",
      title: t("benefits.accountability.title"),
      description: t("benefits.accountability.description"),
      image: "/business-bg.webp",
    },
    {
      id: "integratedSecurity",
      title: t("benefits.integratedSecurity.title"),
      description: t("benefits.integratedSecurity.description"),
      image: "/surveillance-control-room.webp",
    },
  ];

  const totalItems = storytellingItems.length;

  const { scrollYProgress } = useScroll({
    target: desktopSectionRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const nextIndex = Math.min(
      totalItems - 1,
      Math.max(0, Math.floor(latest * totalItems)),
    );
    setActiveIndex((current) => (current === nextIndex ? current : nextIndex));
  });

  const activeItem = storytellingItems[activeIndex];

  return (
    <>
      <section
        ref={desktopSectionRef}
        aria-labelledby="why-choose-title"
        className="relative hidden bg-primary-darker lg:block lg:min-h-[500svh]"
      >
        <div className="sticky top-0 flex min-h-[100svh] w-full items-center py-8 xl:py-10">
          <div className="absolute inset-0 bg-gradient-to-b from-primary-darker via-primary-dark/55 to-primary-darker" />
          <div className="absolute inset-0 bg-[radial-gradient(at_center_top,rgba(96,165,250,0.08)_0%,transparent_50%)]" />

          <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-5 px-6 lg:px-8 xl:gap-6">
            <SectionIntro id="why-choose-title" />

            <AnimatePresence initial={false} mode="wait">
              <motion.article
                key={activeItem.id}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0, y: -18 }}
                transition={{ duration: 0.32, ease: "easeOut" }}
                className="grid w-full min-w-0 items-center gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)] lg:gap-8 xl:gap-12"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg shadow-2xl shadow-black/45 ring-1 ring-white/10 lg:aspect-auto lg:h-[clamp(13rem,34svh,26rem)]">
                  <Image
                    src={activeItem.image}
                    alt={activeItem.title}
                    fill
                    priority={activeIndex === 0}
                    quality={72}
                    className="object-cover"
                    sizes="(min-width: 1280px) 650px, 52vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-primary-darker/55 to-transparent" />
                </div>

                <div className="min-w-0 max-w-2xl">
                  <ProgressDots activeIndex={activeIndex} items={storytellingItems} />
                  <h3 className="mt-4 text-[clamp(1.45rem,2.4vw,2.75rem)] font-bold leading-[1.08] text-foreground">
                    {activeItem.title}
                  </h3>
                  <p className="mt-4 text-[clamp(0.95rem,1.12vw,1.08rem)] font-medium leading-[1.58] text-muted">
                    {activeItem.description}
                  </p>
                </div>
              </motion.article>
            </AnimatePresence>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="why-choose-title-mobile"
        className="relative bg-primary-darker px-4 py-16 pb-28 sm:px-6 lg:hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary-darker via-primary-dark/55 to-primary-darker" />
        <div className="absolute inset-0 bg-[radial-gradient(at_center_top,rgba(96,165,250,0.08)_0%,transparent_50%)]" />

        <div className="relative z-10 mx-auto w-full max-w-3xl">
          <SectionIntro id="why-choose-title-mobile" />

          <div className="mt-10 grid gap-12">
            {storytellingItems.map((item, index) => (
              <motion.article
                key={item.id}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 22 }}
                whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.38, ease: "easeOut" }}
                className="grid min-w-0 gap-5"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg shadow-2xl shadow-black/40 ring-1 ring-white/10">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    priority={index === 0}
                    quality={72}
                    className="object-cover"
                    sizes="(max-width: 639px) calc(100vw - 2rem), min(42rem, calc(100vw - 3rem))"
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-primary-darker/55 to-transparent" />
                </div>

                <div className="min-w-0">
                  <h3 className="text-[clamp(1.45rem,6vw,2.15rem)] font-bold leading-[1.12] text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-4 text-[clamp(1rem,4.4vw,1.1rem)] font-medium leading-relaxed text-muted">
                    {item.description}
                  </p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
