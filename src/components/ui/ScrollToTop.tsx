"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, ChevronDown } from "lucide-react";

export default function ScrollToTop() {
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
          className="fixed bottom-6 left-6 z-[90] flex items-center justify-center w-10 h-10 rounded-md bg-primary-darker/60 backdrop-blur-md text-foreground/70 hover:text-foreground hover:bg-primary-dark/90 shadow-md transition-all duration-300 focus:outline-none group"
          aria-label={isScrollingDown ? "Scroll down" : "Scroll to top"}
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
