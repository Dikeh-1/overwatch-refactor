"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

interface OverwatchOrbitLoaderProps {
  label?: string;
  size?: "sm" | "md" | "lg";
  fullscreen?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { container: 48, dot: 6, text: "text-[11px]" },
  md: { container: 72, dot: 8, text: "text-xs" },
  lg: { container: 104, dot: 12, text: "text-xs" },
};

export default function OverwatchOrbitLoader({
  label,
  size = "md",
  fullscreen = false,
  className = "",
}: OverwatchOrbitLoaderProps) {
  const [animationData, setAnimationData] = useState<any>(null);
  const cfg = sizeMap[size] || sizeMap.md;

  useEffect(() => {
    let isMounted = true;
    fetch("/animations/rotate-orbit.json")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) setAnimationData(data);
      })
      .catch((err) => {
        console.warn("Failed to load orbit animation:", err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const content = (
    <div className={`inline-flex flex-col items-center justify-center select-none gap-2 ${className}`}>
      {/* Pristine Rotate Orbit Lottie with Overwatch Center Mark */}
      <div
        className="relative flex items-center justify-center shrink-0"
        style={{ width: cfg.container, height: cfg.container }}
      >
        {animationData ? (
          <Lottie
            animationData={animationData}
            loop={true}
            autoplay={true}
            className="w-full h-full"
          />
        ) : (
          <div
            className="rounded-full border-2 border-slate-200 border-t-[#0a1128] animate-spin"
            style={{ width: cfg.container * 0.6, height: cfg.container * 0.6 }}
          />
        )}

        {/* Crisp Overwatch "O" Center Core */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          aria-hidden="true"
        >
          <div
            className="rounded-full bg-[#0a1128] shadow-xs"
            style={{ width: cfg.dot, height: cfg.dot }}
          />
        </div>
      </div>

      {/* Tiny Operational Status Label Underneath */}
      {label && (
        <span
          className={`font-medium text-slate-600 dark:text-slate-300 ${cfg.text} text-center tracking-tight`}
        >
          {label}
        </span>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
        <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white border border-slate-200 shadow-2xl">
          {content}
        </div>
      </div>
    );
  }

  return content;
}
