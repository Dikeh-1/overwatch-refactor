"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function normalizePath(path: string): string {
  let p = path.replace(/^\/(en|pt)(\/|$)/, "/");
  if (!p.startsWith("/")) p = "/" + p;
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p;
}

function NavigationProgressBarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  const trickleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const safetyTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearAllTimers = useCallback(() => {
    if (trickleTimerRef.current) {
      clearInterval(trickleTimerRef.current);
      trickleTimerRef.current = null;
    }
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  }, []);

  const finishAndDismiss = useCallback(() => {
    clearAllTimers();
    setProgress(100);
    dismissTimerRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
      dismissTimerRef.current = null;
    }, 180);
  }, [clearAllTimers]);

  const startProgress = useCallback(() => {
    clearAllTimers();
    setVisible(true);
    setProgress(30);

    trickleTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) return prev;
        const inc = Math.floor(Math.random() * 8) + 4;
        return Math.min(prev + inc, 85);
      });
    }, 150);

    safetyTimerRef.current = setTimeout(() => {
      finishAndDismiss();
    }, 1200);
  }, [clearAllTimers, finishAndDismiss]);

  // Route change completion
  useEffect(() => {
    finishAndDismiss();
  }, [pathname, searchParams, finishAndDismiss]);

  // Click & navigation listener
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:") ||
        anchor.getAttribute("target") === "_blank" ||
        anchor.hasAttribute("download")
      ) {
        return;
      }

      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;

        const currentNorm = normalizePath(window.location.pathname);
        const targetNorm = normalizePath(url.pathname);

        // If clicking on same route, ignore completely
        if (currentNorm === targetNorm && url.search === window.location.search) {
          return;
        }

        startProgress();
      } catch {
        // ignore invalid URL
      }
    };

    const handlePopState = () => {
      startProgress();
    };

    const handleWindowLoad = () => {
      finishAndDismiss();
    };

    document.addEventListener("click", handleDocumentClick, true);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("pageshow", handleWindowLoad);
    window.addEventListener("load", handleWindowLoad);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("pageshow", handleWindowLoad);
      window.removeEventListener("load", handleWindowLoad);
      clearAllTimers();
    };
  }, [startProgress, finishAndDismiss, clearAllTimers]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[999999] h-[2px] pointer-events-none"
    >
      <div
        className="h-full bg-white transition-all"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transition:
            progress === 100
              ? "width 120ms ease-out, opacity 180ms ease-out"
              : "width 150ms ease-out",
        }}
      />
    </div>
  );
}

export default function NavigationProgressBar() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressBarInner />
    </Suspense>
  );
}
