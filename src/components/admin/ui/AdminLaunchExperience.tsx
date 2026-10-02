"use client";

import { useEffect, useState } from "react";
import Logo from "@/components/ui/Logo";

export default function AdminLaunchExperience() {
  const [showLaunch, setShowLaunch] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const startedAt = performance.now();
    const minVisibleMs = 450;
    const maxVisibleMs = 1000;

    const triggerHide = () => {
      const elapsed = performance.now() - startedAt;
      const remaining = Math.max(0, minVisibleMs - elapsed);
      window.setTimeout(() => {
        setIsFadingOut(true);
        window.setTimeout(() => setShowLaunch(false), 250);
      }, remaining);
    };

    if (document.readyState === "complete") {
      triggerHide();
    } else {
      window.addEventListener("load", triggerHide, { once: true });
    }

    const maxTimer = window.setTimeout(() => {
      setIsFadingOut(true);
      window.setTimeout(() => setShowLaunch(false), 250);
    }, maxVisibleMs);

    return () => {
      window.removeEventListener("load", triggerHide);
      window.clearTimeout(maxTimer);
    };
  }, []);

  if (!showLaunch) return null;

  return (
    <div
      className={`fixed inset-0 z-[99999] flex items-center justify-center bg-[#0f1117] text-white transition-opacity duration-250 ease-out select-none ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      aria-hidden="true"
    >
      <div className="flex w-full max-w-xs flex-col items-center px-8 text-center animate-in fade-in zoom-in-95 duration-200">
        <Logo size="lg" preload className="mb-8 scale-90" />
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div className="launch-progress h-full rounded-full bg-white/70" />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.4em] text-white/70">
          Loading...
        </p>
      </div>
    </div>
  );
}
