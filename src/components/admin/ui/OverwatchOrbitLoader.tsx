"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

interface OverwatchOrbitLoaderProps {
  label?: string;
  sublabel?: string;
  size?: "sm" | "md" | "lg" | "xl";
  fullscreen?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { orbit: 84, logo: 28, text: "text-xs", gap: "gap-2" },
  md: { orbit: 130, logo: 44, text: "text-sm", gap: "gap-3" },
  lg: { orbit: 180, logo: 60, text: "text-base", gap: "gap-4" },
  xl: { orbit: 240, logo: 80, text: "text-lg", gap: "gap-5" },
};

export default function OverwatchOrbitLoader({
  label = "A processar...",
  sublabel,
  size = "md",
  fullscreen = false,
  className = "",
}: OverwatchOrbitLoaderProps) {
  const [animationData, setAnimationData] = useState<any>(null);
  const cfg = sizeMap[size] || sizeMap.md;

  useEffect(() => {
    let active = true;
    fetch("/animations/rotate-orbit.json")
      .then((res) => res.json())
      .then((data) => {
        if (active) setAnimationData(data);
      })
      .catch((err) => {
        console.warn("Failed to load orbit animation:", err);
      });
    return () => {
      active = false;
    };
  }, []);

  const content = (
    <div className={`flex flex-col items-center justify-center select-none ${cfg.gap} ${className}`}>
      {/* Orbit Rings Container with Center Overwatch "O" Mark */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: cfg.orbit, height: cfg.orbit }}
      >
        {/* Lottie Rotating Orbit Vector */}
        {animationData ? (
          <Lottie
            animationData={animationData}
            loop={true}
            autoplay={true}
            className="w-full h-full object-contain filter drop-shadow-[0_0_16px_rgba(6,182,212,0.35)]"
          />
        ) : (
          <div
            className="rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin"
            style={{ width: cfg.orbit * 0.8, height: cfg.orbit * 0.8 }}
          />
        )}

        {/* Center Overwatch "O" Emblem (Not full wordmark, just the iconic O mark) */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <div
            className="relative flex items-center justify-center rounded-full bg-[#070b14]/80 p-1.5 shadow-[0_0_20px_rgba(6,182,212,0.4)] border border-cyan-500/30 backdrop-blur-sm"
            style={{ width: cfg.logo, height: cfg.logo }}
          >
            <Image
              src="/app-icon-192.png"
              alt="Overwatch Logo"
              width={cfg.logo}
              height={cfg.logo}
              className="w-full h-full object-contain animate-pulse"
              priority
            />
          </div>
        </div>
      </div>

      {/* High-Tech Operational Status Label */}
      {label && (
        <div className="flex flex-col items-center text-center">
          <span
            className={`font-mono font-bold uppercase tracking-[0.16em] text-cyan-400 ${cfg.text} drop-shadow-[0_0_12px_rgba(6,182,212,0.5)] animate-pulse`}
          >
            {label}
          </span>
          {sublabel && (
            <span className="mt-1 text-xs text-muted-foreground/80 tracking-wide max-w-xs">
              {sublabel}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070b14]/85 backdrop-blur-md animate-in fade-in duration-200">
        <div className="rounded-2xl border border-cyan-500/30 bg-[#0c1322]/90 p-8 shadow-2xl shadow-cyan-950/50">
          {content}
        </div>
      </div>
    );
  }

  return content;
}
