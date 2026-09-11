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
  rootMargin = "600px",
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

    // Mobile browsers (iOS Safari, Android Chrome) strictly require muted and playsInline
    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");

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

    video.muted = true;
    video.defaultMuted = true;
    video.load();

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Fallback: If device is in low-power mode and paused autoplay,
        // trigger playback on first user touch/interaction
        const resumePlayback = () => {
          video.play().catch(() => {});
          window.removeEventListener("touchstart", resumePlayback);
          window.removeEventListener("click", resumePlayback);
        };
        window.addEventListener("touchstart", resumePlayback, { once: true, passive: true });
        window.addEventListener("click", resumePlayback, { once: true, passive: true });
      });
    }
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
