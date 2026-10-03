"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { CheckCircle2, Award, X } from "lucide-react";
import { useAdminLanguage } from "../shell/AdminLanguageContext";

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
  const { t } = useAdminLanguage();
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
      ? t("Candidate Successfully Hired!", "Candidato Contratado com Sucesso!")
      : t("Advanced to Next Phase!", "Avançado para a Próxima Fase!");

  const defaultSubtitle =
    variant === "hired"
      ? t(
          "The candidate has been formally offered and admitted into the Overwatch team.",
          "O candidato foi admitido formalmente na equipa Overwatch.",
        )
      : t(
          "Candidate passed screening and was selected for in-person testing and interview phases.",
          "O candidato foi aprovado na triagem e selecionado para a fase de testes e entrevistas.",
        );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in zoom-in-95 duration-200">
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

      {/* Celebratory Dialog Card - Light & Professional */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl text-center select-none">
        {/* Dismiss Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title={t("Close", "Fechar")}
        >
          <X size={18} />
        </button>

        {/* Milestone Icon */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-sm">
          {variant === "hired" ? (
            <Award size={32} className="text-emerald-600" />
          ) : (
            <CheckCircle2 size={32} className="text-emerald-600" />
          )}
        </div>

        {/* Headline */}
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          {title || defaultTitle}
        </h3>

        {/* Candidate Detail */}
        {candidateName && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-semibold text-slate-800">
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
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0a1128] hover:bg-[#121c3b] px-6 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all"
          >
            {t("Continue to Dashboard", "Continuar no Painel")}
          </button>
        </div>
      </div>
    </div>
  );
}
