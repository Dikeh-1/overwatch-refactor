"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";

// Dynamically import Lottie to prevent any SSR hydration mismatch
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

interface InteractiveResponsibilityStackProps {
  locale: string;
}

export default function InteractiveResponsibilityStack({
  locale,
}: InteractiveResponsibilityStackProps) {
  const isPt = locale === "pt";
  const [animationData, setAnimationData] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const lottieRef = useRef<any>(null);

  const t = (en: string, pt: string) => (isPt ? pt : en);

  // Load the optimized CCTV card stack JSON
  useEffect(() => {
    let isMounted = true;
    fetch("/animations/cctv-card-stack.json")
      .then((res) => {
        if (!res.ok) throw new Error("Animation fetch failed");
        return res.json();
      })
      .then((data) => {
        if (isMounted) setAnimationData(data);
      })
      .catch((err) => {
        console.warn("Could not load card stack animation:", err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // When animation data first loads, start in subtle idle floating mode (frames 0 to 100)
  useEffect(() => {
    if (!animationData || !lottieRef.current) return;
    try {
      lottieRef.current.playSegments([0, 100], true);
    } catch (e) {}
  }, [animationData]);

  // Original hover effect: open / fan out (frames 117 to 196)
  const handleMouseEnter = () => {
    setIsOpen(true);
    if (lottieRef.current && typeof lottieRef.current.playSegments === "function") {
      try {
        lottieRef.current.playSegments([117, 196], true);
      } catch (e) {}
    }
  };

  // Original leave effect: close smoothly back into stack (frames 196 to 240)
  const handleMouseLeave = () => {
    setIsOpen(false);
    if (lottieRef.current && typeof lottieRef.current.playSegments === "function") {
      try {
        lottieRef.current.playSegments([196, 240], true);
      } catch (e) {}
    }
  };

  // Tap / click toggle for mobile and touch devices
  const handleToggle = () => {
    if (isOpen) {
      handleMouseLeave();
    } else {
      handleMouseEnter();
    }
  };

  // When closing segment (196-240) finishes, resume idle floating loop
  const handleComplete = () => {
    if (!isOpen && lottieRef.current && typeof lottieRef.current.playSegments === "function") {
      try {
        lottieRef.current.playSegments([0, 100], true);
      } catch (e) {}
    }
  };

  return (
    <div className="relative w-full overflow-hidden py-4 sm:py-8 select-none">
      {/* Ambient glow: visible ONLY in dark mode to keep light mode pristine and clean */}
      <div className="hidden dark:block absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="h-[360px] w-[86%] max-w-[1050px] rounded-full bg-gradient-to-r from-purple-500/15 via-cyan-500/20 to-emerald-500/15 blur-3xl opacity-70" />
      </div>

      {/* Main Fan-Out Deck Display Container (Large, Centered, Prominent) */}
      <div className="relative z-10 w-full max-w-7xl mx-auto flex items-center justify-center">
        {/* Horizontal scroll container for mobile screens with touch support */}
        <div className="w-full overflow-x-auto sm:overflow-x-visible pb-2 sm:pb-0 scrollbar-none">
          <div className="min-w-[680px] sm:min-w-0 w-full flex items-center justify-center">
            {/* Aspect ratio frame that trims the empty void at top & bottom of canvas */}
            <div className="relative w-full aspect-[1658/800] max-h-[760px] lg:max-h-[820px] flex items-center justify-center overflow-hidden">
              {animationData ? (
                <div
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  onClick={handleToggle}
                  title={t("Hover or click to fan out cards", "Passe o cursor ou clique para abrir as cartas")}
                  className="absolute inset-0 -top-[20%] -bottom-[10%] flex items-center justify-center cursor-pointer scale-105 sm:scale-110 lg:scale-115 transition-transform duration-300"
                >
                  <Lottie
                    lottieRef={lottieRef}
                    animationData={animationData}
                    loop={false}
                    autoplay={false}
                    onComplete={handleComplete}
                    className="w-full h-full object-contain filter dark:drop-shadow-[0_24px_50px_rgba(0,0,0,0.7)] drop-shadow-[0_16px_32px_rgba(15,23,42,0.12)]"
                  />
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center gap-3 text-muted text-xs">
                  <div className="h-8 w-8 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
                  <span>{t("Loading operational domains…", "A carregar domínios operacionais…")}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
