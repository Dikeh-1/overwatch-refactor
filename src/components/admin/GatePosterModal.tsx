"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { X, Printer, Download, QrCode, ShieldCheck, MapPin, Sparkles } from "lucide-react";
import Logo from "@/components/ui/Logo";
import { siteContact } from "@/lib/site-config";

interface GatePosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: "pt" | "en";
}

export default function GatePosterModal({
  isOpen,
  onClose,
  lang,
}: GatePosterModalProps) {
  const isPt = lang === "pt";
  const [qrUrl, setQrUrl] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      const origin = typeof window !== "undefined" ? window.location.origin : "https://www.overwatchmoz.com";
      const targetUrl = `${origin}/pt/careers/check-in`;
      QRCode.toDataURL(targetUrl, {
        width: 480,
        margin: 2,
        color: {
          dark: "#0b1329",
          light: "#ffffff",
        },
      })
        .then(setQrUrl)
        .catch((e) => console.error("Error generating poster QR:", e));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white">
      <div className="relative w-full max-w-2xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto border border-white/20 print:border-none print:shadow-none print:max-w-none print:w-full">
        {/* Modal Top Bar (hidden when printing) */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-2">
            <QrCode size={18} className="text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {isPt ? "Cartaz Oficial de Check-in para a Portaria" : "Official Gate Check-in Poster"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow cursor-pointer"
            >
              <Printer size={13} />
              <span>{isPt ? "Imprimir Cartaz A4" : "Print A4 Poster"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Poster Canvas */}
        <div className="p-8 sm:p-12 text-center flex flex-col items-center bg-white print:p-8">
          {/* Header Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-300 text-slate-800 text-[11px] font-bold uppercase tracking-widest mb-4">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>Overwatch Moçambique · Controlo de Acesso</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight uppercase">
            {isPt ? "Registo de Presença" : "Candidate Check-in"}
          </h1>
          <p className="text-sm font-semibold text-emerald-700 tracking-wide mt-1 uppercase">
            {isPt ? "Teste Presencial de Selecção · Operadora de CCO" : "In-Person Assessment · CCTV Operator"}
          </p>

          <div className="w-16 h-1 bg-emerald-500 rounded-full my-4" />

          {/* Instructions */}
          <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed mb-6 font-medium">
            {isPt
              ? "Candidatas: Aponte a câmara do telemóvel para o código abaixo para validar a sua entrada e confirmar a presença no sistema."
              : "Candidates: Scan the QR code below with your phone camera to register gate check-in."}
          </p>

          {/* Big High-Res QR Box */}
          <div className="p-5 bg-white rounded-2xl border-4 border-slate-950 shadow-lg mb-6 flex flex-col items-center">
            {qrUrl ? (
              <img
                src={qrUrl}
                alt="QR Code Check-in"
                className="w-64 h-64 sm:w-72 sm:h-72 object-contain"
              />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center text-slate-400">
                <QrCode size={64} className="animate-pulse" />
              </div>
            )}
            <span className="font-mono text-[11px] font-bold text-slate-700 mt-2 tracking-widest uppercase">
              SCAN TO CHECK-IN · OVERWATCH MOZAMBIQUE
            </span>
          </div>

          {/* Steps Notice */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg text-left mb-6">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5 mb-1">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">1</span>
                <span>{isPt ? "Escanear" : "Scan"}</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-tight">
                {isPt ? "Aponte a câmara para o código QR." : "Point camera at the QR code."}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5 mb-1">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">2</span>
                <span>{isPt ? "Identificar" : "Identify"}</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-tight">
                {isPt ? "Confirme o número WhatsApp cadastrado." : "Confirm your registered WhatsApp."}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5 mb-1">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">3</span>
                <span>{isPt ? "Apresentar" : "Present"}</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-tight">
                {isPt ? "Mostre o ecrã verde ao guarda na portaria." : "Show the green screen to gate guard."}
              </p>
            </div>
          </div>

          {/* Important Rules */}
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900 text-left w-full max-w-lg">
            <strong className="block font-bold mb-0.5">
              {isPt ? "⚠️ Atenção — Regras de Acesso Obrigatórias:" : "⚠️ Important — Access Rules:"}
            </strong>
            <p className="text-[11px] text-amber-800 leading-snug">
              {isPt
                ? "Apenas serão admitidas candidatas devidamente agendadas para o dia e turno de hoje. Tenha em mãos o documento original de identificação (BI/Passaporte) e caneta."
                : "Only candidates scheduled for today's session will be admitted. Must have original photo ID and pen."}
            </p>
          </div>

          {/* Footer location */}
          <div className="mt-8 pt-4 border-t border-slate-200 w-full flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>{siteContact.address.pt}</span>
            <span>www.overwatchmoz.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}