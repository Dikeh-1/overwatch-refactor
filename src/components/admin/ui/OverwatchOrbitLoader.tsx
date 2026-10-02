"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import lightAnimation from "@/../public/animations/rotate-orbit-light.json";
import darkAnimation from "@/../public/animations/rotate-orbit-dark.json";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

interface OverwatchOrbitLoaderProps {
  label?: string;
  size?: "sm" | "md" | "lg";
  theme?: "light" | "dark" | "auto";
  fullscreen?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { container: 96, dot: 12, text: "text-xs font-semibold" },
  md: { container: 160, dot: 20, text: "text-sm font-bold" },
  lg: { container: 220, dot: 28, text: "text-base font-bold" },
};

export default function OverwatchOrbitLoader({
  label,
  size = "md",
  theme = "auto",
  fullscreen = false,
  className = "",
}: OverwatchOrbitLoaderProps) {
  const cfg = sizeMap[size] || sizeMap.md;

  // Fullscreen always uses dark modal backdrop for maximum contrast
  const effectiveTheme = fullscreen ? "dark" : theme === "auto" ? "light" : theme;
  const isDark = effectiveTheme === "dark";

  const animationData = useMemo(() => {
    return isDark ? darkAnimation : lightAnimation;
  }, [isDark]);

  const content = (
    <div className={`inline-flex flex-col items-center justify-center select-none gap-3 ${className}`}>
      {/* Prominent Large Customized Rotate Orbit Lottie */}
      <div
        className="relative flex items-center justify-center shrink-0"
        style={{ width: cfg.container, height: cfg.container }}
      >
        <Lottie
          animationData={animationData}
          loop={true}
          autoplay={true}
          className="w-full h-full"
        />

        {/* Crisp Overwatch "O" Center Core */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          aria-hidden="true"
        >
          <div
            className={`rounded-full shadow-sm transition-colors ${
              isDark ? "bg-white" : "bg-[#0a1128]"
            }`}
            style={{ width: cfg.dot, height: cfg.dot }}
          />
        </div>
      </div>

      {/* Prominent Operational Status Label Underneath */}
      {label && (
        <span
          className={`tracking-tight text-center ${cfg.text} ${
            isDark ? "text-white" : "text-[#0a1128]"
          }`}
        >
          {label}
        </span>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
        <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-[#0a1128] border border-white/15 shadow-2xl">
          {content}
        </div>
      </div>
    );
  }

  return content;
}
