"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, ChevronDown } from "lucide-react";

export default function ScrollToTop() {
  const t = useTranslations("preferences");
  const [isVisible, setIsVisible] = useState(false);
  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const lastScrollY = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const isAtBottom = window.innerHeight + currentScrollY >= document.documentElement.scrollHeight - 50;
      
      // Update direction (with a small 5px threshold to avoid jitter)
      if (currentScrollY > lastScrollY.current + 5) {
        setIsScrollingDown(true);
      } else if (currentScrollY < lastScrollY.current - 5) {
        setIsScrollingDown(false);
      }
      lastScrollY.current = currentScrollY;

      // Show button if we are scrolled down a bit AND not at the bottom
      if (currentScrollY > 100 && !isAtBottom) {
        setIsVisible(true);
        
        // Reset the inactivity timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        // Hide after 1.5 seconds of scrolling inactivity
        timeoutRef.current = setTimeout(() => {
          setIsVisible(false);
        }, 1500);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleClick = () => {
    if (isScrollingDown) {
      // Scroll down to the next section (~80% of viewport)
      window.scrollBy({ top: window.innerHeight * 0.8, behavior: "smooth" });
    } else {
      // Scroll all the way to top
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          onClick={handleClick}
          className="group fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-[90] flex h-11 w-11 touch-manipulation items-center justify-center rounded-xl bg-primary-darker/75 text-foreground/70 shadow-md backdrop-blur-md transition-all duration-300 hover:bg-primary-dark/90 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:bottom-6 sm:left-6"
          aria-label={isScrollingDown ? t("scrollDown") : t("scrollTop")}
        >
          {isScrollingDown ? (
            <ChevronDown size={22} className="group-hover:translate-y-0.5 transition-transform duration-300" />
          ) : (
            <ChevronUp size={22} className="group-hover:-translate-y-0.5 transition-transform duration-300" />
          )}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
