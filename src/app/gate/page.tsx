"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import jsQR from "jsqr";
import {
  ShieldCheck,
  Camera,
  Search,
  Users,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  RotateCw,
  LogOut,
  Lock,
  RefreshCw,
  Check,
  Globe,
  FlipHorizontal,
} from "lucide-react";
import { formatSlotDisplay } from "@/lib/careers";

type TodayCandidate = {
  id: string;
  name: string;
  whatsapp: string;
  testSlot: string;
  attendedAt: string | null;
  attendanceStatus: string;
};

type VerificationResult = {
  success: boolean;
  code?: string;
  error?: string;
  actualSlot?: string;
  candidate?: {
    id: string;
    name: string;
    email?: string;
    whatsapp?: string;
    testSlot?: string;
    attendedAt?: string;
    attendanceStatus?: string;
  };
};

const DICT = {
  pt: {
    loading: "A carregar controlo de portaria...",
    lockTitle: "Portaria Overwatch",
    lockSubtitle: "Controlo de Acesso & Validação de Passes de Teste",
    pinLabel: "PIN de Segurança da Portaria",
    pinPlaceholder: "Introduza o PIN (ex: 1498)",
    pinSubmit: "Entrar na Portaria",
    pinVerifying: "A verificar...",
    pinIncorrect: "PIN de segurança incorrecto.",
    pinError: "Erro ao comunicar com o servidor.",
    address: "Av. Paulo Samuel Kankhomba nº 1498, Maputo",
    postTitle: "Posto de Acesso Overwatch",
    presentToday: "Presentes Hoje",
    exitPortal: "Sair da Portaria",
    tabCamera: "Leitor QR",
    tabManual: "Pesquisar",
    tabRoster: "Hoje",
    scannerHelp: "Aponte a câmara para o código QR apresentado pela candidata no telemóvel ou em papel.",
    validatingPass: "A validar passe no sistema...",
    cameraError: "Não foi possível aceder à câmara. Use a aba de Pesquisa Manual.",
    accessGranted: "Entrada Autorizada",
    accessWrongDay: "Acesso Recusado: Turno Incorrecto",
    accessDenied: "Acesso Recusado",
    candidateDefault: "Candidato(a)",
    mandatoryProcedure: "Procedimento Obrigatório na Portaria:",
    step1: "Exigir Documento de Identificação Original (BI / Passaporte).",
    step2: "Verificar se tem caneta esferográfica (azul ou preta).",
    step3: "Autorizar entrada para a sala de testes.",
    wrongDayMsg: "Esta candidata NÃO está escalada para o turno de hoje.",
    officialDate: "Data Oficial do Agendamento:",
    guardInstruction: "⚠️ Instrução ao Guarda: Não autorizar a entrada. A candidata deve regressar exclusivamente no dia agendado para respeitar a lotação diária de 10 candidatas.",
    genericDenied: "Esta candidatura não está aprovada para realização de teste.",
    scanNext: "Escanear Próxima Candidata",
    manualTitle: "Pesquisa Manual da Portaria",
    manualSubtitle: "Utilize caso a candidata esteja com o telemóvel descarregado ou ecrã danificado.",
    searchPlaceholder: "Número de WhatsApp (ex: 84... ou 82...) ou Nome",
    searchBtn: "Verificar & Dar Entrada",
    rosterTitle: "Escala de Hoje",
    rosterSubtitle: "Candidatas com teste confirmado para hoje às 10h00.",
    rosterEmpty: "Nenhuma candidata agendada para hoje na base de dados.",
    rosterPresent: "Presente",
    rosterCheckIn: "Dar Entrada",
    refreshTooltip: "Actualizar lista",
    connError: "Erro de ligação com a base de dados. Tente novamente.",
    flipCamera: "Mudar câmara",
  },
  en: {
    loading: "Loading gate security control...",
    lockTitle: "Overwatch Security Gate",
    lockSubtitle: "Access Control & Test Pass Verification",
    pinLabel: "Gate Security PIN",
    pinPlaceholder: "Enter PIN (e.g. 1498)",
    pinSubmit: "Enter Gate Portal",
    pinVerifying: "Verifying...",
    pinIncorrect: "Incorrect security PIN.",
    pinError: "Error communicating with server.",
    address: "Av. Paulo Samuel Kankhomba nº 1498, Maputo",
    postTitle: "Overwatch Access Post",
    presentToday: "Present Today",
    exitPortal: "Exit Gate Portal",
    tabCamera: "QR Scanner",
    tabManual: "Manual Search",
    tabRoster: "Today",
    scannerHelp: "Point camera at the QR code presented by the candidate on their phone or printed paper.",
    validatingPass: "Validating pass in database...",
    cameraError: "Could not access camera. Please use the Manual Search tab.",
    accessGranted: "Access Granted",
    accessWrongDay: "Access Denied: Scheduled for Another Day",
    accessDenied: "Access Denied",
    candidateDefault: "Candidate",
    mandatoryProcedure: "Mandatory Gate Procedure:",
    step1: "Inspect Original Identification Document (National ID / Passport).",
    step2: "Confirm candidate has a ballpoint pen (blue or black).",
    step3: "Grant entry to the examination room.",
    wrongDayMsg: "This candidate is NOT scheduled for today's session.",
    officialDate: "Official Scheduled Date & Time:",
    guardInstruction: "⚠️ Guard Instruction: Do NOT grant entry. The candidate must return strictly on their scheduled date to maintain the daily cap of 10 candidates.",
    genericDenied: "This application is not approved or not booked for a test session.",
    scanNext: "Scan Next Candidate",
    manualTitle: "Manual Security Search",
    manualSubtitle: "Use if candidate's phone battery is flat or screen is damaged.",
    searchPlaceholder: "WhatsApp number (e.g. 84... or 82...) or Name",
    searchBtn: "Verify & Check In",
    rosterTitle: "Today's Roster",
    rosterSubtitle: "Candidates confirmed for today's test at 10:00 AM.",
    rosterEmpty: "No candidates scheduled for today in database.",
    rosterPresent: "Present",
    rosterCheckIn: "Check In",
    refreshTooltip: "Refresh list",
    connError: "Database connection error. Please try again.",
    flipCamera: "Flip camera",
  },
};

function GateSecurityContent() {
  const searchParams = useSearchParams();
  const urlId = searchParams?.get("id");
  const urlLang = searchParams?.get("lang");
  const hasAutoChecked = useRef(false);

  // Language management: default is PT
  const [lang, setLang] = useState<"pt" | "en">("pt");

  useEffect(() => {
    if (urlLang === "en" || urlLang === "pt") {
      setLang(urlLang);
      try {
        localStorage.setItem("overwatch_gate_lang", urlLang);
      } catch (_) {}
    } else {
      try {
        const stored = localStorage.getItem("overwatch_gate_lang");
        if (stored === "en" || stored === "pt") {
          setLang(stored);
        }
      } catch (_) {}
    }
  }, [urlLang]);

  const switchLanguage = (newLang: "pt" | "en") => {
    setLang(newLang);
    try {
      localStorage.setItem("overwatch_gate_lang", newLang);
    } catch (_) {}
    if (typeof window !== "undefined") {
      const u = new URL(window.location.href);
      u.searchParams.set("lang", newLang);
      window.history.replaceState(null, "", u.toString());
    }
  };

  const t = DICT[lang];

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinBusy, setPinBusy] = useState(false);

  const [activeTab, setActiveTab] = useState<"camera" | "manual" | "roster">("camera");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [roster, setRoster] = useState<TodayCandidate[]>([]);
  const [rosterStats, setRosterStats] = useState({ total: 0, present: 0 });
  const [rosterLoading, setRosterLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastScannedRef = useRef<string | null>(null);
  const scanCooldownRef = useRef<NodeJS.Timeout | null>(null);

  // Check auth session
  useEffect(() => {
    fetch("/api/gate/session")
      .then((r) => r.json())
      .then((d) => setAuthed(Boolean(d.authenticated)))
      .catch(() => setAuthed(false));
  }, []);

  // Fetch today roster
  const fetchRoster = useCallback(async () => {
    try {
      setRosterLoading(true);
      const res = await fetch("/api/gate/roster");
      if (res.ok) {
        const data = await res.json();
        setRoster(data.candidates || []);
        setRosterStats({ total: data.totalToday || 0, present: data.presentCount || 0 });
      }
    } catch (e) {
      console.error("Failed to load roster:", e);
    } finally {
      setRosterLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed) {
      fetchRoster();
      const interval = setInterval(fetchRoster, 25000);
      return () => clearInterval(interval);
    }
  }, [authed, fetchRoster]);

  // Handle PIN login
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError("");
    setPinBusy(true);
    try {
      const res = await fetch("/api/gate/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinInput }),
      });
      const data = await res.json();
      if (res.ok && data.authorized) {
        setAuthed(true);
        fetchRoster();
      } else {
        setPinError(data.error || t.pinIncorrect);
      }
    } catch {
      setPinError(t.pinError);
    } finally {
      setPinBusy(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    await fetch("/api/gate/session", { method: "DELETE" });
    setAuthed(false);
    stopCamera();
  };

  // Sound feedback
  const playSound = (type: "allowed" | "denied") => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "allowed") {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.setValueAtTime(160, ctx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      }
    } catch (_) {}
  };

  // Stop camera
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  // Perform Gate Check In
  const executeCheckIn = useCallback(
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
          playSound("allowed");
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate([100, 50, 150]);
          }
          fetchRoster();
        } else {
          setResult({
            success: false,
            code: data.code || (data.wrongDay ? "WRONG_DAY" : "DENIED"),
            error: data.error,
            actualSlot: data.scheduledSlot || data.actualSlot,
            candidate:
              data.candidate ||
              (data.candidateName
                ? { id: data.candidateId || "", name: data.candidateName }
                : undefined),
          });
          playSound("denied");
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate([350]);
          }
        }
      } catch (e: any) {
        setResult({
          success: false,
          error: t.connError,
        });
        playSound("denied");
      } finally {
        setProcessing(false);
      }
    },
    [fetchRoster, t.connError],
  );

  // Auto-verify if urlId is passed in query string
  useEffect(() => {
    if (authed && urlId && !hasAutoChecked.current) {
      hasAutoChecked.current = true;
      executeCheckIn({ id: urlId });
    }
  }, [authed, urlId, executeCheckIn]);

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

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imgData.data, imgData.width, imgData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code && code.data && !processing) {
        const raw = code.data.trim();
        if (raw !== lastScannedRef.current) {
          lastScannedRef.current = raw;
          let candidateId = raw;
          try {
            if (raw.includes("id=")) {
              const url = new URL(raw, window.location.origin);
              const extracted = url.searchParams.get("id");
              if (extracted) candidateId = extracted;
            } else if (raw.includes("test-invite/")) {
              candidateId = raw.split("test-invite/")[1].split(/[?#/]/)[0];
            } else if (raw.startsWith("OVERWATCH-PASS:")) {
              candidateId = raw.replace("OVERWATCH-PASS:", "").trim();
            }
          } catch (_) {}

          executeCheckIn({ id: candidateId });

          if (scanCooldownRef.current) clearTimeout(scanCooldownRef.current);
          scanCooldownRef.current = setTimeout(() => {
            lastScannedRef.current = null;
          }, 3500);
        }
      }
    }

    animFrameRef.current = requestAnimationFrame(scanLoop);
  }, [executeCheckIn, processing]);

  // Start Camera
  const startCamera = useCallback(async () => {
    setCameraError("");
    try {
      stopCamera();
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Dispositivo sem suporte para câmara.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacing,
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
        animFrameRef.current = requestAnimationFrame(scanLoop);
      }
    } catch (err: any) {
      console.warn("Camera init failed:", err);
      setCameraError(t.cameraError);
      setCameraActive(false);
      setActiveTab("manual");
    }
  }, [cameraFacing, scanLoop, stopCamera, t.cameraError]);

  useEffect(() => {
    if (authed && activeTab === "camera" && !result) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [authed, activeTab, result, startCamera, stopCamera]);

  const resetScanner = () => {
    setResult(null);
    lastScannedRef.current = null;
  };

  // Loading Session
  if (authed === null) {
    return (
      <div className="min-h-screen bg-[#07090e] text-white flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <RefreshCw className="animate-spin text-emerald-400" size={20} />
          <span>{t.loading}</span>
        </div>
      </div>
    );
  }

  // ── LOCK SCREEN FOR SECURITY PIN ──
  if (!authed) {
    return (
      <div className="min-h-screen bg-[#07090e] text-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 relative">
          {/* Language Toggle on Lock Screen */}
          <div className="flex justify-end">
            <div className="inline-flex items-center bg-slate-950 border border-white/15 rounded-lg p-0.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => switchLanguage("pt")}
                className={`px-2.5 py-1 rounded transition-colors ${
                  lang === "pt"
                    ? "bg-emerald-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                PT
              </button>
              <button
                type="button"
                onClick={() => switchLanguage("en")}
                className={`px-2.5 py-1 rounded transition-colors ${
                  lang === "en"
                    ? "bg-emerald-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                EN
              </button>
            </div>
          </div>

          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
              <ShieldCheck size={26} />
            </div>
            <h1 className="text-base font-bold text-white tracking-wide uppercase">
              {t.lockTitle}
            </h1>
            <p className="text-xs text-slate-400">
              {t.lockSubtitle}
            </p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                {t.pinLabel}
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder={t.pinPlaceholder}
                  autoFocus
                  required
                  className="w-full pl-9 pr-3 py-3 rounded-xl bg-slate-950 border border-white/15 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald-400"
                />
              </div>
              {pinError && (
                <p className="text-xs text-red-400 mt-1.5 font-medium">{pinError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={pinBusy || !pinInput.trim()}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              {pinBusy ? <RotateCw size={15} className="animate-spin" /> : <span>{t.pinSubmit}</span>}
            </button>
          </form>

          <p className="text-[10px] text-slate-500 text-center font-mono">
            {t.address}
          </p>
        </div>
      </div>
    );
  }

  // ── MAIN GATE SECURITY DASHBOARD ──
  return (
    <div className="min-h-screen bg-[#07090e] text-white flex flex-col">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-white/10 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xs font-bold text-white uppercase tracking-wider truncate">
                  {t.postTitle}
                </h1>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                {t.address}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Live Today Counter */}
            <div className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-right">
              <div className="text-[9px] text-slate-400 font-medium leading-none">
                {t.presentToday}
              </div>
              <div className="text-xs font-bold text-emerald-400 font-mono mt-0.5">
                {rosterStats.present} / {rosterStats.total}
              </div>
            </div>

            {/* Language Switcher Pill */}
            <div className="flex items-center bg-slate-900 border border-white/15 rounded-lg p-0.5 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => switchLanguage("pt")}
                className={`px-2 py-1 rounded transition-colors ${
                  lang === "pt"
                    ? "bg-emerald-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                PT
              </button>
              <button
                type="button"
                onClick={() => switchLanguage("en")}
                className={`px-2 py-1 rounded transition-colors ${
                  lang === "en"
                    ? "bg-emerald-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                EN
              </button>
            </div>

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title={t.exitPortal}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 flex flex-col space-y-4">
        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 p-1 rounded-xl bg-slate-900 border border-white/10 text-xs">
          <button
            type="button"
            onClick={() => {
              resetScanner();
              setActiveTab("camera");
            }}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === "camera"
                ? "bg-emerald-500 text-slate-950 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Camera size={14} />
            <span>{t.tabCamera}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              setActiveTab("manual");
            }}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === "manual"
                ? "bg-emerald-500 text-slate-950 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Search size={14} />
            <span>{t.tabManual}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              setActiveTab("roster");
              fetchRoster();
            }}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === "roster"
                ? "bg-emerald-500 text-slate-950 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Users size={14} />
            <span>{t.tabRoster} ({rosterStats.total})</span>
          </button>
        </div>

        {/* ── VERIFICATION RESULT OVERLAY / CARD ── */}
        {result && (
          <div
            className={`rounded-2xl border p-5 sm:p-6 transition-all shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${
              result.success
                ? "bg-emerald-950/80 border-emerald-500/60 shadow-emerald-950/50 text-emerald-100"
                : result.code === "WRONG_DAY"
                  ? "bg-amber-950/85 border-amber-500/60 shadow-amber-950/50 text-amber-100"
                  : "bg-red-950/85 border-red-500/60 shadow-red-950/50 text-red-100"
            }`}
          >
            <div className="flex items-start gap-4">
              {result.success ? (
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-300 shrink-0">
                  <CheckCircle2 size={30} />
                </div>
              ) : result.code === "WRONG_DAY" ? (
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-300 shrink-0">
                  <AlertTriangle size={30} />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-red-500/20 border-2 border-red-400 flex items-center justify-center text-red-300 shrink-0">
                  <XCircle size={30} />
                </div>
              )}

              <div className="space-y-2 flex-1 min-w-0">
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    result.success
                      ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
                      : result.code === "WRONG_DAY"
                        ? "bg-amber-500/30 text-amber-300 border border-amber-500/40"
                        : "bg-red-500/30 text-red-300 border border-red-500/40"
                  }`}
                >
                  {result.success
                    ? t.accessGranted
                    : result.code === "WRONG_DAY"
                      ? t.accessWrongDay
                      : t.accessDenied}
                </span>

                <h2 className="text-lg sm:text-xl font-black text-white leading-tight">
                  {result.candidate?.name || t.candidateDefault}
                </h2>

                {/* Candidate details */}
                {result.candidate?.whatsapp && (
                  <p className="text-xs text-white/70">
                    WhatsApp: {result.candidate.whatsapp}
                  </p>
                )}

                {/* Success: Guard checklist */}
                {result.success && (
                  <div className="pt-2 mt-2 border-t border-emerald-500/30 space-y-1.5 text-xs text-emerald-200">
                    <p className="font-semibold text-white">
                      {t.mandatoryProcedure}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Check size={13} className="text-emerald-400 shrink-0" />
                      <span>{t.step1}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check size={13} className="text-emerald-400 shrink-0" />
                      <span>{t.step2}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check size={13} className="text-emerald-400 shrink-0" />
                      <span>{t.step3}</span>
                    </div>
                  </div>
                )}

                {/* Wrong Day Details */}
                {!result.success && result.code === "WRONG_DAY" && (
                  <div className="pt-2 mt-2 border-t border-amber-500/30 space-y-2 text-xs">
                    <p className="text-white font-medium">
                      {t.wrongDayMsg}
                    </p>
                    {result.actualSlot && (
                      <div className="p-2.5 rounded-xl bg-black/40 border border-amber-500/30">
                        <span className="text-[10px] text-amber-300 uppercase tracking-wide block font-bold">
                          {t.officialDate}
                        </span>
                        <span className="text-sm font-bold text-white block mt-0.5">
                          {formatSlotDisplay(result.actualSlot, lang)}
                        </span>
                      </div>
                    )}
                    <p className="text-[11px] text-amber-200/90 font-medium">
                      {t.guardInstruction}
                    </p>
                  </div>
                )}

                {/* Other Error */}
                {!result.success && result.code !== "WRONG_DAY" && (
                  <p className="text-xs text-red-200 mt-1">
                    {result.error || t.genericDenied}
                  </p>
                )}
              </div>
            </div>

            {/* Action buttons on card */}
            <div className="mt-5 pt-4 border-t border-white/15 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={resetScanner}
                className="w-full py-2.5 rounded-xl bg-white/15 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer text-center"
              >
                {t.scanNext}
              </button>
            </div>
          </div>
        )}

        {/* ── TAB 1: CAMERA SCANNER ── */}
        {activeTab === "camera" && !result && (
          <div className="flex-1 flex flex-col space-y-3">
            <div className="relative rounded-2xl overflow-hidden bg-black border border-white/10 aspect-[4/3] sm:aspect-video flex items-center justify-center">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Viewfinder Reticle */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-56 h-56 border-2 border-emerald-400/70 rounded-2xl relative shadow-[0_0_30px_rgba(52,211,153,0.3)]">
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse absolute top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Flip camera button */}
              <button
                type="button"
                onClick={() => {
                  setCameraFacing((prev) => (prev === "environment" ? "user" : "environment"));
                }}
                className="absolute top-3 right-3 p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-white hover:bg-black/80 transition-colors cursor-pointer text-xs flex items-center gap-1.5"
                title={t.flipCamera}
              >
                <FlipHorizontal size={14} />
                <span className="text-[10px] hidden sm:inline">{t.flipCamera}</span>
              </button>

              {/* Processing Overlay */}
              {processing && (
                <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-white text-xs font-bold">
                  <RotateCw className="animate-spin text-emerald-400" size={24} />
                  <span>{t.validatingPass}</span>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-xs flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0 text-red-400" />
                <span>{cameraError}</span>
              </div>
            )}

            <p className="text-xs text-slate-400 text-center">
              {t.scannerHelp}
            </p>
          </div>
        )}

        {/* ── TAB 2: MANUAL SEARCH ── */}
        {activeTab === "manual" && !result && (
          <div className="rounded-2xl bg-slate-900 border border-white/10 p-5 space-y-4 shadow-xl">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {t.manualTitle}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {t.manualSubtitle}
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (searchQuery.trim()) {
                  executeCheckIn({ query: searchQuery.trim() });
                }
              }}
              className="space-y-3"
            >
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full pl-9 pr-3 py-3 rounded-xl bg-slate-950 border border-white/15 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <button
                type="submit"
                disabled={processing || !searchQuery.trim()}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer shadow flex items-center justify-center gap-2"
              >
                {processing ? <RotateCw size={15} className="animate-spin" /> : <span>{t.searchBtn}</span>}
              </button>
            </form>
          </div>
        )}

        {/* ── TAB 3: TODAY'S LIST (ROSTER) ── */}
        {activeTab === "roster" && (
          <div className="rounded-2xl bg-slate-900 border border-white/10 p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  {t.rosterTitle} ({rosterStats.present} / {rosterStats.total})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t.rosterSubtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={fetchRoster}
                disabled={rosterLoading}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer"
                title={t.refreshTooltip}
              >
                <RefreshCw size={14} className={rosterLoading ? "animate-spin text-emerald-400" : ""} />
              </button>
            </div>

            {roster.length === 0 ? (
              <div className="py-10 text-center text-slate-500 text-xs">
                {t.rosterEmpty}
              </div>
            ) : (
              <div className="divide-y divide-white/5 max-h-[60vh] overflow-y-auto">
                {roster.map((c, idx) => (
                  <div
                    key={c.id}
                    className="py-3 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 text-center text-slate-600 font-mono text-[11px]">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <strong className="block text-white truncate text-xs">
                          {c.name}
                        </strong>
                        <span className="text-[11px] text-slate-400 block font-mono">
                          {c.whatsapp}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {c.attendedAt ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">
                          🟢 {t.rosterPresent} ({new Date(c.attendedAt).toLocaleTimeString(lang === "pt" ? "pt-MZ" : "en-US", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Maputo" })})
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => executeCheckIn({ id: c.id })}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200 hover:text-white border border-emerald-500/40 font-bold text-[11px] transition-all cursor-pointer"
                        >
                          {t.rosterCheckIn}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function GateSecurityPortal() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#07090e] text-white flex items-center justify-center p-4">
          <RefreshCw className="animate-spin text-emerald-400" size={24} />
        </div>
      }
    >
      <GateSecurityContent />
    </Suspense>
  );
}
