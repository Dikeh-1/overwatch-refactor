"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const CHARS = "!<>-_\\\\/[]{}—=+*^?#________";

export default function ScrambleText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const timeout = window.setTimeout(() => setDisplayText(text), 0);
      return () => window.clearTimeout(timeout);
    }

    let frameId: number | undefined;
    const timeout = setTimeout(() => {
      let frame = 0;
      const length = text.length;

      const animate = () => {
        let result = "";
        for (let i = 0; i < length; i++) {
          if (frame >= i * 2) {
            result += text[i];
          } else {
            result += CHARS[Math.floor(Math.random() * CHARS.length)];
          }
        }

        setDisplayText(result);

        if (frame < length * 2) {
          frame++;
          frameId = requestAnimationFrame(animate);
        }
      };

      animate();
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.1, delay }}
    >
      {displayText}
    </motion.span>
  );
}
