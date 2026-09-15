"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import jsQR from "jsqr";
import {
  X,
  Camera,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldCheck,
  UserCheck,
  RotateCw,
  MapPin,
  FileText,
  Phone,
  Calendar,
  Sparkles,
} from "lucide-react";
import { formatSlotDisplay } from "@/lib/careers";

type VerificationResult = {
  success: boolean;
  code?: string;
  error?: string;
  actualSlot?: string;
  candidate?: {
    id: string;
    name: string;
    email: string;
    whatsapp: string;
    testSlot?: string;
    attendedAt?: string;
    attendanceStatus?: string;
  };
};

interface GateCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckInSuccess: (candidate: any) => void;
  lang: "pt" | "en";
}

export default function GateCheckInModal({
  isOpen,
  onClose,
  onCheckInSuccess,
  lang,
}: GateCheckInModalProps) {
  const isPt = lang === "pt";
  const [activeTab, setActiveTab] = useState<"camera" | "manual">("camera");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [manualQuery, setManualQuery] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const lastScannedCode = useRef<string | null>(null);
  const scanCooldownTimer = useRef<NodeJS.Timeout | null>(null);

  // Stop camera helper
  const stopCamera = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  // Perform API check-in
  const verifyCheckIn = useCallback(
    async (payload: { id?: string; query?: string; force?: boolean }) => {
      setProcessing(true);
      try {
        const res = await fetch("/api/careers/check-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            action: "check_in",
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setResult({
            success: true,
            candidate: data.candidate,
          });
          if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([100, 50, 150]);
          onCheckInSuccess(data.candidate);
        } else {
          setResult({
            success: false,
            code: data.code,
            error: data.error,
            actualSlot: data.actualSlot,
            candidate: data.candidate,
          });
          if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([300]);
        }
      } catch (err: any) {
        setResult({
          success: false,
          error: isPt
            ? "Erro de ligação ao validar entrada. Tente novamente."
            : "Network error validating entry. Please retry.",
        });
      } finally {
        setProcessing(false);
      }
    },
    [isPt, onCheckInSuccess],
  );

  // QR Scanning Loop
  const scanLoop = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code && code.data && !processing) {
        const raw = code.data.trim();
        if (raw !== lastScannedCode.current) {
          lastScannedCode.current = raw;
          let candidateId = raw;
          try {
            if (raw.includes("careers/check-in") || raw.includes("?id=")) {
              const url = new URL(raw, window.location.origin);
              const urlId = url.searchParams.get("id");
              if (urlId) candidateId = urlId;
            } else if (raw.includes("test-invite/")) {
              const parts = raw.split("test-invite/");
              if (parts[1]) candidateId = parts[1].split(/[?#/]/)[0];
            }
          } catch (_) {
            // keep raw
          }

          verifyCheckIn({ id: candidateId });

          // Reset scan cooldown after 3.5 seconds
          if (scanCooldownTimer.current) clearTimeout(scanCooldownTimer.current);
          scanCooldownTimer.current = setTimeout(() => {
            lastScannedCode.current = null;
          }, 3500);
        }
      }
    }

    animationFrameId.current = requestAnimationFrame(scanLoop);
  }, [processing, verifyCheckIn]);

  // Start camera helper
  const startCamera = useCallback(async () => {
    setCameraError("");
    try {
      stopCamera();
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          isPt
            ? "Acesso à câmara não suportado neste navegador."
            : "Camera access not supported on this browser.",
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setCameraActive(true);
        animationFrameId.current = requestAnimationFrame(scanLoop);
      }
    } catch (err: any) {
      console.warn("Camera start failed:", err);
      setCameraError(
        isPt
          ? "Não foi possível abrir a câmara. Use a pesquisa manual abaixo."
          : "Could not open camera. Please use manual search below.",
      );
      setCameraActive(false);
      setActiveTab("manual");
    }
  }, [isPt, scanLoop, stopCamera]);

  useEffect(() => {
    if (isOpen && activeTab === "camera") {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, startCamera, stopCamera]);

  // Handle manual submit
  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQuery.trim()) return;
    verifyCheckIn({ query: manualQuery.trim() });
  };

  const resetResult = () => {
    setResult(null);
    lastScannedCode.current = null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-slate-900 border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                {isPt ? "Controlo de Entrada na Portaria" : "Security Gate Check-in"}
              </h2>
              <p className="text-[11px] text-white/50">
                {isPt ? "Verificação em tempo real de passes QR e convocatórias" : "Real-time pass verification"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-950/40 border-b border-white/10 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("camera")}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === "camera"
                ? "bg-emerald-500 text-slate-950 shadow"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <Camera size={14} />
            <span>{isPt ? "Leitor de Câmara QR" : "Camera QR Scanner"}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              setActiveTab("manual");
            }}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === "manual"
                ? "bg-emerald-500 text-slate-950 shadow"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <Search size={14} />
            <span>{isPt ? "Pesquisa Manual (Contacto/ID)" : "Manual Lookup"}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Active Result Banner */}
          {result && (
            <div
              className={`rounded-xl border p-4 transition-all ${
                result.success
                  ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-100 shadow-lg shadow-emerald-950/50"
                  : result.code === "WRONG_DAY"
                    ? "bg-amber-950/80 border-amber-500/50 text-amber-100 shadow-lg shadow-amber-950/50"
                    : "bg-red-950/80 border-red-500/50 text-red-100 shadow-lg shadow-red-950/50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {result.success ? (
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 shrink-0">
                      <CheckCircle2 size={24} />
                    </div>
                  ) : result.code === "WRONG_DAY" ? (
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 shrink-0">
                      <AlertTriangle size={24} />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-400/50 flex items-center justify-center text-red-400 shrink-0">
                      <XCircle size={24} />
                    </div>
                  )}

                  <div className="space-y-1">
                    <h3 className="text-sm font-bold tracking-tight">
                      {result.success
                        ? isPt
                          ? "✅ ENTRADA AUTORIZADA — PRESENÇA CONFIRMADA"
                          : "✅ ENTRY AUTHORIZED — ATTENDANCE RECORDED"
                        : result.code === "WRONG_DAY"
                          ? isPt
                            ? "⛔ ACESSO RECUSADO: TURNO INCORRECTO"
                            : "⛔ ACCESS DENIED: WRONG DAY"
                          : isPt
                            ? "❌ ACESSO RECUSADO"
                            : "❌ ACCESS DENIED"}
                    </h3>

                    {result.candidate && (
                      <div className="mt-2 text-xs space-y-1 text-white/90">
                        <p className="font-semibold text-sm text-white">
                          {result.candidate.name}
                        </p>
                        <p className="text-[11px] text-white/60">
                          WhatsApp: {result.candidate.whatsapp} · Email: {result.candidate.email}
                        </p>
                      </div>
                    )}

                    {result.success && result.candidate && (
                      <p className="text-xs text-emerald-300 font-mono mt-2 pt-1 border-t border-emerald-500/20">
                        {isPt ? "Turno de hoje:" : "Today's slot:"} {result.candidate.testSlot}
                      </p>
                    )}

                    {!result.success && (
                      <div className="mt-2 text-xs">
                        <p className="font-medium text-white/90">{result.error}</p>
                        {result.actualSlot && (
                          <p className="text-xs font-bold text-amber-300 mt-1">
                            {isPt ? "Data correcta do agendamento:" : "Correct scheduled date:"}{" "}
                            {formatSlotDisplay(result.actualSlot, lang)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={resetResult}
                  className="text-white/40 hover:text-white p-1 rounded transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Action buttons on result */}
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={resetResult}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  {isPt ? "Escanear Próxima Candidata" : "Scan Next"}
                </button>
                {result.candidate && !result.success && result.code === "WRONG_DAY" && (
                  <button
                    type="button"
                    onClick={() => {
                      if (result.candidate?.id) {
                        verifyCheckIn({ id: result.candidate.id, force: true });
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
                  >
                    {isPt ? "Autorizar Entrada Excepcional" : "Force Allow Entry"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 1: Camera Scanner View */}
          {activeTab === "camera" && (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video border border-white/10 flex items-center justify-center">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Target Frame Guide Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-56 h-56 border-2 border-emerald-400/80 rounded-2xl relative shadow-[0_0_20px_rgba(52,211,153,0.3)]">
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse absolute top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Camera Status */}
                {processing && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center gap-2 text-white text-xs font-semibold">
                    <RotateCw className="animate-spin text-emerald-400" size={18} />
                    <span>{isPt ? "A validar no sistema..." : "Verifying with system..."}</span>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-xs flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0 text-red-400" />
                  <span>{cameraError}</span>
                </div>
              )}

              <p className="text-[11px] text-white/50 text-center">
                {isPt
                  ? "Aponte a câmara para o código QR apresentado no telemóvel da candidata."
                  : "Point camera at candidate's digital test pass QR code."}
              </p>
            </div>
          )}

          {/* TAB 2: Manual Search */}
          {activeTab === "manual" && (
            <div className="space-y-4">
              <form onSubmit={handleManualSearch} className="space-y-3">
                <label className="block text-xs font-semibold text-white/80">
                  {isPt
                    ? "Pesquisar por Telemóvel, Email ou Código da Candidatura"
                    : "Search by Phone, Email, or Application ID"}
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40"
                    />
                    <input
                      type="text"
                      value={manualQuery}
                      onChange={(e) => setManualQuery(e.target.value)}
                      placeholder={isPt ? "Ex: +258 84... ou nome@email.com" : "E.g. +258 84... or candidate email"}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-emerald-400 transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={processing || !manualQuery.trim()}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
                  >
                    {processing ? (
                      <RotateCw size={14} className="animate-spin" />
                    ) : (
                      <span>{isPt ? "Validar" : "Verify"}</span>
                    )}
                  </button>
                </div>
              </form>

              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white/60 space-y-1.5">
                <p className="font-semibold text-white/80">
                  {isPt ? "Dica para a Portaria:" : "Security Desk Tip:"}
                </p>
                <p>
                  {isPt
                    ? "Se a candidata estiver sem internet ou o ecrã estiver escuro, digite os últimos 9 dígitos do número WhatsApp da candidata para confirmar a presença instantaneamente."
                    : "If candidate phone has issues, search the last 9 digits of her WhatsApp number to check in."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-slate-950/80 flex items-center justify-between text-xs text-white/40">
          <span>Overwatch Moçambique · Av. Paulo Samuel Kankhomba nº 1498</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium transition-colors cursor-pointer"
          >
            {isPt ? "Fechar" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}