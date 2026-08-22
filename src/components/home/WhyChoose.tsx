"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "framer-motion";

const STORY_IMAGES = [
  "/weapon-detection.webp",
  "/monitoring.webp",
  "/security-problems.webp",
  "/business-bg.webp",
  "/surveillance-control-room.webp",
];

function SectionIntro({ id }: { id: string }) {
  const t = useTranslations("whyChoose");

  return (
    <div className="mx-auto max-w-4xl text-center">
      <h2
        id={id}
        className="text-[clamp(1.75rem,3vw,2.9rem)] font-bold leading-[1.08] tracking-[-0.03em] text-foreground"
      >
        {t("title")}
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-[clamp(0.92rem,1.2vw,1.12rem)] leading-relaxed text-muted">
        {t("description")}
      </p>
    </div>
  );
}

function ProgressDots({
  activeIndex,
  items,
}: {
  activeIndex: number;
  items: { id: string }[];
}) {
  const t = useTranslations("whyChoose");

  return (
    <div
      className="flex items-center gap-2"
      aria-label={`${t("title")} progress: ${activeIndex + 1} of ${items.length}`}
    >
      {items.map((item, index) => (
        <span
          key={item.id}
          className={`h-1.5 rounded-full transition-[width,background-color] duration-300 ${
            index === activeIndex ? "w-9 bg-accent" : "w-1.5 bg-slate-400/35"
          }`}
        />
      ))}
    </div>
  );
}

export default function WhyChoose() {
  const t = useTranslations("whyChoose");
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);

  const storytellingItems = [
    {
      id: "detection",
      title: t("benefits.detection.title"),
      description: t("benefits.detection.description"),
      image: STORY_IMAGES[0],
    },
    {
      id: "verification",
      title: t("benefits.verification.title"),
      description: t("benefits.verification.description"),
      image: STORY_IMAGES[1],
    },
    {
      id: "existingCCTV",
      title: t("benefits.existingCCTV.title"),
      description: t("benefits.existingCCTV.description"),
      image: STORY_IMAGES[2],
    },
    {
      id: "accountability",
      title: t("benefits.accountability.title"),
      description: t("benefits.accountability.description"),
      image: STORY_IMAGES[3],
    },
    {
      id: "integratedSecurity",
      title: t("benefits.integratedSecurity.title"),
      description: t("benefits.integratedSecurity.description"),
      image: STORY_IMAGES[4],
    },
  ];

  const totalItems = storytellingItems.length;
  const { scrollYProgress } = useScroll({
    target: sectionRef,
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

  useEffect(() => {
    STORY_IMAGES.slice(activeIndex + 1, activeIndex + 3).forEach((src) => {
      const image = new window.Image();
      image.src = src;
    });
  }, [activeIndex]);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="why-choose-title"
      className="relative min-h-[430svh] bg-primary-darker sm:min-h-[450svh] lg:min-h-[500svh]"
    >
      <div className="sticky top-0 flex min-h-[100svh] w-full items-center overflow-hidden py-16 sm:py-12 lg:py-8 xl:py-10">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-darker via-primary-dark/55 to-primary-darker" />
        <div className="absolute inset-0 bg-[radial-gradient(at_center_top,rgba(96,165,250,0.08)_0%,transparent_50%)]" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionIntro id="why-choose-title" />

          <AnimatePresence initial={false} mode="wait">
            <motion.article
              key={activeItem.id}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -14 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="mt-7 grid w-full min-w-0 items-center gap-5 sm:mt-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)] lg:gap-8 xl:gap-12"
            >
              <div className="relative aspect-[16/9] max-h-[34svh] w-full overflow-hidden rounded-xl shadow-xl shadow-black/30 ring-1 ring-white/10 lg:aspect-auto lg:h-[clamp(13rem,34svh,26rem)]">
                <Image
                  src={activeItem.image}
                  alt={activeItem.title}
                  fill
                  priority={activeIndex === 0}
                  unoptimized
                  className="object-cover"
                  sizes="(max-width: 1023px) calc(100vw - 2rem), (min-width: 1280px) 650px, 52vw"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-primary-darker/45 to-transparent" />
              </div>

              <div className="min-w-0 max-w-2xl">
                <ProgressDots activeIndex={activeIndex} items={storytellingItems} />
                <p className="mt-3 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-muted/65">
                  {String(activeIndex + 1).padStart(2, "0")} / {String(totalItems).padStart(2, "0")}
                </p>
                <h3 className="mt-2 text-[clamp(1.4rem,5.8vw,2.75rem)] font-bold leading-[1.08] tracking-[-0.025em] text-foreground">
                  {activeItem.title}
                </h3>
                <p className="mt-3 text-[clamp(0.95rem,3.9vw,1.08rem)] font-normal leading-relaxed text-muted lg:mt-4 lg:font-medium lg:leading-[1.58]">
                  {activeItem.description}
                </p>
              </div>
            </motion.article>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
