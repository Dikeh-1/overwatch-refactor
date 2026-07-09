"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface InteractiveCardProps {
  children: ReactNode;
  className?: string;
  tilt?: boolean;
}

export default function InteractiveCard({ children, className = "", tilt = false }: InteractiveCardProps) {
  return (
    <motion.div
      whileHover={{
        y: -5,
        scale: 1.02,
        rotateX: tilt ? 2 : 0,
        rotateY: tilt ? -2 : 0,
        transition: { duration: 0.2, ease: "easeOut" },
      }}
      whileTap={{ scale: 0.98 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
