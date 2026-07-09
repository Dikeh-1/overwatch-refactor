"use client";

import Particles, { ParticlesProvider } from "@tsparticles/react";
import { useSyncExternalStore } from "react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { initParticles } from "@/lib/particles";

function subscribeToHydration() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export default function ContactParticles() {
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    getClientSnapshot,
    getServerSnapshot,
  );
  const { theme } = useTheme();

  if (!mounted) return null;

  const isDark = theme === "dark";
  const particleColor = isDark ? "#ffffff" : "#1a1a2e";

  return (
    <ParticlesProvider init={initParticles}>
      <Particles
        id="tsparticles-contact"
        className="absolute inset-0 w-full h-full pointer-events-auto"
        options={{
          fullScreen: { enable: false },
          background: { color: { value: "transparent" } },
          fpsLimit: 60,
          interactivity: {
            events: {
              onHover: { enable: true, mode: "grab" },
              onClick: { enable: true, mode: "push" },
            },
            modes: {
              grab: { distance: 150, links: { opacity: isDark ? 0.25 : 0.15 } },
              push: { quantity: 2 },
            },
          },
          particles: {
            color: { value: particleColor },
            links: {
              color: particleColor,
              distance: 150,
              enable: true,
              opacity: isDark ? 0.05 : 0.08,
              width: 1,
            },
            move: {
              direction: "none",
              enable: true,
              outModes: { default: "bounce" },
              random: false,
              speed: 0.8,
              straight: false,
            },
            number: {
              density: { enable: true, width: 800, height: 800 },
              value: 30,
            },
            opacity: { value: isDark ? 0.15 : 0.2 },
            shape: { type: "circle" },
            size: { value: { min: 1, max: 2 } },
          },
          detectRetina: true,
        }}
      />
    </ParticlesProvider>
  );
}
