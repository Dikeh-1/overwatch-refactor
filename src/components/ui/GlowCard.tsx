"use client";

import { cn } from "@/lib/utils";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { MouseEvent } from "react";

type GlowCardProps = {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  hover?: boolean;
  techCorners?: boolean;
  accentColor?: "gold" | "red" | "cyan" | "slate";
};

const borderColors = {
  gold: "border-accent",
  red: "border-red-500/60",
  cyan: "border-accent/60",
  slate: "border-border",
};

export default function GlowCard({
  children,
  className,
  contentClassName,
  hover = true,
  techCorners = false,
  accentColor = "gold",
}: GlowCardProps) {
  const cornerColor = borderColors[accentColor];

  // 3D Tilt Logic
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["7deg", "-7deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-7deg", "7deg"]);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!hover || window.matchMedia("(hover: none)").matches) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Normalize to [-0.5, 0.5]
    x.set(mouseX / width - 0.5);
    y.set(mouseY / height - 0.5);
  };

  const handleMouseLeave = () => {
    if (!hover || window.matchMedia("(hover: none)").matches) return;
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: hover ? rotateX : 0,
        rotateY: hover ? rotateY : 0,
        transformStyle: "preserve-3d",
      }}
      className={cn(
        "group relative rounded-xl border border-border bg-card/60 backdrop-blur-sm p-6 md:p-8",
        hover &&
          "transition-colors duration-300 hover:border-accent/40",
        className
      )}
    >
      {/* Content wrapper with translateZ for parallax depth */}
      <div 
        style={{ transform: "translateZ(30px)", transformStyle: "preserve-3d" }} 
        className={cn("h-full", contentClassName)}
      >
        {/* High-Tech HUD Corners */}
        {techCorners && (
          <div className="absolute inset-0 pointer-events-none" style={{ transform: "translateZ(20px)" }}>
            {/* Top Left */}
            <div className={cn("absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 rounded-tl-sm transition-all duration-300 group-hover:-top-2 group-hover:-left-2", cornerColor)} />
            {/* Top Right */}
            <div className={cn("absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 rounded-tr-sm transition-all duration-300 group-hover:-top-2 group-hover:-right-2", cornerColor)} />
            {/* Bottom Left */}
            <div className={cn("absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 rounded-bl-sm transition-all duration-300 group-hover:-bottom-2 group-hover:-left-2", cornerColor)} />
            {/* Bottom Right */}
            <div className={cn("absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 rounded-br-sm transition-all duration-300 group-hover:-bottom-2 group-hover:-right-2", cornerColor)} />
          </div>
        )}
        {children}
      </div>
    </motion.div>
  );
}
