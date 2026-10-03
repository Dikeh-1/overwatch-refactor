"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function NavigationProgressBarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Complete and dismiss immediately on any route change
  useEffect(() => {
    setProgress(100);
    const dismissTimer = setTimeout(() => {
      setLoading(false);
      setProgress(0);
    }, 200);
    return () => clearTimeout(dismissTimer);
  }, [pathname, searchParams]);

  // Intercept click on links to show quick tactile navigation feedback
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Ignore in-page hash jumps, protocols, target="_blank", downloads
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
        if (
          url.origin === window.location.origin &&
          (url.pathname !== window.location.pathname || url.search !== window.location.search)
        ) {
          setLoading(true);
          setProgress(25);
        }
      } catch {
        // ignore invalid URL
      }
    };

    const handlePopState = () => {
      setLoading(true);
      setProgress(35);
    };

    const handleWindowLoad = () => {
      setProgress(100);
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 150);
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
    };
  }, []);

  // Incremental trickling progress while page loads
  useEffect(() => {
    if (!loading) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) return prev;
        const jump = Math.floor(Math.random() * 10) + 4;
        return Math.min(prev + jump, 85);
      });
    }, 180);

    // Guaranteed safety timeout: Never remain stuck on screen for more than 1.5 seconds
    const safetyTimeout = setTimeout(() => {
      setProgress(100);
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 200);
    }, 1500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      clearTimeout(safetyTimeout);
    };
  }, [loading]);

  if (!loading && progress === 0) return null;

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
              ? "width 120ms ease-out, opacity 200ms ease-out"
              : "width 180ms ease-out",
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
