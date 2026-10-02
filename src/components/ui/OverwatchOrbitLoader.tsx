"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import lightAnimation from "@/../public/animations/rotate-orbit-light.json";
import darkAnimation from "@/../public/animations/rotate-orbit-dark.json";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

export interface OverwatchOrbitLoaderProps {
  label?: string;
  size?: "xs" | "sm" | "md" | "lg";
  theme?: "light" | "dark" | "auto";
  fullscreen?: boolean;
  className?: string;
}

const sizeMap = {
  xs: { container: 20, dot: 5, text: "text-[10px]" },
  sm: { container: 54, dot: 11, text: "text-xs font-medium" },
  md: { container: 96, dot: 16, text: "text-xs font-semibold" },
  lg: { container: 140, dot: 22, text: "text-sm font-semibold" },
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
    <div className={`inline-flex flex-col items-center justify-center select-none gap-2 ${className}`}>
      {/* Refined Sleek Rotate Orbit Lottie */}
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

        {/* Sleek Overwatch "O" Center Core (Hollow, slim ring) */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          aria-hidden="true"
        >
          <div
            className={`rounded-full border-[1.5px] transition-colors flex items-center justify-center ${
              isDark
                ? "border-white/90 shadow-[0_0_6px_rgba(255,255,255,0.25)]"
                : "border-[#0a1128] shadow-[0_0_6px_rgba(10,17,40,0.12)]"
            }`}
            style={{ width: cfg.dot, height: cfg.dot }}
          >
            <div
              className={`rounded-full ${
                isDark ? "bg-[#00ded3]" : "bg-[#0a1128]"
              }`}
              style={{
                width: Math.max(2, Math.round(cfg.dot * 0.25)),
                height: Math.max(2, Math.round(cfg.dot * 0.25)),
              }}
            />
          </div>
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
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
        <div className="flex flex-col items-center justify-center p-7 rounded-2xl bg-[#0a1128] border border-white/15 shadow-2xl">
          {content}
        </div>
      </div>
    );
  }

  return content;
}
