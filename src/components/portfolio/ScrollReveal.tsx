"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  id?: string;
  role?: string;
  "aria-label"?: string;
};

export default function ScrollReveal({
  children,
  className = "",
  delay = 0,
  id,
  role,
  "aria-label": ariaLabel,
}: ScrollRevealProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return (
      <div id={id} role={role} aria-label={ariaLabel} className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      id={id}
      role={role}
      aria-label={ariaLabel}
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18, margin: "0px 0px -80px 0px" }}
      transition={{
        duration: 0.55,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
