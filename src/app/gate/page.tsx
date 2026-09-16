"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import jsQR from "jsqr";
import {
  ShieldCheck,
  ScanLine,
  Search,
  Users,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  RotateCw,
  LogOut,
  LockKeyhole,
  RefreshCw,
  Check,
  FlipHorizontal,
  ArrowRight,
  MapPin,
} from "lucide-react";
import Logo from "@/components/ui/Logo";
import TechGrid from "@/components/ui/TechGrid";
import LazyVideo from "@/components/ui/LazyVideo";
import { IMAGES } from "@/lib/constants";
import { formatSlotDisplay, getMaputoTime } from "@/lib/careers";

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
  alreadyCheckedIn?: boolean;
  error?: string;
  actualSlot?: string;
  attendedAt?: string;
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
    loading: "A ligar ao posto de segurança...",
    lockBadge: "Portaria de Segurança",
    lockTitle: "Controlo de Acesso Overwatch",
    lockSubtitle: "Validação e registo de presenças para testes presenciais de candidatas.",
    pinLabel: "PIN de Segurança da Portaria",
    pinPlaceholder: "Introduza o código PIN",
    pinSubmit: "Entrar no Posto",
    pinVerifying: "A verificar…",
    pinIncorrect: "PIN de segurança incorrecto.",
    pinError: "Erro ao comunicar com o servidor.",
    address: "Av. Paulo Samuel Kankhomba nº 1498, Maputo",
    postTitle: "Posto de Portaria Overwatch",
    presentToday: "Presentes Hoje",
    exitPortal: "Terminar Sessão",
    tabCamera: "Leitor QR",
    tabManual: "Pesquisa Manual",
    tabRoster: "Lista de Hoje",
    scannerHelp: "Aponte a câmara para o código QR apresentado pela candidata no telemóvel ou em papel.",
    validatingPass: "A validar passe no sistema…",
    cameraError: "Não foi possível aceder à câmara. Utilize a aba de Pesquisa Manual.",
    accessGranted: "Entrada Autorizada",
    accessWrongDay: "Acesso Recusado: Turno Incorrecto",
    accessAlreadyCheckedIn: "Entrada Já Registada",
    accessDenied: "Acesso Recusado",
    candidateDefault: "Candidata",
    mandatoryProcedure: "Procedimento Obrigatório na Portaria:",
    step1: "Exigir Documento de Identificação Original (BI / Passaporte).",
    step2: "Confirmar que a candidata tem caneta esferográfica (azul ou preta).",
    step3: "Autorizar entrada para a sala de testes.",
    wrongDayMsg: "Esta candidata NÃO está escalada para o turno de hoje.",
    alreadyCheckedInMsg: "Candidata já realizou o check-in anteriormente. Por favor, valide a próxima candidata.",
    checkedInTimePrefix: "Entrada registada às:",
    officialDate: "Data Oficial do Agendamento:",
    guardInstruction: "⚠️ Instrução ao Guarda: Não autorizar a entrada. A candidata deve regressar exclusivamente no dia agendado para respeitar a lotação diária de 10 candidatas.",
    genericDenied: "Esta candidatura não está aprovada para realização de teste.",
    scanNext: "Validar Próxima Candidata",
    manualTitle: "Pesquisa Manual de Candidata",
    manualSubtitle: "Utilize caso a candidata esteja com o telemóvel descarregado ou ecrã danificado.",
    searchPlaceholder: "Número de WhatsApp (ex: 84... ou 82...) ou Nome completo",
    searchBtn: "Verificar & Dar Entrada",
    rosterTitle: "Escala de Hoje",
    rosterSubtitle: "Candidatas com teste confirmado para hoje às 10h00.",
    rosterEmpty: "Nenhuma candidata agendada para hoje na base de dados.",
    rosterPresent: "Presente",
    rosterAwaiting: "Aguardado",
    refreshTooltip: "Actualizar lista",
    connError: "Erro de ligação com a base de dados. Tente novamente.",
    flipCamera: "Mudar câmara",
    timeLockBadge: "Posto Bloqueado até às 09h00 (Hora de Moçambique)",
    timeLockTitle: "Check-in Bloqueado até às 09h00",
    timeLockSubtitle: "O check-in de candidatas na portaria só é permitido a partir das 09h00 (Hora de Moçambique). Todo o sistema de validação e leitura de códigos QR será activado automaticamente às 09h00.",
    timeLockCountdownLabel: "Abertura Automática em:",
    timeLockCurrentTimeLabel: "Horário Actual de Maputo:",
    timeLockAutoNotice: "Não é necessário actualizar a página. O sistema activará sozinho às 09h00.",
    timeLockManualNotice: "A pesquisa manual e o check-in só abrem às 09h00 (Hora de Moçambique).",
    timeLockBtnDisabled: "Check-in Desactivado até às 09h00",
    timeLockRosterNotice: "O check-in e validação de presenças estarão disponíveis a partir das 09h00.",
    timeLockError: "O check-in na portaria só é permitido a partir das 09h00 (Hora de Moçambique). Aguarde até às 09h00.",
    accessTimeLocked: "Check-in Desactivado (Antes das 09h00)",
  },
  en: {
    loading: "Connecting to security gate…",
    lockBadge: "Security Gate Portal",
    lockTitle: "Overwatch Access Control",
    lockSubtitle: "Entrance pass verification and attendance logging for candidate testing.",
    pinLabel: "Gate Security PIN",
    pinPlaceholder: "Enter security PIN",
    pinSubmit: "Enter Gate Post",
    pinVerifying: "Verifying…",
    pinIncorrect: "Incorrect security PIN.",
    pinError: "Error communicating with server.",
    address: "Av. Paulo Samuel Kankhomba nº 1498, Maputo",
    postTitle: "Overwatch Gate Post",
    presentToday: "Present Today",
    exitPortal: "Sign Out",
    tabCamera: "QR Scanner",
    tabManual: "Manual Search",
    tabRoster: "Today's Roster",
    scannerHelp: "Point camera at the QR code presented by the candidate on their phone or printed paper.",
    validatingPass: "Validating pass in database…",
    cameraError: "Could not access camera. Please use the Manual Search tab.",
    accessGranted: "Access Granted",
    accessWrongDay: "Access Denied: Scheduled for Another Day",
    accessAlreadyCheckedIn: "Already Checked In",
    accessDenied: "Access Denied",
    candidateDefault: "Candidate",
    mandatoryProcedure: "Mandatory Gate Procedure:",
    step1: "Inspect Original Identification Document (National ID / Passport).",
    step2: "Confirm candidate has a ballpoint pen (blue or black).",
    step3: "Grant entry to the examination room.",
    wrongDayMsg: "This candidate is NOT scheduled for today's session.",
    alreadyCheckedInMsg: "Applicant already checked in. Please scan next applicant.",
    checkedInTimePrefix: "Checked in at:",
    officialDate: "Official Scheduled Date & Time:",
    guardInstruction: "⚠️ Guard Instruction: Do NOT grant entry. The candidate must return strictly on their scheduled date to maintain the daily cap of 10 candidates.",
    genericDenied: "This application is not approved or not booked for a test session.",
    scanNext: "Scan Next Applicant",
    manualTitle: "Manual Candidate Search",
    manualSubtitle: "Use if candidate's phone battery is flat or screen is damaged.",
    searchPlaceholder: "WhatsApp number (e.g. 84... or 82...) or Full Name",
    searchBtn: "Verify & Check In",
    rosterTitle: "Today's Roster",
    rosterSubtitle: "Candidates confirmed for today's test at 10:00 AM.",
    rosterEmpty: "No candidates scheduled for today in database.",
    rosterPresent: "Present",
    rosterAwaiting: "Awaiting",
    refreshTooltip: "Refresh list",
    connError: "Database connection error. Please try again.",
    flipCamera: "Flip camera",
    timeLockBadge: "Post Locked until 09:00 AM (Mozambique Time)",
    timeLockTitle: "Check-in Locked until 09:00 AM",
    timeLockSubtitle: "Candidate check-in at the security gate is strictly permitted starting from 09:00 AM (Mozambique Time). All pass validation and QR scanning will automatically enable at 09:00 AM.",
    timeLockCountdownLabel: "Automatic Opening In:",
    timeLockCurrentTimeLabel: "Current Maputo Time:",
    timeLockAutoNotice: "No need to refresh the page. The system will activate automatically at 09:00 AM.",
    timeLockManualNotice: "Manual search and check-in will open at 09:00 AM (Mozambique Time).",
    timeLockBtnDisabled: "Check-in Disabled until 09:00 AM",
    timeLockRosterNotice: "Check-in and attendance verification will become available at 09:00 AM.",
    timeLockError: "Gate check-in is strictly permitted from 09:00 AM (Mozambique Time). Please wait until 09:00 AM.",
    accessTimeLocked: "Check-in Disabled (Before 09:00 AM)",
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

  // Live Maputo Time and 9 AM Lock Tracker (Africa/Maputo, UTC+2)
  const [maputoTime, setMaputoTime] = useState(() => getMaputoTime());

  useEffect(() => {
    const timer = setInterval(() => {
      setMaputoTime(getMaputoTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
  const lastScanTimeRef = useRef<number>(0);

  // Helper to retrieve gate officer token for seamless authentication
  const getGateHeaders = useCallback((): Record<string, string> => {
    let token = "authorized_gate_officer";
    if (typeof window !== "undefined") {
      try {
        token = localStorage.getItem("overwatch_gate_token") || "authorized_gate_officer";
      } catch (_) {}
    }
    return {
      "x-gate-token": token,
      "Cache-Control": "no-cache",
    };
  }, []);

  // Check auth session on load
  useEffect(() => {
    let token = "";
    try {
      token = localStorage.getItem("overwatch_gate_token") || "";
    } catch (_) {}

    fetch("/api/gate/session", {
      cache: "no-store",
      credentials: "include",
      headers: token ? { "x-gate-token": token } : {},
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated) {
          setAuthed(true);
        } else if (token === "authorized_gate_officer") {
          // Token remembered locally, keep authorized
          setAuthed(true);
        } else {
          setAuthed(false);
        }
      })
      .catch(() => {
        if (token === "authorized_gate_officer") {
          setAuthed(true);
        } else {
          setAuthed(false);
        }
      });
  }, []);

  // Fetch today roster with explicit headers and credentials
  const fetchRoster = useCallback(async () => {
    try {
      setRosterLoading(true);
      const res = await fetch("/api/gate/roster", {
        cache: "no-store",
        credentials: "include",
        headers: getGateHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setRoster(data.candidates || []);
        setRosterStats({ total: data.totalToday || 0, present: data.presentCount || 0 });
      } else {
        console.warn("Gate roster response not OK:", res.status);
      }
    } catch (e) {
      console.error("Failed to load roster:", e);
    } finally {
      setRosterLoading(false);
    }
  }, [getGateHeaders]);

  useEffect(() => {
    if (authed) {
      fetchRoster();
      const interval = setInterval(fetchRoster, 15000);
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
        try {
          localStorage.setItem("overwatch_gate_token", "authorized_gate_officer");
        } catch (_) {}
        setAuthed(true);
        setTimeout(fetchRoster, 100);
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
    try {
      localStorage.removeItem("overwatch_gate_token");
    } catch (_) {}
    await fetch("/api/gate/session", { method: "DELETE" }).catch(() => {});
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
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
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

  // Stop camera cleanly
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch (_) {}
      });
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
      if (maputoTime.isBeforeNineAm && !payload.force) {
        setResult({
          success: false,
          code: "BEFORE_NINE_AM",
          error: t.timeLockError,
        });
        playSound("denied");
        return;
      }

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
        } else if (data.alreadyCheckedIn || data.code === "ALREADY_CHECKED_IN") {
          // Already checked in case
          setResult({
            success: false,
            alreadyCheckedIn: true,
            code: "ALREADY_CHECKED_IN",
            attendedAt: data.attendedAt || data.candidate?.attendedAt,
            actualSlot: data.scheduledSlot || data.actualSlot,
            candidate: data.candidate,
          });
          playSound("denied");
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
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
    [fetchRoster, t.connError, t.timeLockError, maputoTime.isBeforeNineAm],
  );

  // Auto-verify if urlId is passed in query string
  useEffect(() => {
    if (authed && urlId && !hasAutoChecked.current) {
      hasAutoChecked.current = true;
      executeCheckIn({ id: urlId });
      // Immediately clean ?id= from the browser URL so page reloads do not re-scan the same candidate
      if (typeof window !== "undefined") {
        try {
          const u = new URL(window.location.href);
          if (u.searchParams.has("id")) {
            u.searchParams.delete("id");
            window.history.replaceState(null, "", u.pathname + (u.search ? u.search : ""));
          }
        } catch (_) {}
      }
    }
  }, [authed, urlId, executeCheckIn]);

  // HIGH-PERFORMANCE THROTTLED QR SCANNING LOOP
  const scanLoop = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || maputoTime.isBeforeNineAm) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Performance throttle: Scan at most once every 120ms (approx 8 scans/sec instead of 60fps)
    const now = performance.now();
    if (now - lastScanTimeRef.current >= 120) {
      lastScanTimeRef.current = now;

      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          // Downscale to max 480px width for 55x less pixel crunching and instant mobile speed
          const scale = Math.min(1, 480 / video.videoWidth);
          const targetW = Math.max(240, Math.floor(video.videoWidth * scale));
          const targetH = Math.max(180, Math.floor(video.videoHeight * scale));

          if (canvas.width !== targetW || canvas.height !== targetH) {
            canvas.width = targetW;
            canvas.height = targetH;
          }

          ctx.drawImage(video, 0, 0, targetW, targetH);
          const imgData = ctx.getImageData(0, 0, targetW, targetH);
          const code = jsQR(imgData.data, targetW, targetH, {
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
              }, 3000);
            }
          }
        }
      }
    }

    animFrameRef.current = requestAnimationFrame(scanLoop);
  }, [executeCheckIn, processing]);

  // Start Camera with clean device acquisition
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
        lastScanTimeRef.current = 0;
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
    if (authed && activeTab === "camera" && !result && !maputoTime.isBeforeNineAm) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [authed, activeTab, result, maputoTime.isBeforeNineAm, startCamera, stopCamera]);

  const resetScanner = () => {
    setResult(null);
    lastScannedRef.current = null;
    if (scanCooldownRef.current) {
      clearTimeout(scanCooldownRef.current);
      scanCooldownRef.current = null;
    }
    if (typeof window !== "undefined") {
      try {
        const u = new URL(window.location.href);
        if (u.searchParams.has("id")) {
          u.searchParams.delete("id");
          window.history.replaceState(null, "", u.pathname + (u.search ? u.search : ""));
        }
      } catch (_) {}
    }
  };

  // Loading Session
  if (authed === null) {
    return (
      <div className="min-h-screen bg-[#07080f] text-white flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-sm text-white/70">
          <RefreshCw className="animate-spin text-white/80" size={20} />
          <span>{t.loading}</span>
        </div>
      </div>
    );
  }

  // ── LOCK SCREEN WITH BACKGROUND VIDEO (IDENTICAL TO ADMIN PORTAL) ──
  if (!authed) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#07080f] text-white relative isolate overflow-hidden px-4 py-12">
        {/* Background Video */}
        <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
          <LazyVideo
            className="h-full w-full object-cover mix-blend-luminosity"
            poster={IMAGES.videoPoster}
            rootMargin="700px"
            src={IMAGES.videoSrc}
          />
        </div>
        <div className="absolute inset-0 bg-[#07080f]/80 z-0 pointer-events-none" />
        <TechGrid className="absolute inset-0 opacity-35 pointer-events-none z-0" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.06),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.03),transparent_40%)] pointer-events-none z-0" />

        <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#121827]/95 p-8 shadow-[0_32px_80px_rgba(0,0,0,0.6)] backdrop-blur-md">
          {/* Top Language Toggle */}
          <div className="flex justify-end mb-2">
            <div className="flex items-center rounded-xl bg-white/[0.06] border border-white/10 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => switchLanguage("pt")}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  lang === "pt"
                    ? "bg-white text-[#090d16] shadow-sm font-bold"
                    : "text-white/60 hover:text-white"
                }`}
              >
                PT
              </button>
              <button
                type="button"
                onClick={() => switchLanguage("en")}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  lang === "en"
                    ? "bg-white text-[#090d16] shadow-sm font-bold"
                    : "text-white/60 hover:text-white"
                }`}
              >
                EN
              </button>
            </div>
          </div>

          <div className="text-center pb-6 border-b border-white/10">
            <div className="flex justify-center mb-4">
              <Logo size="md" variant="light" />
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-[0.68rem] font-bold uppercase tracking-wider text-white/80">
              <ShieldCheck size={13} className="text-sky-400" />
              {t.lockBadge}
            </span>
            <h1 className="mt-3 text-xl font-bold text-white tracking-tight">
              {t.lockTitle}
            </h1>
            <p className="mt-1 text-xs text-white/60">
              {t.lockSubtitle}
            </p>
          </div>

          <form onSubmit={handlePinSubmit} className="mt-6 space-y-4">
            <label className="block space-y-1.5 text-left">
              <span className="text-xs font-semibold text-white/80">
                {t.pinLabel}
              </span>
              <div className="relative">
                <LockKeyhole size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder={t.pinPlaceholder}
                  autoFocus
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/15 bg-white/[0.04] text-white text-sm placeholder:text-white/30 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/15 transition-colors tracking-widest text-center"
                />
              </div>
              {pinError && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400 font-medium mt-2"
                >
                  {pinError}
                </div>
              )}
            </label>

            <button
              type="submit"
              disabled={pinBusy || !pinInput.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3.5 text-sm font-semibold text-[#090d16] shadow-lg shadow-black/30 transition-all hover:bg-white/90 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {pinBusy ? <RotateCw size={16} className="animate-spin" /> : null}
              <span>{pinBusy ? t.pinVerifying : t.pinSubmit}</span>
              {!pinBusy && <ArrowRight size={16} />}
            </button>
          </form>

          <p className="mt-6 text-[11px] text-white/40 text-center font-mono flex items-center justify-center gap-1.5">
            <MapPin size={11} className="text-white/30" />
            {t.address}
          </p>
        </div>
      </main>
    );
  }

  // ── MAIN GATE SECURITY DASHBOARD ──
  return (
    <div className="min-h-screen bg-[#07080f] text-white flex flex-col relative isolate">
      <TechGrid className="fixed inset-0 opacity-15 pointer-events-none -z-10" />

      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-[#0d1121]/95 backdrop-blur-md border-b border-white/10 px-3 sm:px-4 py-2.5 sm:py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Logo size="sm" variant="light" />
            <div className="h-5 w-px bg-white/10 hidden md:block" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-[11px] sm:text-xs font-bold text-white uppercase tracking-wider truncate">
                  <span className="hidden sm:inline">{t.postTitle}</span>
                  <span className="sm:hidden">{lang === "pt" ? "Portaria" : "Gate"}</span>
                </h1>
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              </div>
              <p className="text-[10px] text-white/50 truncate hidden md:flex items-center gap-1">
                <MapPin size={10} className="text-white/40" />
                {t.address}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Live Maputo Clock & 9 AM Lock Status */}
            {maputoTime.isBeforeNineAm ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg sm:rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 font-mono text-[10px] sm:text-xs">
                <Clock size={12} className="text-amber-400 shrink-0 animate-pulse" />
                <span className="hidden sm:inline">Maputo:</span>
                <span className="font-bold">{maputoTime.timeString}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/25 text-amber-200 border border-amber-500/40 uppercase font-bold">
                  {lang === "pt" ? `Abre 09h00` : `Opens 9 AM`}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg sm:rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-mono text-[10px] sm:text-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="hidden sm:inline">Maputo:</span>
                <span className="font-bold">{maputoTime.timeString}</span>
              </div>
            )}

            {/* Live Today Counter */}
            <div className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border border-white/10 bg-white/[0.04] text-right">
              <div className="text-[8px] sm:text-[9px] text-white/50 font-medium leading-none hidden xs:block">
                {t.presentToday}
              </div>
              <div className="text-[11px] sm:text-xs font-bold text-emerald-400 font-mono">
                {rosterStats.present}/{rosterStats.total}
              </div>
            </div>

            {/* Language Switcher Pill */}
            <div className="flex items-center rounded-lg sm:rounded-xl bg-white/[0.06] border border-white/10 p-0.5 text-[10px] sm:text-xs font-bold">
              <button
                type="button"
                onClick={() => switchLanguage("pt")}
                className={`px-2 sm:px-2.5 py-1 rounded-md sm:rounded-lg font-semibold transition-all cursor-pointer ${
                  lang === "pt"
                    ? "bg-white text-[#090d16] shadow-sm font-bold"
                    : "text-white/60 hover:text-white"
                }`}
              >
                PT
              </button>
              <button
                type="button"
                onClick={() => switchLanguage("en")}
                className={`px-2 sm:px-2.5 py-1 rounded-md sm:rounded-lg font-semibold transition-all cursor-pointer ${
                  lang === "en"
                    ? "bg-white text-[#090d16] shadow-sm font-bold"
                    : "text-white/60 hover:text-white"
                }`}
              >
                EN
              </button>
            </div>

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
              title={t.exitPortal}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-6 flex flex-col space-y-4">
        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 p-1 rounded-xl bg-[#0d1121] border border-white/10 text-xs shadow-inner">
          <button
            type="button"
            onClick={() => {
              resetScanner();
              setActiveTab("camera");
            }}
            className={`flex items-center justify-center gap-1 sm:gap-1.5 py-2 sm:py-2.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === "camera"
                ? "bg-white text-[#090d16] font-bold shadow-md"
                : "text-white/60 hover:text-white"
            }`}
          >
            <ScanLine size={14} className="shrink-0" />
            <span className="truncate">
              <span className="sm:hidden">{lang === "pt" ? "Escanear" : "Scan"}</span>
              <span className="hidden sm:inline">{t.tabCamera}</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              setActiveTab("manual");
            }}
            className={`flex items-center justify-center gap-1 sm:gap-1.5 py-2 sm:py-2.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === "manual"
                ? "bg-white text-[#090d16] font-bold shadow-md"
                : "text-white/60 hover:text-white"
            }`}
          >
            <Search size={14} className="shrink-0" />
            <span className="truncate">
              <span className="sm:hidden">{lang === "pt" ? "Manual" : "Manual"}</span>
              <span className="hidden sm:inline">{t.tabManual}</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              setActiveTab("roster");
              fetchRoster();
            }}
            className={`flex items-center justify-center gap-1 sm:gap-1.5 py-2 sm:py-2.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === "roster"
                ? "bg-white text-[#090d16] font-bold shadow-md"
                : "text-white/60 hover:text-white"
            }`}
          >
            <Users size={14} className="shrink-0" />
            <span className="truncate">
              <span className="sm:hidden">{lang === "pt" ? `Hoje (${rosterStats.total})` : `Today (${rosterStats.total})`}</span>
              <span className="hidden sm:inline">{t.tabRoster} ({rosterStats.total})</span>
            </span>
          </button>
        </div>

        {/* ── VERIFICATION RESULT OVERLAY / CARD ── */}
        {result && (
          <div
            className={`rounded-2xl border p-5 sm:p-6 transition-all shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${
              result.success
                ? "bg-emerald-950/80 border-emerald-500/60 shadow-emerald-950/50 text-emerald-100"
                : result.alreadyCheckedIn || result.code === "ALREADY_CHECKED_IN"
                  ? "bg-cyan-950/85 border-cyan-500/60 shadow-cyan-950/50 text-cyan-100"
                  : result.code === "WRONG_DAY" || result.code === "BEFORE_NINE_AM"
                    ? "bg-amber-950/85 border-amber-500/60 shadow-amber-950/50 text-amber-100"
                    : "bg-red-950/85 border-red-500/60 shadow-red-950/50 text-red-100"
            }`}
          >
            <div className="flex items-start gap-4">
              {result.success ? (
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-300 shrink-0">
                  <CheckCircle2 size={30} />
                </div>
              ) : result.alreadyCheckedIn || result.code === "ALREADY_CHECKED_IN" ? (
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center text-cyan-300 shrink-0">
                  <AlertTriangle size={30} />
                </div>
              ) : result.code === "WRONG_DAY" || result.code === "BEFORE_NINE_AM" ? (
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-300 shrink-0">
                  {result.code === "BEFORE_NINE_AM" ? <Clock size={30} /> : <AlertTriangle size={30} />}
                </div>
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-red-500/20 border-2 border-red-400 flex items-center justify-center text-red-300 shrink-0">
                  <XCircle size={30} />
                </div>
              )}

              <div className="space-y-2 flex-1 min-w-0">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    result.success
                      ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
                      : result.alreadyCheckedIn || result.code === "ALREADY_CHECKED_IN"
                        ? "bg-cyan-500/30 text-cyan-300 border border-cyan-500/40"
                        : result.code === "WRONG_DAY"
                          ? "bg-amber-500/30 text-amber-300 border border-amber-500/40"
                          : "bg-red-500/30 text-red-300 border border-red-500/40"
                  }`}
                >
                  {result.success
                    ? t.accessGranted
                    : result.alreadyCheckedIn || result.code === "ALREADY_CHECKED_IN"
                      ? t.accessAlreadyCheckedIn
                      : result.code === "BEFORE_NINE_AM"
                        ? t.accessTimeLocked
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
                      <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                      <span>{t.step1}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                      <span>{t.step2}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                      <span>{t.step3}</span>
                    </div>
                  </div>
                )}

                {/* ALREADY CHECKED IN CASE */}
                {(result.alreadyCheckedIn || result.code === "ALREADY_CHECKED_IN") && (
                  <div className="pt-2 mt-2 border-t border-cyan-500/30 space-y-2 text-xs">
                    <p className="text-white font-semibold text-sm">
                      {t.alreadyCheckedInMsg}
                    </p>
                    {result.attendedAt && (
                      <div className="p-3 rounded-xl bg-black/40 border border-cyan-500/30">
                        <span className="text-[10px] text-cyan-300 uppercase tracking-wide block font-bold">
                          {t.checkedInTimePrefix}
                        </span>
                        <span className="text-sm font-bold text-white block mt-0.5 font-mono">
                          {new Date(result.attendedAt).toLocaleTimeString(lang === "pt" ? "pt-MZ" : "en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                            timeZone: "Africa/Maputo",
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* BEFORE 9 AM LOCK RESULT */}
                {!result.success && result.code === "BEFORE_NINE_AM" && (
                  <div className="pt-2 mt-2 border-t border-amber-500/30 space-y-3 text-xs">
                    <p className="text-white font-semibold text-sm">
                      {t.timeLockError}
                    </p>
                    <div className="p-3.5 rounded-xl bg-black/40 border border-amber-500/30 text-center">
                      <span className="text-[10px] text-amber-300 uppercase tracking-widest block font-bold">
                        {t.timeLockCountdownLabel}
                      </span>
                      <span className="text-2xl font-black text-white block mt-0.5 font-mono tracking-widest">
                        {maputoTime.countdownString}
                      </span>
                      <span className="text-[10px] text-white/60 font-mono mt-1 block">
                        {t.timeLockCurrentTimeLabel} {maputoTime.timeString}
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-200/90">
                      {t.timeLockAutoNotice}
                    </p>
                  </div>
                )}

                {/* Wrong Day Details */}
                {!result.success && !result.alreadyCheckedIn && result.code === "WRONG_DAY" && (
                  <div className="pt-2 mt-2 border-t border-amber-500/30 space-y-2 text-xs">
                    <p className="text-white font-medium">
                      {t.wrongDayMsg}
                    </p>
                    {result.actualSlot && (
                      <div className="p-3 rounded-xl bg-black/40 border border-amber-500/30">
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
                {!result.success && !result.alreadyCheckedIn && result.code !== "WRONG_DAY" && (
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
                className="w-full py-3 rounded-xl bg-white/15 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer text-center"
              >
                {t.scanNext}
              </button>
            </div>
          </div>
        )}

        {/* ── TAB 1: CAMERA SCANNER ── */}
        {activeTab === "camera" && !result && maputoTime.isBeforeNineAm && (
          <div className="rounded-2xl bg-[#0e1424] border border-amber-500/30 p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
              <LockKeyhole size={30} />
            </div>

            <div className="max-w-md space-y-2">
              <div className="inline-block px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold uppercase tracking-widest">
                {t.timeLockBadge}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {t.timeLockTitle}
              </h2>
              <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
                {t.timeLockSubtitle}
              </p>
            </div>

            {/* Big Countdown Timer */}
            <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-5 sm:p-6 w-full max-w-sm text-center shadow-inner">
              <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold mb-1">
                {t.timeLockCountdownLabel}
              </div>
              <div className="text-3xl sm:text-4xl font-mono font-black text-white tracking-widest my-1 drop-shadow-md">
                {maputoTime.countdownString}
              </div>
              <div className="text-[11px] text-white/50 font-mono mt-2">
                {t.timeLockCurrentTimeLabel} <span className="text-white font-semibold">{maputoTime.timeString}</span>
              </div>
            </div>

            {/* Auto-Enable Notice */}
            <div className="flex items-center gap-2 text-xs text-amber-200/90 bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 rounded-xl max-w-md">
              <RotateCw size={14} className="text-amber-400 shrink-0 animate-spin" />
              <span>{t.timeLockAutoNotice}</span>
            </div>
          </div>
        )}

        {activeTab === "camera" && !result && !maputoTime.isBeforeNineAm && (
          <div className="flex-1 flex flex-col space-y-3">
            <div className="relative rounded-2xl overflow-hidden bg-black border border-white/10 aspect-[4/3] sm:aspect-video flex items-center justify-center shadow-2xl">
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
                className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-white hover:bg-black/80 transition-colors cursor-pointer text-xs flex items-center gap-1.5 shadow-lg"
                title={t.flipCamera}
              >
                <FlipHorizontal size={14} />
                <span className="text-[10px] hidden sm:inline font-medium">{t.flipCamera}</span>
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
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-xs flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0 text-red-400" />
                <span>{cameraError}</span>
              </div>
            )}

            <p className="text-xs text-white/50 text-center">
              {t.scannerHelp}
            </p>
          </div>
        )}

        {/* ── TAB 2: MANUAL SEARCH ── */}
        {activeTab === "manual" && !result && (
          <div className="rounded-2xl bg-[#111827] border border-white/10 p-6 space-y-4 shadow-xl">
            {maputoTime.isBeforeNineAm && (
              <div className="rounded-xl bg-amber-500/15 border border-amber-500/30 p-3.5 flex items-start gap-3 text-xs text-amber-200">
                <Clock size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-amber-300 font-bold uppercase tracking-wide">
                    {t.timeLockBadge}
                  </strong>
                  <span className="text-amber-200/90 mt-0.5 block">
                    {t.timeLockManualNotice} ({t.timeLockCountdownLabel} <strong className="font-mono text-white">{maputoTime.countdownString}</strong>)
                  </span>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Search size={15} className="text-white/60" />
                {t.manualTitle}
              </h3>
              <p className="text-xs text-white/50 mt-1">
                {t.manualSubtitle}
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (maputoTime.isBeforeNineAm) return;
                if (searchQuery.trim()) {
                  executeCheckIn({ query: searchQuery.trim() });
                }
              }}
              className="space-y-4"
            >
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  disabled={maputoTime.isBeforeNineAm}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/15 bg-white/[0.04] text-white text-sm placeholder:text-white/30 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                />
              </div>

              <button
                type="submit"
                disabled={maputoTime.isBeforeNineAm || processing || !searchQuery.trim()}
                className="w-full py-3.5 rounded-xl bg-white hover:bg-white/90 text-[#090d16] text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-black/30 flex items-center justify-center gap-2"
              >
                {processing ? <RotateCw size={15} className="animate-spin" /> : null}
                <span>{maputoTime.isBeforeNineAm ? t.timeLockBtnDisabled : t.searchBtn}</span>
                {!processing && !maputoTime.isBeforeNineAm && <ArrowRight size={15} />}
              </button>
            </form>
          </div>
        )}

        {/* ── TAB 3: TODAY'S LIST (ROSTER) ── */}
        {activeTab === "roster" && (
          <div className="rounded-2xl bg-[#111827] border border-white/10 p-6 space-y-4 shadow-xl">
            {maputoTime.isBeforeNineAm && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 flex items-center gap-2 text-xs text-amber-300 mb-2">
                <Clock size={14} className="text-amber-400 shrink-0" />
                <span>{t.timeLockRosterNotice} (Maputo: {maputoTime.timeString})</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Users size={15} className="text-white/60" />
                  {t.rosterTitle} ({rosterStats.present} / {rosterStats.total})
                </h3>
                <p className="text-xs text-white/50 mt-1">
                  {t.rosterSubtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={fetchRoster}
                disabled={rosterLoading}
                className="p-2 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                title={t.refreshTooltip}
              >
                <RefreshCw size={14} className={rosterLoading ? "animate-spin text-sky-400" : ""} />
              </button>
            </div>

            {roster.length === 0 ? (
              <div className="py-12 text-center text-white/40 text-xs">
                {t.rosterEmpty}
              </div>
            ) : (
              <div className="divide-y divide-white/5 max-h-[60vh] overflow-y-auto">
                {roster.map((c, idx) => {
                  const initials = c.name
                    .split(" ")
                    .filter(Boolean)
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();

                  return (
                    <div
                      key={c.id}
                      className="py-3.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center font-mono font-bold text-white/70 text-xs shrink-0">
                          {initials || idx + 1}
                        </div>
                        <div className="min-w-0">
                          <strong className="block text-white truncate text-xs font-semibold">
                            {c.name}
                          </strong>
                          <span className="text-[11px] text-white/50 block font-mono">
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
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white/5 border border-white/10 text-white/40">
                            ⏳ {t.rosterAwaiting}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
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
        <div className="min-h-screen bg-[#07080f] text-white flex items-center justify-center p-4">
          <RefreshCw className="animate-spin text-white/80" size={24} />
        </div>
      }
    >
      <GateSecurityContent />
    </Suspense>
  );
}
