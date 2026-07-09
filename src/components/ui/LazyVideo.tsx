"use client";

import {
  type VideoHTMLAttributes,
  useEffect,
  useRef,
  useState,
} from "react";

type LazyVideoProps = Omit<VideoHTMLAttributes<HTMLVideoElement>, "children"> & {
  rootMargin?: string;
  src: string;
  type?: string;
};

export default function LazyVideo({
  rootMargin = "500px",
  src,
  type = "video/mp4",
  preload = "metadata",
  autoPlay = true,
  muted = true,
  loop = true,
  playsInline = true,
  ...videoProps
}: LazyVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (typeof IntersectionObserver === "undefined") {
      const timeoutId = window.setTimeout(() => setShouldLoad(true), 0);
      return () => window.clearTimeout(timeoutId);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [rootMargin]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !shouldLoad || !autoPlay) return;

    video.load();
    void video.play().catch(() => {
      // Autoplay can be blocked by browser policy; the poster remains visible.
    });
  }, [autoPlay, shouldLoad]);

  return (
    <video
      {...videoProps}
      ref={videoRef}
      autoPlay={Boolean(autoPlay) && shouldLoad}
      loop={loop}
      muted={muted}
      playsInline={playsInline}
      preload={shouldLoad ? preload : "none"}
    >
      {shouldLoad ? <source src={src} type={type} /> : null}
    </video>
  );
}
