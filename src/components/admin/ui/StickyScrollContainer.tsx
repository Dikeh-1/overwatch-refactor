"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";

interface StickyScrollContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
}

export default function StickyScrollContainer({
  children,
  className = "",
  innerClassName = "",
  ...props
}: StickyScrollContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const floatingBarRef = useRef<HTMLDivElement>(null);

  const [hasOverflow, setHasOverflow] = useState(false);
  const [isStickyVisible, setIsStickyVisible] = useState(false);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [barBounds, setBarBounds] = useState<{ left: number; width: number }>({
    left: 0,
    width: 0,
  });

  const isSyncingFromContainer = useRef(false);
  const isSyncingFromFloating = useRef(false);

  const updateMetrics = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const overflow = el.scrollWidth > el.clientWidth + 2;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    setHasOverflow(overflow);
    setScrollWidth(el.scrollWidth);

    // Visible when table is on screen and the table's native bottom is below viewport
    const isTopInView = rect.top < viewportHeight - 60;
    const isBottomOffscreen = rect.bottom > viewportHeight + 15;
    const isNotPastTop = rect.bottom > 80;

    const shouldShow = overflow && isTopInView && isBottomOffscreen && isNotPastTop;
    setIsStickyVisible(shouldShow);

    const left = Math.max(0, rect.left);
    const right = Math.min(viewportWidth, rect.right);
    const width = Math.max(0, right - left);

    setBarBounds({ left, width });

    if (floatingBarRef.current && el && shouldShow) {
      if (Math.abs(floatingBarRef.current.scrollLeft - el.scrollLeft) > 1) {
        floatingBarRef.current.scrollLeft = el.scrollLeft;
      }
    }
  }, []);

  useEffect(() => {
    updateMetrics();

    const handleScrollOrResize = () => {
      updateMetrics();
    };

    window.addEventListener("scroll", handleScrollOrResize, { passive: true });
    window.addEventListener("resize", handleScrollOrResize, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [updateMetrics]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      updateMetrics();
    });

    observer.observe(el);
    if (el.firstElementChild) {
      observer.observe(el.firstElementChild);
    }

    return () => {
      observer.disconnect();
    };
  }, [updateMetrics]);

  const handleContainerScroll = () => {
    if (isSyncingFromFloating.current) {
      isSyncingFromFloating.current = false;
      return;
    }
    isSyncingFromContainer.current = true;
    if (floatingBarRef.current && containerRef.current) {
      floatingBarRef.current.scrollLeft = containerRef.current.scrollLeft;
    }
  };

  const handleFloatingScroll = () => {
    if (isSyncingFromContainer.current) {
      isSyncingFromContainer.current = false;
      return;
    }
    isSyncingFromFloating.current = true;
    if (containerRef.current && floatingBarRef.current) {
      containerRef.current.scrollLeft = floatingBarRef.current.scrollLeft;
    }
  };

  return (
    <div className={`relative ${className}`} {...props}>
      {/* Primary Scrollable Table Container */}
      <div
        ref={containerRef}
        onScroll={handleContainerScroll}
        className={`w-full overflow-x-auto admin-scrollbar ${innerClassName}`}
      >
        {children}
      </div>

      {/* Static / Pinned Horizontal Scrollbar (Clean, 100% Native-Looking, No dark boxes or labels) */}
      {isStickyVisible && barBounds.width > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: barBounds.left,
            width: barBounds.width,
            zIndex: 35,
          }}
          className="bg-slate-50/95 backdrop-blur-xs border-t border-slate-300 shadow-md py-1 px-1 transition-opacity duration-150 animate-in fade-in"
        >
          <div
            ref={floatingBarRef}
            onScroll={handleFloatingScroll}
            className="w-full overflow-x-auto admin-scrollbar"
            style={{ height: 14 }}
          >
            <div
              style={{
                width: scrollWidth,
                minWidth: scrollWidth,
                height: 1,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
