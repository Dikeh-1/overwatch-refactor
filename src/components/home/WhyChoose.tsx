"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "framer-motion";

const sectionTitle = "Why Businesses Choose Overwatch";
const sectionDescription =
  "We complement your physical security measures to provide active, intelligent site control.";

const storytellingItems = [
  {
    id: "guards",
    title: "Reduce Dependence on Physical Guards",
    description:
      "Physical guards remain useful, but they cannot watch every camera, every second. Overwatch supports your team with active monitoring so important activity is detected.",
    image: "/guard-sleeping.webp",
  },
  {
    id: "detection",
    title: "Detect Incidents Earlier",
    description:
      "CCTV footage is often reviewed only after stock loss, intrusion, or damage has already happened. Overwatch helps detect suspicious activity earlier so action can be taken faster.",
    image: "/weapon-detection.webp",
  },
  {
    id: "visibility",
    title: "Improve Management Visibility",
    description:
      "Owners, directors, and operations managers gain better visibility into what is happening across their sites, even when they are not physically present.",
    image: "/surveillance-control-room.webp",
  },
  {
    id: "accountability",
    title: "Strengthen Accountability",
    description:
      "When a site is monitored actively, staff and guards know that critical areas are being watched and incidents are being recorded. This improves accountability and reduces reliance on manual reporting alone.",
    image: "/monitoring.webp",
  },
  {
    id: "protection",
    title: "Protect Stock, Assets, and Operations",
    description:
      "For businesses with high-value inventory, vehicles, equipment, or cash flow, delayed detection can be expensive. Overwatch helps protect your operational continuity by reducing blind spots and improving incident escalation.",
    image: "/business-bg.webp",
  },
];

const totalItems = storytellingItems.length;

function SectionIntro({ id }: { id: string }) {
  return (
    <div className="mx-auto max-w-4xl text-center">
      <h2
        id={id}
        className="text-[clamp(1.75rem,3vw,2.9rem)] font-bold leading-[1.08] text-foreground"
      >
        {sectionTitle}
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-[clamp(0.98rem,1.2vw,1.12rem)] leading-relaxed text-muted">
        {sectionDescription}
      </p>
    </div>
  );
}

function ProgressDots({ activeIndex }: { activeIndex: number }) {
  return (
    <div
      className="flex items-center gap-2"
      aria-label={`Why Businesses Choose Overwatch progress: ${activeIndex + 1} of ${totalItems}`}
    >
      {storytellingItems.map((item, index) => (
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
  const desktopSectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);

  const { scrollYProgress } = useScroll({
    target: desktopSectionRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const nextIndex = Math.min(
      totalItems - 1,
      Math.max(0, Math.floor(latest * totalItems)),
    );

    setActiveIndex((currentIndex) =>
      currentIndex === nextIndex ? currentIndex : nextIndex,
    );
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
                initial={
                  prefersReducedMotion ? false : { opacity: 0, y: 18 }
                }
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
                  <ProgressDots activeIndex={activeIndex} />
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
                whileInView={
                  prefersReducedMotion ? undefined : { opacity: 1, y: 0 }
                }
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
