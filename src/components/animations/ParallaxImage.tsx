"use client";

import { useRef, ReactNode } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

interface ParallaxImageProps {
  children: ReactNode; // Should be a Next.js <Image> or <img>
  className?: string;
  scale?: number; // e.g. 1.15 means image is 15% larger to allow movement room
  speed?: number; // 0.0–0.5 recommended
}

/**
 * Wraps an image with a parallax scroll effect.
 * The outer div clips the image; the image inside scrolls at a different rate.
 * Scale the image slightly so edges are never exposed during travel.
 */
export default function ParallaxImage({
  children,
  className = "",
  scale = 1.2,
  speed = 0.2,
}: ParallaxImageProps) {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const range = 80 * speed;
  const y = useTransform(scrollYProgress, [0, 1], [`-${range}px`, `${range}px`]);

  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      <motion.div
        style={{
          y,
          scale,
          transformOrigin: "center center",
        }}
        className="relative w-full h-full"
      >
        {children}
      </motion.div>
    </div>
  );
}
