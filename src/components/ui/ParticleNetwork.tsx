"use client";

import Particles, { ParticlesProvider } from "@tsparticles/react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { initParticles } from "@/lib/particles";

export default function ParticleNetwork({ forceDark = false }: { forceDark?: boolean }) {
  const { theme } = useTheme();

  const isDark = forceDark || theme === "dark";
  const particleColor = isDark ? "#ffffff" : "#0f1117";
  const linkColor = isDark ? "#ffffff" : "#0f1117";

  return (
    <ParticlesProvider init={initParticles}>
      <Particles
        id="tsparticles"
        className="absolute inset-0 z-0"
        options={{
          fullScreen: { enable: false },
          background: {
            color: {
              value: "transparent",
            },
          },
          fpsLimit: 120,
          interactivity: {
            events: {
              onHover: {
                enable: true,
                mode: "grab",
              },
            },
            modes: {
              grab: {
                distance: 250,
                links: {
                  opacity: isDark ? 0.7 : 0.4,
                },
              },
            },
          },
          particles: {
            color: {
              value: particleColor,
            },
            links: {
              color: linkColor,
              distance: 150,
              enable: true,
              opacity: isDark ? 0.2 : 0.1,
              width: 1,
            },
            move: {
              direction: "none",
              enable: true,
              outModes: {
                default: "bounce",
              },
              random: true,
              speed: 0.6,
              straight: false,
            },
            number: {
              density: {
                enable: true,
              },
              value: 80,
            },
            opacity: {
              value: isDark ? 0.5 : 0.3,
            },
            shape: {
              type: "circle",
            },
            size: {
              value: { min: 1, max: 3 },
            },
          },
          detectRetina: true,
        }}
      />
    </ParticlesProvider>
  );
}
