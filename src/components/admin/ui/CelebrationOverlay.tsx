"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { CheckCircle2, Award, UserCheck, X } from "lucide-react";
import { useAdminLanguage } from "../shell/AdminLanguageContext";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

export interface CelebrationOverlayProps {
  show: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  candidateName?: string;
  roleName?: string;
  variant?: "shortlisted" | "next_phase" | "hired" | "custom";
  autoCloseMs?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  color: string;
  angle: number;
  vAngle: number;
  type: "rect" | "ribbon" | "circle";
  phase: number;
  swayAmp: number;
  swayFreq: number;
}

const CONFETTI_PALETTE = [
  "#F59E0B", // Metallic Gold
  "#FBBF24", // Warm Yellow
  "#0284C7", // Overwatch Sky Blue
  "#38BDF8", // Light Cyan
  "#10B981", // Emerald Green
  "#059669", // Deep Emerald
  "#EF4444", // Festive Crimson
  "#F43F5E", // Rose Red
  "#8B5CF6", // Royal Violet
  "#D946EF", // Fuchsia
  "#FFFFFF", // Crisp White Shimmer
];

export default function CelebrationOverlay({
  show,
  onClose,
  title,
  subtitle,
  candidateName,
  roleName,
  variant = "next_phase",
  autoCloseMs,
}: CelebrationOverlayProps) {
  const { t } = useAdminLanguage();
  const [animationData, setAnimationData] = useState<any>(null);
  const lottieRefLeft = useRef<any>(null);
  const lottieRefRight = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load user's official confetti Lottie animation
  useEffect(() => {
    let active = true;
    fetch("/animations/confetti-celebration.json")
      .then((res) => {
        if (!res.ok) return fetch("/animations/confetti.json");
        return res;
      })
      .then((res) => res.json())
      .then((data) => {
        if (active) setAnimationData(data);
      })
      .catch((err) => {
        console.warn("Failed to load confetti animation:", err);
      });
    return () => {
      active = false;
    };
  }, []);

  // Optional auto-close timer if explicitly set
  useEffect(() => {
    if (show && autoCloseMs && autoCloseMs > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseMs);
      return () => clearTimeout(timer);
    }
  }, [show, autoCloseMs, onClose]);

  // Continuous, abundant confetti canvas animation loop
  useEffect(() => {
    if (!show) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Create 320 abundant particles for maximum festive density
    const particleCount = 320;
    const particles: Particle[] = [];

    const createParticle = (fromCorner: boolean = false, cornerSide: "left" | "right" = "left"): Particle => {
      const color = CONFETTI_PALETTE[Math.floor(Math.random() * CONFETTI_PALETTE.length)];
      const type: "rect" | "ribbon" | "circle" =
        Math.random() < 0.5 ? "rect" : Math.random() < 0.8 ? "circle" : "ribbon";

      if (fromCorner) {
        const startX = cornerSide === "left" ? 60 : width - 60;
        const startY = height - 60;
        const angle = cornerSide === "left"
          ? -Math.PI / 4 + (Math.random() - 0.5) * 0.55
          : (-3 * Math.PI) / 4 + (Math.random() - 0.5) * 0.55;
        const speed = Math.random() * 18 + 12;
        return {
          x: startX,
          y: startY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          w: Math.random() * 9 + 6,
          h: Math.random() * 14 + 8,
          color,
          angle: Math.random() * 360,
          vAngle: (Math.random() - 0.5) * 12,
          type,
          phase: Math.random() * Math.PI * 2,
          swayAmp: Math.random() * 20 + 10,
          swayFreq: Math.random() * 0.04 + 0.02,
        };
      }

      return {
        x: Math.random() * width,
        y: Math.random() * height - height,
        vx: (Math.random() - 0.5) * 2,
        vy: Math.random() * 3.5 + 2.5,
        w: Math.random() * 9 + 6,
        h: Math.random() * 14 + 8,
        color,
        angle: Math.random() * 360,
        vAngle: (Math.random() - 0.5) * 10,
        type,
        phase: Math.random() * Math.PI * 2,
        swayAmp: Math.random() * 25 + 10,
        swayFreq: Math.random() * 0.03 + 0.015,
      };
    };

    for (let i = 0; i < particleCount; i++) {
      particles.push(createParticle(false));
    }

    // Periodic explosive corner bursts
    let frameCount = 0;
    const cornerBurst = () => {
      for (let i = 0; i < 40; i++) {
        particles.push(createParticle(true, "left"));
        particles.push(createParticle(true, "right"));
      }
      // Cap total active particles to avoid memory leak
      if (particles.length > 550) {
        particles.splice(0, particles.length - 450);
      }
    };

    // Initial launch burst
    cornerBurst();

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      frameCount++;

      // Trigger burst every ~180 frames (approx 3 seconds)
      if (frameCount % 180 === 0) {
        cornerBurst();
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Apply physics
        p.vy += 0.12; // Gravity
        p.vx *= 0.985; // Drag
        p.x += p.vx + Math.sin(frameCount * p.swayFreq + p.phase) * 0.8;
        p.y += p.vy;
        p.angle += p.vAngle;

        // Draw particle
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.angle * Math.PI) / 180);

        // 3D flip width scaling
        const flip = Math.cos((p.angle * Math.PI) / 60);
        const curW = Math.max(1.5, p.w * flip);

        ctx.fillStyle = p.color;

        if (p.type === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, curW / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === "ribbon") {
          ctx.beginPath();
          ctx.lineWidth = 3;
          ctx.strokeStyle = p.color;
          ctx.moveTo(-curW, -p.h / 2);
          ctx.quadraticCurveTo(0, 0, curW, p.h / 2);
          ctx.stroke();
        } else {
          ctx.fillRect(-curW / 2, -p.h / 2, curW, p.h);
        }

        ctx.restore();

        // Recycle particles that fall off bottom screen
        if (p.y > height + 20) {
          p.y = -20;
          p.x = Math.random() * width;
          p.vy = Math.random() * 3.5 + 2.5;
          p.vx = (Math.random() - 0.5) * 2;
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [show]);

  if (!show) return null;

  const defaultTitle =
    variant === "hired"
      ? t("Candidate Successfully Hired!", "Candidato Contratado com Sucesso!")
      : variant === "shortlisted"
      ? t("Candidate Shortlisted!", "Candidato Pré-selecionado!")
      : t("Advanced to Next Phase!", "Avançado para a Próxima Fase!");

  const defaultSubtitle =
    variant === "hired"
      ? t(
          "The candidate has been formally offered and admitted into the Overwatch team.",
          "O candidato foi admitido formalmente na equipa Overwatch."
        )
      : variant === "shortlisted"
      ? t(
          "The candidate successfully passed screening and is placed in the shortlisted queue for testing & interviews.",
          "O candidato foi aprovado na triagem preliminar e colocado na fila de convocatórias."
        )
      : t(
          "Candidate passed screening and was selected for next phase training and operational integration.",
          "O candidato foi aprovado na triagem e selecionado para a fase de formação e integração operacional."
        );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
      {/* Full-Screen Continuous Confetti Rain Canvas (Infinite Loop) */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-20 w-full h-full"
      />

      {/* Discrete Corner Confetti Shooters (Scaled Down, Anchored to Bottom Corners) */}
      {animationData && (
        <>
          {/* Bottom-Left Shooter */}
          <div className="pointer-events-none absolute bottom-2 left-2 z-20 w-36 h-36 sm:w-48 sm:h-48 opacity-90">
            <Lottie
              lottieRef={lottieRefLeft}
              animationData={animationData}
              loop={true}
              autoplay={true}
              className="w-full h-full object-contain"
            />
          </div>

          {/* Bottom-Right Shooter (Mirrored, Continuous Loop) */}
          <div className="pointer-events-none absolute bottom-2 right-2 z-20 w-36 h-36 sm:w-48 sm:h-48 opacity-90 scale-x-[-1]">
            <Lottie
              lottieRef={lottieRefRight}
              animationData={animationData}
              loop={true}
              autoplay={true}
              className="w-full h-full object-contain"
            />
          </div>
        </>
      )}

      {/* Celebratory Dialog Card - Elevated z-30, Sharp & Completely Visible */}
      <div className="relative z-30 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl text-center select-none">
        {/* Dismiss Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          title={t("Close", "Fechar")}
        >
          <X size={18} />
        </button>

        {/* Milestone Icon */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-2xs">
          {variant === "hired" ? (
            <Award size={32} className="text-emerald-600" />
          ) : variant === "shortlisted" ? (
            <UserCheck size={32} className="text-amber-500" />
          ) : (
            <CheckCircle2 size={32} className="text-sky-600" />
          )}
        </div>

        {/* Headline */}
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          {title || defaultTitle}
        </h3>

        {/* Candidate Detail */}
        {candidateName && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs">
            <span>{candidateName}</span>
            {roleName && <span className="text-slate-400">• {roleName}</span>}
          </div>
        )}

        <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
          {subtitle || defaultSubtitle}
        </p>

        {/* Action Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-700 px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-2xs transition-all cursor-pointer"
          >
            {t("Continue to Dashboard", "Continuar no Painel")}
          </button>
        </div>
      </div>
    </div>
  );
}
