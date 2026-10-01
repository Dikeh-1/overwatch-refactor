"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { RotateCcw } from "lucide-react";

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

  // Animate the cards to fan out (frame 117 to 196) and hold open
  const openFanOut = () => {
    if (lottieRef.current && typeof lottieRef.current.playSegments === "function") {
      try {
        lottieRef.current.playSegments([117, 196], true);
      } catch (e) {
        try {
          lottieRef.current.goToAndStop(196, true);
        } catch (err) {}
      }
    }
  };

  useEffect(() => {
    if (!animationData) return;
    const timer = setTimeout(() => {
      openFanOut();
    }, 150);
    return () => clearTimeout(timer);
  }, [animationData]);

  return (
    <div className="relative w-full overflow-hidden py-4 sm:py-8 select-none">
      {/* Dynamic ambient cybernetic glow centered behind the fan-out arc */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="h-[380px] w-[88%] max-w-[1050px] rounded-full bg-gradient-to-r from-purple-500/15 via-cyan-500/20 to-emerald-500/15 blur-3xl opacity-75" />
      </div>

      {/* Main Fan-Out Deck Display Container (Large, Centered, Prominent) */}
      <div className="relative z-10 w-full max-w-7xl mx-auto">
        {/* Horizontal scroll container for mobile screens so cards stay large and readable */}
        <div className="w-full overflow-x-auto sm:overflow-x-visible pb-4 sm:pb-0 scrollbar-none">
          <div className="min-w-[720px] sm:min-w-0 w-full flex items-center justify-center">
            {/* Aspect ratio frame that trims the empty void at top & bottom of the 1658x1327 canvas */}
            <div className="relative w-full aspect-[1658/820] max-h-[720px] lg:max-h-[780px] flex items-center justify-center overflow-hidden">
              {animationData ? (
                <div
                  onClick={openFanOut}
                  title={t("Click to replay fan out animation", "Clique para repetir a animação")}
                  className="absolute inset-0 -top-[23%] -bottom-[12%] flex items-center justify-center cursor-pointer"
                >
                  <Lottie
                    lottieRef={lottieRef}
                    animationData={animationData}
                    loop={false}
                    autoplay={false}
                    onDOMLoaded={openFanOut}
                    className="w-full h-full object-contain filter drop-shadow-[0_24px_50px_rgba(0,0,0,0.7)]"
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

        {/* Minimal interactive footer hint */}
        <div className="mt-2 flex items-center justify-center gap-2 text-[11px] text-muted">
          <button
            type="button"
            onClick={openFanOut}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background/60 backdrop-blur-sm px-3.5 py-1 hover:border-foreground/30 hover:text-foreground transition-all cursor-pointer"
          >
            <RotateCcw size={12} className="text-cyan-400" />
            <span>{t("Replay card fan-out", "Repetir abertura das cartas")}</span>
          </button>
          <span className="sm:hidden text-[10px] text-muted/70">
            • {t("Swipe horizontally to view all cards", "Deslize para ver todas as cartas")}
          </span>
        </div>
      </div>
    </div>
  );
}
