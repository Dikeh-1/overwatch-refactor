"use client";

import { useRef, ReactNode } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

interface ParallaxSectionProps {
  children: ReactNode;
  className?: string;
  speed?: number; // 0.1 = subtle, 0.5 = dramatic
  direction?: "up" | "down";
}

/**
 * Wraps section content with a scroll-driven parallax Y offset.
 * Uses hardware-accelerated `transform` only — zero layout thrashing.
 */
export default function ParallaxSection({
  children,
  className = "",
  speed = 0.15,
  direction = "up",
}: ParallaxSectionProps) {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const range = 120 * speed;
  const yOutput = direction === "up" ? [range, -range] : [-range, range];

  const rawY = useTransform(scrollYProgress, [0, 1], yOutput);
  // Spring adds inertia smoothness on top of the direct scroll link
  const y = useSpring(rawY, { stiffness: 60, damping: 20, mass: 0.8 });

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <motion.div style={{ y }} className="h-full">
        {children}
      </motion.div>
    </div>
  );
}
