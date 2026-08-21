"use client";

import ReactDOM from "react-dom";

export default function PreloadHomeHero() {
  ReactDOM.preload("/hero_dark.webp", {
    as: "image",
    type: "image/webp",
    fetchPriority: "high",
  });

  return null;
}
