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
    image: "/guard-sleeping.jpg",
  },
  {
    id: "detection",
    title: "Detect Incidents Earlier",
    description:
      "CCTV footage is often reviewed only after stock loss, intrusion, or damage has already happened. Overwatch helps detect suspicious activity earlier so action can be taken faster.",
    image: "/weapon-detection.png",
  },
  {
    id: "visibility",
    title: "Improve Management Visibility",
    description:
      "Owners, directors, and operations managers gain better visibility into what is happening across their sites, even when they are not physically present.",
    image: "/surveillance-control-room.png",
  },
  {
    id: "accountability",
    title: "Strengthen Accountability",
    description:
      "When a site is monitored actively, staff and guards know that critical areas are being watched and incidents are being recorded. This improves accountability and reduces reliance on manual reporting alone.",
    image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80",
  },
  {
    id: "protection",
    title: "Protect Stock, Assets, and Operations",
    description:
      "For businesses with high-value inventory, vehicles, equipment, or cash flow, delayed detection can be expensive. Overwatch helps protect your operational continuity by reducing blind spots and improving incident escalation.",
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80",
  },
];

const totalItems = storytellingItems.length;

function SectionIntro({ id }: { id: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <h2
        id={id}
        className="text-[clamp(2rem,4vw,3.5rem)] font-bold leading-[1.08] text-foreground"
      >
        {sectionTitle}
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-[clamp(1rem,1.6vw,1.25rem)] leading-relaxed text-muted">
        {sectionDescription}
      </p>
    </div>
  );
}

export default function WhyChoose() {
  const desktopSectionRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const prefersReducedMotion = useReducedMotion();
  const activeItem = storytellingItems[activeIndex];

  const { scrollYProgress } = useScroll({
    target: desktopSectionRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const nextIndex = Math.min(totalItems - 1, Math.floor(latest * totalItems));
    setActiveIndex((currentIndex) =>
      currentIndex === nextIndex ? currentIndex : nextIndex,
    );
  });

  return (
    <>
      <section
        ref={desktopSectionRef}
        aria-labelledby="why-choose-title"
        className="relative hidden bg-primary-darker lg:block lg:min-h-[420svh]"
      >
        <div className="sticky top-0 flex min-h-[100svh] w-full items-center py-16 xl:py-20">
          <div className="absolute inset-0 bg-gradient-to-b from-primary-darker via-primary-dark/55 to-primary-darker" />
          <div className="absolute inset-0 bg-[radial-gradient(at_center_top,rgba(96,165,250,0.08)_0%,transparent_50%)]" />

          <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-8 px-6 lg:px-8">
            <SectionIntro id="why-choose-title" />

            <div className="relative">
              <AnimatePresence mode="wait" initial={false}>
                <motion.article
                  key={activeItem.id}
                  initial={
                    prefersReducedMotion ? false : { opacity: 0, y: 18 }
                  }
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -18 }}
                  transition={{
                    duration: prefersReducedMotion ? 0 : 0.35,
                    ease: "easeOut",
                  }}
                  className="grid w-full items-center gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)] lg:gap-12 xl:gap-16"
                >
                  <div className="relative aspect-[16/10] min-h-64 w-full overflow-hidden rounded-lg shadow-2xl shadow-black/50 ring-1 ring-white/10 lg:h-[clamp(16rem,40svh,32rem)] lg:aspect-auto">
                    <Image
                      src={activeItem.image}
                      alt={activeItem.title}
                      fill
                      className="object-cover"
                      sizes="(min-width: 1280px) 650px, 52vw"
                      priority={activeIndex === 0}
                      unoptimized={activeItem.image.startsWith("http")}
                    />
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary-darker/55 to-transparent" />
                  </div>

                  <div className="max-w-2xl">
                    <h3 className="text-[clamp(1.75rem,3vw,3.4rem)] font-bold leading-[1.1] text-foreground">
                      {activeItem.title}
                    </h3>
                    <p className="mt-5 text-[clamp(1rem,1.45vw,1.25rem)] font-medium leading-[1.65] text-muted">
                      {activeItem.description}
                    </p>

                    <div
                      className="mt-8 flex items-center gap-3"
                      aria-label="Why Businesses Choose Overwatch progress"
                    >
                      {storytellingItems.map((item, index) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActiveIndex(index)}
                          aria-label={`Show ${item.title}`}
                          aria-current={index === activeIndex ? "step" : undefined}
                          className={`h-2.5 rounded-full transition-all duration-300 ${
                            index === activeIndex
                              ? "w-10 bg-accent"
                              : "w-2.5 bg-slate-400/35 hover:bg-slate-300/70"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </motion.article>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="why-choose-mobile-title"
        className="relative bg-primary-darker px-4 py-16 pb-28 sm:px-6 lg:hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary-darker via-primary-dark/55 to-primary-darker" />
        <div className="absolute inset-0 bg-[radial-gradient(at_center_top,rgba(96,165,250,0.08)_0%,transparent_50%)]" />

        <div className="relative z-10 mx-auto w-full max-w-3xl">
          <SectionIntro id="why-choose-mobile-title" />

          <div className="mt-12 grid gap-12">
            {storytellingItems.map((item, index) => (
              <motion.article
                key={item.id}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
                whileInView={
                  prefersReducedMotion ? undefined : { opacity: 1, y: 0 }
                }
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="w-full"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg shadow-xl shadow-black/40 ring-1 ring-white/10">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 639px) calc(100vw - 2rem), (max-width: 1023px) min(42rem, calc(100vw - 3rem)), 650px"
                    priority={index === 0}
                    unoptimized={item.image.startsWith("http")}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary-darker/70 to-transparent" />
                </div>

                <div className="mt-5">
                  <h3 className="text-[clamp(1.5rem,7vw,2.25rem)] font-bold leading-[1.12] text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-4 text-[clamp(1rem,4.5vw,1.125rem)] font-medium leading-relaxed text-muted">
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
