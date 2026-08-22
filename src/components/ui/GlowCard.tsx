"use client";

import { cn } from "@/lib/utils";

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

  return (
    <div
      className={cn(
        "group relative rounded-xl border border-border bg-card/60 backdrop-blur-sm p-6 md:p-8",
        hover &&
          "transition-[transform,border-color,background-color] duration-300 hover:border-accent/40 md:hover:-translate-y-0.5",
        className
      )}
    >
      <div className={cn("relative h-full", contentClassName)}>
        {/* High-Tech HUD Corners */}
        {techCorners && (
          <div className="pointer-events-none absolute inset-0 max-md:hidden">
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
    </div>
  );
}
