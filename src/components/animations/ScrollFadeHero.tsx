"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

interface ScrollFadeHeroProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps a Hero section. As the user scrolls down, the hero content
 * fades out and slides up, creating a cinematic "scroll away" effect.
 * Applied to the hero text/content only — not the background image.
 */
export default function ScrollFadeHero({ children, className = "" }: ScrollFadeHeroProps) {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // As the hero scrolls out of view, fade and lift content
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.6], [0, -80]);

  return (
    <div ref={ref} className={className}>
      <motion.div style={{ opacity, y }}>
        {children}
      </motion.div>
    </div>
  );
}
