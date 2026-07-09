"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "@/components/providers/ThemeProvider";

type Particle = {
  opacity: number;
  radius: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
};

const PARTICLE_COUNT = 80;
const LINK_DISTANCE = 150;
const GRAB_DISTANCE = 250;

function createParticle(width: number, height: number): Particle {
  const angle = Math.random() * Math.PI * 2;
  const speed = 0.25 + Math.random() * 0.35;

  return {
    opacity: 0.35 + Math.random() * 0.2,
    radius: 1 + Math.random() * 2,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    x: Math.random() * width,
    y: Math.random() * height,
  };
}

export default function ParticleNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();

  const isDark = theme === "dark";
  const particleColor = isDark ? "#ffffff" : "#0f1117";
  const linkColor = isDark ? "#ffffff" : "#0f1117";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const pointer = { active: false, x: 0, y: 0 };
    let animationFrame = 0;
    let particles: Particle[] = [];
    let width = 0;
    let height = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = Array.from({ length: PARTICLE_COUNT }, () =>
        createParticle(width, height),
      );
    };

    const drawLine = (
      fromX: number,
      fromY: number,
      toX: number,
      toY: number,
      opacity: number,
    ) => {
      context.strokeStyle = linkColor;
      context.globalAlpha = opacity;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(fromX, fromY);
      context.lineTo(toX, toY);
      context.stroke();
    };

    const render = () => {
      context.clearRect(0, 0, width, height);

      for (const particle of particles) {
        if (!reducedMotion.matches) {
          particle.x += particle.vx;
          particle.y += particle.vy;

          if (particle.x <= 0 || particle.x >= width) particle.vx *= -1;
          if (particle.y <= 0 || particle.y >= height) particle.vy *= -1;
        }

        context.fillStyle = particleColor;
        context.globalAlpha = particle.opacity;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fill();
      }

      for (let i = 0; i < particles.length; i += 1) {
        const current = particles[i];

        for (let j = i + 1; j < particles.length; j += 1) {
          const other = particles[j];
          const distance = Math.hypot(current.x - other.x, current.y - other.y);

          if (distance < LINK_DISTANCE) {
            drawLine(
              current.x,
              current.y,
              other.x,
              other.y,
              (1 - distance / LINK_DISTANCE) * (isDark ? 0.2 : 0.1),
            );
          }
        }

        if (pointer.active) {
          const grabDistance = Math.hypot(
            current.x - pointer.x,
            current.y - pointer.y,
          );

          if (grabDistance < GRAB_DISTANCE) {
            drawLine(
              current.x,
              current.y,
              pointer.x,
              pointer.y,
              (1 - grabDistance / GRAB_DISTANCE) * (isDark ? 0.7 : 0.4),
            );
          }
        }
      }

      context.globalAlpha = 1;

      if (!reducedMotion.matches) {
        animationFrame = window.requestAnimationFrame(render);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.active = true;
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
    };

    const handlePointerLeave = () => {
      pointer.active = false;
    };

    resize();
    render();

    window.addEventListener("resize", resize);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [isDark, linkColor, particleColor]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 z-0"
    />
  );
}
