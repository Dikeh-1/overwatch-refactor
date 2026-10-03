"use client";

import React, { useState, useEffect } from "react";
import CelebrationOverlay from "./CelebrationOverlay";
import type { CelebrationDetail } from "@/lib/celebration";

export default function GlobalCelebrationListener() {
  const [celebration, setCelebration] = useState<CelebrationDetail | null>(null);

  useEffect(() => {
    const handleEvent = (e: Event) => {
      const customEvent = e as CustomEvent<CelebrationDetail>;
      if (customEvent.detail) {
        setCelebration(customEvent.detail);
      }
    };

    window.addEventListener("overwatch-celebrate", handleEvent);
    return () => window.removeEventListener("overwatch-celebrate", handleEvent);
  }, []);

  if (!celebration) return null;

  return (
    <CelebrationOverlay
      show={true}
      onClose={() => setCelebration(null)}
      title={celebration.title}
      subtitle={celebration.subtitle}
      candidateName={celebration.candidateName}
      roleName={celebration.roleName}
      variant={celebration.variant || "next_phase"}
      autoCloseMs={celebration.autoCloseMs}
    />
  );
}
