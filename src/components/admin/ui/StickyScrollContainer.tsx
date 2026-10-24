"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

  // Recalculate dimensions & visibility
  const updateMetrics = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const overflow = el.scrollWidth > el.clientWidth + 2;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    setHasOverflow(overflow);
    setScrollWidth(el.scrollWidth);

    // Visible when table is on screen and bottom edge is off-screen (below viewport)
    const isTopInView = rect.top < viewportHeight - 30;
    const isBottomOffscreen = rect.bottom > viewportHeight;
    const isNotPastTop = rect.bottom > 60;

    const shouldShowSticky = overflow && isTopInView && isBottomOffscreen && isNotPastTop;
    setIsStickyVisible(shouldShowSticky);

    // Compute horizontal bounds restricted to viewport
    const left = Math.max(0, rect.left);
    const right = Math.min(viewportWidth, rect.right);
    const width = Math.max(0, right - left);

    setBarBounds({ left, width });

    // Sync floating bar scrollLeft to current container scrollLeft
    if (floatingBarRef.current && el && shouldShowSticky) {
      if (Math.abs(floatingBarRef.current.scrollLeft - el.scrollLeft) > 1) {
        floatingBarRef.current.scrollLeft = el.scrollLeft;
      }
    }
  }, []);

  // Listen to window scroll & resize events
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

  // Observe container & table size changes via ResizeObserver
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

  // Bi-directional scroll synchronization
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

  // Convert mouse wheel vertical scroll to horizontal scroll when hovering over the sticky bar
  const handleFloatingWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY && !e.deltaX) {
      e.preventDefault();
      if (containerRef.current) {
        containerRef.current.scrollLeft += e.deltaY;
      }
    }
  };

  const scrollLeftBy = (amount: number) => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: amount, behavior: "smooth" });
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

      {/* Floating Sticky Horizontal Scrollbar Pinned to Viewport Bottom */}
      {isStickyVisible && barBounds.width > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: barBounds.left,
            width: barBounds.width,
            zIndex: 35,
          }}
          className="flex items-center bg-[#0b1329] text-white shadow-2xl border-t border-slate-700 px-3 py-1.5 gap-2.5 select-none transition-opacity duration-150 animate-in fade-in"
        >
          {/* Scroll Left Button */}
          <button
            type="button"
            onClick={() => scrollLeftBy(-280)}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-white transition-colors shrink-0 cursor-pointer text-xs flex items-center gap-1 font-bold shadow-xs"
            title="Deslizar colunas para a esquerda (Previous columns)"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Center Scroll Track + Informative Label */}
          <div className="flex-1 flex flex-col justify-center min-w-0">
            <div className="flex items-center justify-between text-[10px] text-slate-300 font-medium px-1 mb-1">
              <span className="flex items-center gap-1 text-sky-300 font-semibold">
                <span>↔ Deslize para ver todas as colunas / Scroll for more columns</span>
              </span>
              <span className="text-slate-400 font-mono text-[9px] hidden sm:inline">
                Tabela ampla
              </span>
            </div>

            {/* Custom Horizontal Scrollbar Strip */}
            <div
              ref={floatingBarRef}
              onScroll={handleFloatingScroll}
              onWheel={handleFloatingWheel}
              className="w-full overflow-x-auto floating-horizontal-scrollbar h-2 rounded bg-slate-800"
              title="Role a barra ou utilize as setas laterais para visualizar colunas adicionais"
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

          {/* Scroll Right Button */}
          <button
            type="button"
            onClick={() => scrollLeftBy(280)}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-white transition-colors shrink-0 cursor-pointer text-xs flex items-center gap-1 font-bold shadow-xs"
            title="Deslizar colunas para a direita (Next columns)"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
