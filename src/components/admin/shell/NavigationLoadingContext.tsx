"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";

interface NavigationLoadingContextValue {
  isNavigating: boolean;
  navLabel: string;
  activeTargetHref: string | null;
  startNavigating: (label: string, targetHref?: string) => void;
  stopNavigating: () => void;
}

const NavigationLoadingContext = createContext<NavigationLoadingContextValue>({
  isNavigating: false,
  navLabel: "",
  activeTargetHref: null,
  startNavigating: () => {},
  stopNavigating: () => {},
});

export const NavigationLoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const [navLabel, setNavLabel] = useState("");
  const [activeTargetHref, setActiveTargetHref] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const stopNavigating = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsNavigating(false);
    setNavLabel("");
    setActiveTargetHref(null);
  }, []);

  const startNavigating = useCallback((label: string, targetHref?: string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setNavLabel(label);
    setActiveTargetHref(targetHref || null);
    setIsNavigating(true);

    // Safety timeout: automatically cancel after 6 seconds in case navigation is instant or aborted
    timerRef.current = setTimeout(() => {
      stopNavigating();
    }, 6000);
  }, [stopNavigating]);

  // Whenever the pathname changes, dismiss the navigation loading heads-up
  useEffect(() => {
    stopNavigating();
  }, [pathname, stopNavigating]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <NavigationLoadingContext.Provider
      value={{
        isNavigating,
        navLabel,
        activeTargetHref,
        startNavigating,
        stopNavigating,
      }}
    >
      {children}
    </NavigationLoadingContext.Provider>
  );
};

export const useNavigationLoading = () => useContext(NavigationLoadingContext);
