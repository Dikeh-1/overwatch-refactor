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

  // Load the locale-specific CCTV card stack JSON (English or Portuguese)
  useEffect(() => {
    let isMounted = true;
    const animPath = isPt
      ? "/animations/cctv-card-stack-pt.json"
      : "/animations/cctv-card-stack-en.json";

    fetch(animPath)
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
  }, [isPt]);

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
    <div className="relative w-full overflow-hidden py-4 sm:py-6 select-none bg-transparent">
      {/* Main Fan-Out Deck Display Container (Large, Screen-filling, Prominent) */}
      <div className="relative z-10 w-full max-w-[1600px] 2xl:max-w-[1780px] mx-auto flex items-center justify-center">
        {/* Horizontal scroll container for mobile screens with touch support */}
        <div className="w-full overflow-x-auto sm:overflow-x-visible pb-2 sm:pb-0 scrollbar-none">
          <div className="min-w-[680px] sm:min-w-0 w-full flex items-center justify-center">
            {/* Aspect ratio frame that frames the card deck with ample breathing room */}
            <div className="relative w-full aspect-[1658/820] min-h-[460px] sm:min-h-[560px] md:min-h-[640px] lg:min-h-[740px] xl:min-h-[820px] flex items-center justify-center">
              {animationData ? (
                <div
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  onClick={handleToggle}
                  title={t("Hover or click to fan out cards", "Passe o cursor ou clique para abrir as cartas")}
                  className="absolute inset-0 -top-[16%] -bottom-[8%] flex items-center justify-center cursor-pointer scale-105 sm:scale-115 md:scale-120 lg:scale-125 xl:scale-130 transition-transform duration-300"
                >
                  <Lottie
                    lottieRef={lottieRef}
                    animationData={animationData}
                    loop={false}
                    autoplay={false}
                    onComplete={handleComplete}
                    className="w-full h-full object-contain"
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
