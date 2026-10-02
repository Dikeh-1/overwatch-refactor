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
  sm: { size: 44, text: "text-[0.68rem]" },
  md: { size: 68, text: "text-xs" },
  lg: { size: 92, text: "text-xs" },
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
    <div className={`inline-flex flex-col items-center justify-center select-none gap-2.5 ${className}`}>
      {/* Original Rotate Orbit Lottie customized with Overwatch O */}
      <div
        className="relative flex items-center justify-center shrink-0"
        style={{ width: cfg.size, height: cfg.size }}
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
            className="rounded-full border-2 border-slate-300 dark:border-white/20 border-t-sky-500 animate-spin"
            style={{ width: cfg.size * 0.7, height: cfg.size * 0.7 }}
          />
        )}
      </div>

      {/* Tiny Operational Status Label Underneath */}
      {label && (
        <span
          className={`font-mono text-slate-400 dark:text-slate-300 font-medium tracking-wide ${cfg.text} text-center`}
        >
          {label}
        </span>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-[#0a1128]/95 border border-white/10 shadow-2xl">
          {content}
        </div>
      </div>
    );
  }

  return content;
}
