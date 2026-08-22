"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

const CHARS = "!<>-_\\\\/[]{}—=+*^?#________";

export default function ScrambleText({ text, delay = 0 }: { text: string; delay?: number }) {
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const timeout = window.setTimeout(() => {
        element.textContent = text;
      }, 0);
      return () => window.clearTimeout(timeout);
    }

    let frameId: number | undefined;
    let lastPaint = 0;
    const timeout = window.setTimeout(() => {
      let frame = 0;
      const length = text.length;

      const animate = (timestamp: number) => {
        if (timestamp - lastPaint < 32) {
          frameId = requestAnimationFrame(animate);
          return;
        }

        lastPaint = timestamp;
        let result = "";
        for (let i = 0; i < length; i++) {
          if (frame >= i) {
            result += text[i];
          } else {
            result += CHARS[Math.floor(Math.random() * CHARS.length)];
          }
        }

        element.textContent = result;

        if (frame < length) {
          frame++;
          frameId = requestAnimationFrame(animate);
        } else {
          element.textContent = text;
        }
      };

      frameId = requestAnimationFrame(animate);
    }, delay * 1000);

    return () => {
      clearTimeout(timeout);
      if (frameId !== undefined) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [text, delay]);

  return (
    <motion.span
      ref={textRef}
      aria-label={text}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.1, delay }}
    >
      {"\u00A0"}
    </motion.span>
  );
}
