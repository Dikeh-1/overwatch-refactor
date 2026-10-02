"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { CheckCircle2, Sparkles, X } from "lucide-react";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

interface CelebrationOverlayProps {
  show: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  candidateName?: string;
  roleName?: string;
  variant?: "next_phase" | "hired" | "custom";
}

export default function CelebrationOverlay({
  show,
  onClose,
  title,
  subtitle,
  candidateName,
  roleName,
  variant = "next_phase",
}: CelebrationOverlayProps) {
  const [animationData, setAnimationData] = useState<any>(null);
  const lottieRef = useRef<any>(null);

  useEffect(() => {
    let active = true;
    fetch("/animations/confetti-celebration.json")
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

  useEffect(() => {
    if (show && lottieRef.current) {
      lottieRef.current.goToAndPlay(0, true);
    }
  }, [show]);

  if (!show) return null;

  const defaultTitle =
    variant === "hired"
      ? "Candidato Contratado com Sucesso!"
      : "Avançado para a Próxima Fase!";

  const defaultSubtitle =
    variant === "hired"
      ? "O candidato foi admitido formalmente na equipa Overwatch."
      : "O candidato foi aprovado na triagem e selecionado para a fase de testes e entrevistas.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070b14]/80 backdrop-blur-md p-4 animate-in fade-in zoom-in-95 duration-200">
      {/* Confetti Animation Canvas Overlay */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        {animationData && (
          <Lottie
            lottieRef={lottieRef}
            animationData={animationData}
            loop={false}
            autoplay={true}
            className="w-full h-full max-w-4xl max-h-4xl object-contain opacity-95 scale-125"
          />
        )}
      </div>

      {/* Celebratory Dialog Card */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-emerald-500/30 bg-[#0c1322]/95 p-6 sm:p-8 shadow-2xl shadow-emerald-950/60 text-center select-none">
        {/* Dismiss Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
          title="Fechar"
        >
          <X size={18} />
        </button>

        {/* Milestone Icon */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.35)] animate-bounce">
          {variant === "hired" ? (
            <Sparkles size={32} className="text-emerald-400" />
          ) : (
            <CheckCircle2 size={32} className="text-emerald-400" />
          )}
        </div>

        {/* Headline */}
        <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
          {title || defaultTitle}
        </h3>

        {/* Candidate Detail */}
        {candidateName && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-bold text-emerald-300">
            <span>{candidateName}</span>
            {roleName && <span className="text-emerald-400/60">• {roleName}</span>}
          </div>
        )}

        <p className="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
          {subtitle || defaultSubtitle}
        </p>

        {/* Action Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-emerald-900/40 hover:from-emerald-400 hover:to-teal-400 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Continuar no Painel
          </button>
        </div>
      </div>
    </div>
  );
}
