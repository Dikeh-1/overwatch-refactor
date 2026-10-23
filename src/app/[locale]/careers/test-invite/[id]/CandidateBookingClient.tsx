"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Check,
  RefreshCw,
  Lock,
  ShieldOff,
  QrCode,
  Download,
  Printer,
  ShieldCheck,
  RotateCcw,
  MessageSquare,
  Mail,
  Sparkles,
  X,
} from "lucide-react";
import { siteContact } from "@/lib/site-config";
import { formatSlotDisplay, isPastDateSlot } from "@/lib/careers";
import { openOverwatchChatbot } from "@/components/layout/ZohoChatbot";

type SlotStat = {
  booked: number;
  max: number;
  isFull: boolean;
  isPast?: boolean;
  remaining: number;
};

type CandidateData = {
  id: string;
  name: string;
  role: string;
  cohortId?: string | null;
  roleTitle?: { pt: string; en: string };
  referenceCode?: string;
  durationText?: { pt: string; en: string };
  venueLandmark?: { pt: string; en: string };
  whatToBring?: { pt: string[]; en: string[] };
  testSlot: string | null;
  previousTestSlot?: string | null;
  rebookingGraceActive?: boolean;
  testBookedAt: string | null;
  invitedAt: string | null;
  attendedAt?: string | null;
  attendanceStatus?: string | null;
  slots: string[];
  slotStats?: Record<string, SlotStat>;
  windowFilledNotice?: boolean;
  address: string;
  supportEmail?: string;
};

function ChatbotSupportHeadsUp({
  isPt,
  supportEmail = "info@overwatchmoz.com",
}: {
  isPt: boolean;
  supportEmail?: string;
}) {
  return (
    <div className="space-y-2">
      {/* Heads-up support card */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 p-5 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#07080f] text-emerald-400 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <MessageSquare size={18} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs sm:text-sm font-bold text-gray-900">
                  {isPt
                    ? "Tem alguma dúvida, dificuldade ou questão?"
                    : "Have any problems, questions, or enquiries?"}
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <Sparkles size={10} />
                  <span>{isPt ? "Apoio ao Candidato" : "Candidate Support"}</span>
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                {isPt ? (
                  <>
                    Se tiver qualquer problema ou dúvida, contacte-nos através do{" "}
                    <strong className="text-gray-900">Chatbot no nosso website</strong> — escolha a opção{" "}
                    <strong className="text-emerald-700">«Falar com um agente»</strong>{" "}
                    <span className="text-gray-500">(&ldquo;Speak with an agent&rdquo;)</span> e a nossa equipa irá responder. Em alternativa, envie-nos um email para{" "}
                    <a
                      href={`mailto:${supportEmail}`}
                      className="font-bold text-gray-900 underline decoration-emerald-500/60 underline-offset-2 hover:text-emerald-700"
                    >
                      {supportEmail}
                    </a>{" "}
                    — respondemos mais rapidamente.
                  </>
                ) : (
                  <>
                    If you have any problems or enquiries, please contact us via the{" "}
                    <strong className="text-gray-900">Chatbot on our website</strong> — choose{" "}
                    <strong className="text-emerald-700">&ldquo;Speak with an agent&rdquo;</strong>{" "}
                    and we will respond. Or send us an email at{" "}
                    <a
                      href={`mailto:${supportEmail}`}
                      className="font-bold text-gray-900 underline decoration-emerald-500/60 underline-offset-2 hover:text-emerald-700"
                    >
                      {supportEmail}
                    </a>{" "}
                    — we respond faster.
                  </>
                )}
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => openOverwatchChatbot()}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#07080f] hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 transition-all shadow-sm cursor-pointer"
                >
                  <MessageSquare size={13} className="text-emerald-400" />
                  <span>
                    {isPt
                      ? "Abrir Chatbot · «Falar com um agente»"
                      : 'Open Chatbot · "Speak with an agent"'}
                  </span>
                </button>
                <a
                  href={`mailto:${supportEmail}?subject=${encodeURIComponent(
                    isPt ? "Questão sobre Teste Presencial — Overwatch" : "Test Booking Enquiry — Overwatch",
                  )}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 text-xs font-semibold px-4 py-2.5 transition-all shadow-xs"
                >
                  <Mail size={13} className="text-emerald-600" />
                  <span>{supportEmail}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic, non-obstructive interactive curved arrow pointing toward the Chatbot icon */}
      <div className="flex justify-end pr-2 sm:pr-4 select-none">
        <button
          type="button"
          onClick={() => openOverwatchChatbot()}
          className="group inline-flex flex-col items-end text-right focus:outline-none cursor-pointer"
          title={
            isPt
              ? "Clique para abrir o Chatbot no canto inferior direito"
              : "Click to open the Chatbot in the bottom-right corner"
          }
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50/90 group-hover:bg-emerald-100/90 border border-emerald-200/80 px-3.5 py-1.5 text-[11px] font-semibold text-emerald-900 shadow-xs transition-all">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>
              {isPt
                ? "O ícone do Chatbot está no canto inferior direito — escolha «Falar com um agente»"
                : 'The Chatbot icon is in the bottom-right corner — choose "Speak with an agent"'}
            </span>
          </div>

          {/* Smooth curved SVG arrow sweeping down-right toward the floating chatbot launcher */}
          <div className="pointer-events-none pr-3 -mt-0.5">
            <svg
              width="210"
              height="62"
              viewBox="0 0 210 62"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="overflow-visible text-emerald-600 transition-transform duration-300 group-hover:translate-x-1 group-hover:translate-y-0.5"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="owChatCurveGrad" x1="12" y1="6" x2="194" y2="54" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="55%" stopColor="#059669" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#047857" stopOpacity="1" />
                </linearGradient>
              </defs>
              {/* Soft glow underpath */}
              <path
                d="M 18 8 C 72 8, 128 16, 188 49"
                stroke="#10b981"
                strokeOpacity="0.16"
                strokeWidth="6"
                strokeLinecap="round"
              />
              {/* Animated dashed guide curve */}
              <path
                d="M 18 8 C 72 8, 128 16, 188 49"
                stroke="url(#owChatCurveGrad)"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeDasharray="5 4"
              />
              {/* Arrowhead pointing toward bottom-right */}
              <path
                d="M 176 52 L 191 51 L 185 37"
                stroke="#047857"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Subtle target ring at tip */}
              <circle cx="195" cy="53" r="3.5" fill="#10b981" fillOpacity="0.3" />
              <circle cx="195" cy="53" r="1.75" fill="#047857" />
            </svg>
          </div>
        </button>
      </div>
    </div>
  );
}

export default function CandidateBookingClient({
  id,
  locale,
}: {
  id: string;
  locale: string;
}) {
  // The URL locale (/pt/ or /en/) is the single source of truth. Default is strictly Portuguese (pt).
  const activeLang: "pt" | "en" = locale === "en" ? "en" : "pt";
  const isPt = activeLang === "pt";
  const [candidate, setCandidate] = useState<CandidateData | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isDeactivated, setIsDeactivated] = useState(false);
  const [, setSuccessNotice] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [dismissFloatingArrow, setDismissFloatingArrow] = useState(false);

  useEffect(() => {
    if (candidate?.id && candidate.testSlot) {
      const origin = typeof window !== "undefined" ? window.location.origin : "https://www.overwatchmoz.com";
      const checkInUrl = `${origin}/gate?id=${candidate.id}`;
      QRCode.toDataURL(checkInUrl, {
        width: 320,
        margin: 1.5,
        color: {
          dark: "#07090e",
          light: "#ffffff",
        },
      })
        .then(setQrDataUrl)
        .catch((e) => console.error("Error generating QR code:", e));
    }
  }, [candidate?.id, candidate?.testSlot, activeLang]);

  useEffect(() => {
    let cancelled = false;

    async function fetchCandidate(silent = false) {
      try {
        if (!silent) {
          setLoading(true);
          setError("");
        }
        const res = await fetch(
          `/api/careers/test-booking?id=${encodeURIComponent(id)}&t=${Date.now()}`,
          { cache: "no-store" },
        );

        if (res.status === 410) {
          if (!cancelled) setIsDeactivated(true);
          return;
        }

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            data.error ||
              (isPt
                ? "Não foi possível carregar os detalhes da convocatória."
                : "Could not load invitation details."),
          );
        }
        const data: CandidateData = await res.json();
        if (!cancelled) {
          setCandidate(data);
          setSelectedSlot((currentSelected) => {
            if (data.testSlot) return data.testSlot;
            if (data.slots && data.slots.length > 0) {
              if (currentSelected && data.slots.includes(currentSelected) && !data.slotStats?.[currentSelected]?.isFull) {
                return currentSelected;
              }
              const available = data.slots.find((s) => !data.slotStats?.[s]?.isFull);
              return available || "";
            }
            return "";
          });
        }
      } catch (err) {
        if (!cancelled && !silent) {
          setError((err as Error).message);
        }
      } finally {
        if (!cancelled && !silent) {
          setLoading(false);
        }
      }
    }

    if (id) {
      void fetchCandidate(false);
    } else {
      setError(isPt ? "Link de convocatória inválido." : "Invalid invitation link.");
      setLoading(false);
    }

    const interval = setInterval(() => {
      if (id && !cancelled) void fetchCandidate(true);
    }, 8000);
    const onFocus = () => {
      if (id && !cancelled) void fetchCandidate(true);
    };
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [id, isPt]);

  async function handleConfirmSlot() {
    if (!selectedSlot) {
      setError(isPt ? "Por favor seleccione uma data disponível para o teste." : "Please select an available test slot.");
      return;
    }

    if (candidate?.slotStats?.[selectedSlot]?.isFull) {
      setError(isPt ? "As vagas para esta data já se encontram esgotadas. Por favor seleccione outra data disponível." : "This slot is full. Please choose another available date.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      const res = await fetch("/api/careers/test-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, slot: selectedSlot }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 410) {
        setIsDeactivated(true);
        return;
      }

      if (!res.ok) {
        if (res.status === 409 && data.alreadyBooked) {
          setCandidate((prev) =>
            prev ? { ...prev, testSlot: data.testSlot || prev.testSlot || selectedSlot } : null,
          );
          setError("");
          return;
        }
        throw new Error(
          data.error || (isPt ? "Ocorreu um erro ao confirmar a data." : "Failed to confirm test slot."),
        );
      }

      setCandidate((prev) =>
        prev
          ? { ...prev, testSlot: selectedSlot, testBookedAt: data.testBookedAt || new Date().toISOString() }
          : null,
      );
      setSuccessNotice(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const slotsList = candidate?.slots || [];
  const isAlreadyBooked = Boolean(candidate?.testSlot);

  const isTechManager =
    candidate?.role === "cctv_technical_manager" ||
    Boolean(candidate?.cohortId && candidate.cohortId.includes("cctv_technical_manager"));

  const roleTitleText = isPt
    ? candidate?.roleTitle?.pt || (isTechManager ? "Gestor Técnico e Instalação de CCTV" : "Operadora de CCO")
    : candidate?.roleTitle?.en || (isTechManager ? "CCTV Installation & Technical Manager" : "CCTV Operator");

  const referenceCodeText =
    candidate?.referenceCode || (isTechManager ? "TM-2026/MZQ" : "CCO-2026/MZQ");

  const durationText = isPt
    ? candidate?.durationText?.pt ||
      (isTechManager
        ? "Duração aproximada: 90 minutos · Chegada com 15 min de antecedência"
        : "10h00 às 11h30 · Chegada às 09h30")
    : candidate?.durationText?.en ||
      (isTechManager
        ? "Approximate duration: 90 minutes · Arrive 15 min early"
        : "10:00 AM to 11:30 AM · Arrive at 09:30");

  const venueLandmarkText = isPt
    ? candidate?.venueLandmark?.pt ||
      "Casa cor-de-laranja com portão preto, antes do cruzamento com a Av. Filipe Samuel Magaia"
    : candidate?.venueLandmark?.en ||
      "Orange house with black gate, before the intersection with Av. Filipe Samuel Magaia";

  const whatToBringItems = isPt
    ? candidate?.whatToBring?.pt ||
      (isTechManager
        ? [
            "Documento de identificação (BI / Passaporte)",
            "Caneta",
            "Lápis e borracha, se desejar",
            "Calculadora simples, opcional",
          ]
        : [
            "Documento de identificação original (BI / Passaporte)",
            "Caneta (azul ou preta)",
            "Chegar até às 09h30 (portão fecha às 09h50)",
          ])
    : candidate?.whatToBring?.en ||
      (isTechManager
        ? [
            "Identification document (ID / Passport)",
            "Pen",
            "Pencil and eraser, if desired",
            "Simple calculator, optional",
          ]
        : [
            "Original photo ID (BI / Passport)",
            "A pen (blue or black)",
            "Arrive by 09:30 (gate closes at 09:50)",
          ]);

  const supportEmail = candidate?.supportEmail || siteContact.email || "info@overwatchmoz.com";

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-28 sm:pt-36 pb-24 sm:pb-28">

        {/* ── LOADING STATE ─────────────────────────────────────── */}
        {loading ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center gap-5 text-center">
            <div className="relative">
              <div className="h-14 w-14 rounded-2xl bg-[#07080f] flex items-center justify-center">
                <RefreshCw className="animate-spin text-white/70" size={22} />
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {isPt ? "A carregar a sua convocatória…" : "Loading your invitation…"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {isPt ? "Aguarde um momento." : "Just a moment."}
              </p>
            </div>
          </div>

        /* ── DEACTIVATED LINK ────────────────────────────────────── */
        ) : isDeactivated ? (
          <div className="max-w-lg mx-auto py-8 space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-red-50 border border-red-100 mb-6">
                <ShieldOff size={36} className="text-red-400" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-3">
                {isPt ? "Link de agendamento desactivado" : "Booking link deactivated"}
              </h1>
              <p className="text-sm text-gray-500 leading-relaxed mb-2">
                {isPt
                  ? "Este link de convocatória foi desactivado pelo departamento de Recursos Humanos e não permite mais agendamentos."
                  : "This invitation link has been deactivated by the HR department and no longer allows bookings."}
              </p>
            </div>
            <ChatbotSupportHeadsUp isPt={isPt} supportEmail={supportEmail} />
          </div>

        /* ── NOT FOUND / ERROR ───────────────────────────────────── */
        ) : error && !candidate ? (
          <div className="max-w-lg mx-auto py-8 space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-amber-50 border border-amber-100 mb-6">
                <AlertCircle size={36} className="text-amber-400" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-3">
                {isPt ? "Convocatória não encontrada" : "Invitation not found"}
              </h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                {error ||
                  (isPt
                    ? "Não foi possível localizar esta convocatória. Verifique se o link está correcto ou entre em contacto connosco abaixo."
                    : "Could not locate this invitation. Please verify the link or contact us below.")}
              </p>
            </div>
            <ChatbotSupportHeadsUp isPt={isPt} supportEmail={supportEmail} />
          </div>

        /* ── MAIN CANDIDATE VIEW ─────────────────────────────────── */
        ) : candidate ? (
          <div className="space-y-5">

            {/* Identity header */}
            <div className="border border-gray-100 rounded-2xl bg-white shadow-sm overflow-hidden">
              <div className="bg-[#07080f] px-6 py-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-white/40 mb-1">
                      {candidate.rebookingGraceActive
                        ? isPt ? "Período de Graça · Reagendamento Excepcional" : "Grace Period · Exceptional Rebooking"
                        : isAlreadyBooked
                          ? isPt ? "Presença confirmada" : "Attendance confirmed"
                          : isPt ? "Convocatória oficial" : "Official convocation"}
                    </p>
                    <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">
                      {candidate.name}
                    </h1>
                    <p className="text-xs text-emerald-400 font-medium mt-1">
                      {roleTitleText}
                    </p>
                  </div>
                  {candidate.rebookingGraceActive ? (
                    <div className="shrink-0 h-10 w-10 rounded-full bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
                      <RotateCcw size={18} />
                    </div>
                  ) : isAlreadyBooked ? (
                    <div className="shrink-0 h-10 w-10 rounded-full bg-emerald-400/20 border border-emerald-400/30 flex items-center justify-center">
                      <CheckCircle2 size={20} className="text-emerald-400" />
                    </div>
                  ) : (
                    <span className="shrink-0 text-[0.65rem] font-mono font-medium text-white/35 border border-white/15 rounded-lg px-2 py-1 mt-1">
                      {referenceCodeText}
                    </span>
                  )}
                </div>
              </div>
              <div className="px-6 py-4">
                <p className="text-sm text-gray-500 leading-relaxed">
                  {candidate.rebookingGraceActive
                    ? isPt
                      ? `Foi-lhe autorizada uma oportunidade final de reagendamento para a posição de ${roleTitleText}. Escolha a sua nova data entre os turnos disponíveis abaixo.`
                      : `You have been granted an exceptional rebooking opportunity for the ${roleTitleText} position. Choose your new date from the open slots below.`
                    : isAlreadyBooked
                      ? isPt
                        ? "A sua confirmação foi registada com sucesso. Abaixo encontram-se todos os detalhes e requisitos do seu teste presencial."
                        : "Your confirmation has been successfully registered. All details and requirements for your in-person test are shown below."
                      : isPt
                        ? `Foi seleccionado(a) para a fase de teste técnico presencial para a posição de ${roleTitleText}. Escolha a data e horário mais conveniente abaixo.`
                        : `You have been selected for the in-person technical assessment for the ${roleTitleText} position. Choose your preferred date and time below.`}
                </p>
              </div>
            </div>

            {/* ── ALREADY BOOKED VIEW ── */}
            {isAlreadyBooked ? (
              <div className="space-y-4">
                {/* Security Pass Card with QR Code */}
                <div className="rounded-2xl border-2 border-slate-900 bg-gradient-to-b from-[#0b1329] to-[#07090e] text-white p-6 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

                  {/* Header Badge */}
                  <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4 mb-5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <ShieldCheck size={18} />
                      </div>
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
                          {isPt ? "Passe Digital de Entrada" : "Digital Entrance Pass"}
                        </div>
                        <div className="text-xs text-slate-300 font-semibold tracking-wide">
                          Overwatch Moçambique · {roleTitleText}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-[10px] px-2.5 py-1 bg-white/10 border border-white/15 rounded-md text-white/80 font-bold uppercase">
                        REF: {candidate.id ? candidate.id.slice(0, 8).toUpperCase() : "PASS"}
                      </span>
                    </div>
                  </div>

                  {/* Attendance Status Banner */}
                  {candidate.attendedAt ? (
                    <div className="mb-5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 p-3.5 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
                        <CheckCircle2 size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-emerald-300 uppercase tracking-wide">
                          {isPt ? "Presença Confirmada no Portão" : "Gate Attendance Confirmed"}
                        </p>
                        <p className="text-[11px] text-emerald-200/80">
                          {isPt ? "Entrada registada em:" : "Checked in at:"} {new Date(candidate.attendedAt).toLocaleTimeString("pt-MZ", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Maputo" })} (Maputo)
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-5 rounded-xl bg-white/5 border border-white/10 p-3 flex items-center gap-2.5 text-xs text-slate-300">
                      <QrCode size={16} className="text-amber-400 shrink-0" />
                      <span>
                        {isPt
                          ? "Apresente este código na portaria ao chegar para registar a sua presença."
                          : "Present this QR code at the reception gate upon arrival to register attendance."}
                      </span>
                    </div>
                  )}

                  {/* QR Code Graphic Box */}
                  <div className="bg-white rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-inner mx-auto max-w-[260px]">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="QR Code Check-in"
                        className="w-48 h-48 object-contain"
                      />
                    ) : (
                      <div className="w-48 h-48 flex items-center justify-center text-gray-400">
                        <QrCode size={48} />
                      </div>
                    )}
                    <div className="mt-2 text-center">
                      <p className="text-xs font-bold text-gray-900 leading-tight">
                        {candidate.name}
                      </p>
                      <p className="text-[11px] font-mono text-emerald-700 font-bold mt-0.5">
                        {candidate.testSlot}
                      </p>
                    </div>
                  </div>

                  {/* Pass actions: Download & Print */}
                  <div className="mt-5 flex items-center justify-center gap-3">
                    {qrDataUrl && (
                      <a
                        href={qrDataUrl}
                        download={`Overwatch-Passe-${candidate.name.replace(/\s+/g, "_")}.png`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-white transition-colors"
                      >
                        <Download size={13} />
                        <span>{isPt ? "Guardar Imagem" : "Save Image"}</span>
                      </a>
                    )}
                    <button
                      onClick={() => window.print()}
                      type="button"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors shadow"
                    >
                      <Printer size={13} />
                      <span>{isPt ? "Imprimir Passe" : "Print Pass"}</span>
                    </button>
                  </div>
                </div>

                {/* Main confirmed slot card */}
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-3.5 border-b border-emerald-200 bg-emerald-100/60">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                      {isPt ? "Teste agendado e confirmado" : "Test booked & confirmed"}
                    </span>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-emerald-600 mb-1">
                        {isPt ? "Data & hora" : "Date & time"}
                      </p>
                      <p className="text-lg font-bold text-gray-900">
                        {formatSlotDisplay(candidate.testSlot || "", isPt)}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {durationText}
                      </p>
                    </div>

                    <div className="h-px bg-emerald-200" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-emerald-600 mb-1.5">
                          {isPt ? "Local" : "Venue"}
                        </p>
                        <p className="text-sm font-semibold text-gray-900">Overwatch Moçambique</p>
                        <p className="text-xs text-gray-600 mt-0.5 leading-snug">{siteContact.address.pt}</p>
                        <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                          {venueLandmarkText}
                        </p>
                      </div>
                      <div>
                        <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-emerald-600 mb-1.5">
                          {isPt ? "O que trazer" : "What to bring"}
                        </p>
                        <ul className="space-y-1.5 text-xs text-gray-700">
                          {whatToBringItems.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <Check size={12} className="text-emerald-600 mt-0.5 shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Single-use notice */}
                <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-xs">
                  <Lock size={14} className="text-gray-400 shrink-0 mt-0.5" />
                  <p className="text-gray-500 leading-relaxed">
                    {isPt
                      ? "Este link só pode ser utilizado uma vez. A data escolhida está confirmada e não pode ser alterada. A sua vaga está garantida."
                      : "This link is single-use only. Your chosen date is confirmed and cannot be changed. Your slot is secured."}
                  </p>
                </div>

                {/* Chatbot & Email Support Heads-Up + Dynamic Curved Arrow */}
                <ChatbotSupportHeadsUp isPt={isPt} supportEmail={supportEmail} />
              </div>

            /* ── YET TO BOOK VIEW ── */
            ) : (
              <div className="space-y-4">
                {/* Rebooking Grace Notice Banner */}
                {candidate.rebookingGraceActive && (
                  <div className="rounded-2xl border-2 border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/40 p-5 text-emerald-950 dark:text-emerald-100 shadow-md">
                    <div className="flex items-start gap-3.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        <RotateCcw size={18} />
                      </div>
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-900 dark:text-emerald-200">
                            {isPt ? "Período de Graça · Reagendamento Autorizado" : "Grace Period · Rebooking Authorized"}
                          </span>
                          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-200/80 dark:bg-emerald-500/20 border border-emerald-400 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200 font-bold uppercase">
                            {isPt ? "Link de Uso Único (OTL)" : "Single-Use Link (OTL)"}
                          </span>
                        </div>
                        <p className="text-xs text-emerald-950 dark:text-emerald-100 font-medium leading-relaxed">
                          {isPt
                            ? "Em virtude de constrangimentos na localização ou deslocação para a sua data anterior, a Direcção de RH concedeu autorização para escolher uma nova data entre os turnos ainda disponíveis. Uma vez confirmada a escolha, este link é invalidado e o agendamento torna-se definitivo."
                            : "Due to location or transport constraints on your previous date, HR has authorized you to pick a new test date among the remaining open sessions. Once confirmed, this link is consumed and your booking is final."}
                        </p>
                        {candidate.previousTestSlot && (
                          <div className="text-[11px] text-emerald-900/80 dark:text-emerald-200/80 pt-1 flex items-center gap-1.5 font-medium">
                            <span>{isPt ? "Data anterior não comparecida:" : "Previously missed date:"}</span>
                            <span className="line-through font-mono font-bold text-emerald-800 dark:text-emerald-300">{candidate.previousTestSlot}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Gate Pass Generation Notice */}
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3.5 flex items-start gap-3">
                  <QrCode size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-emerald-900 mb-0.5 uppercase tracking-wide">
                      {isPt ? "Passe Oficial com Código QR na Portaria" : "Official QR Code Gate Pass"}
                    </p>
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      {isPt
                        ? "Assim que seleccionar e confirmar a sua data de teste, o seu Passe Digital exclusivo com Código QR será gerado imediatamente nesta página. Poderá guardá-lo ou descarregar a imagem para o seu telemóvel para apresentar obrigatoriamente na portaria da Overwatch."
                        : "As soon as you confirm your test date, your exclusive Digital Gate Pass with QR Code will be immediately generated on this page. You can save or download the image to your phone to present at the entrance gate."}
                    </p>
                  </div>
                </div>

                {/* Role-specific What to Bring & Venue Preview */}
                <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[0.68rem] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                      {isPt ? "Local do Teste" : "Test Venue"}
                    </p>
                    <p className="text-xs font-bold text-gray-900">Overwatch Moçambique</p>
                    <p className="text-xs text-gray-600 mt-0.5 leading-snug">{siteContact.address.pt}</p>
                    <p className="text-[11px] text-gray-500 mt-1 leading-snug">{venueLandmarkText}</p>
                  </div>
                  <div>
                    <p className="text-[0.68rem] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                      {isPt ? "O que trazer" : "What to bring"}
                    </p>
                    <ul className="space-y-1 text-xs text-gray-700">
                      {whatToBringItems.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <Check size={12} className="text-emerald-600 mt-0.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Single-use warning */}
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 flex items-start gap-3">
                  <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-amber-800 mb-0.5">
                      {isPt ? "Agendamento único e definitivo" : "Single-use & final booking"}
                    </p>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      {isPt
                        ? "Só pode escolher uma data. Uma vez confirmada, a escolha é definitiva e não pode ser alterada. Verifique a sua disponibilidade antes de confirmar."
                        : "You can only choose one date. Once confirmed, the booking is final and cannot be changed. Please verify your availability before confirming."}
                    </p>
                  </div>
                </div>

                {/* Capacity notice */}
                {candidate?.windowFilledNotice && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3.5 flex items-start gap-3">
                    <AlertCircle size={16} className="text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-blue-800 mb-0.5">
                        {isPt ? "Turnos de Avaliação Presenciais" : "In-Person Assessment Sessions"}
                      </p>
                      <p className="text-xs text-blue-700 leading-relaxed">
                        {isPt
                          ? "Consulte os turnos de avaliação presenciais abertos e reserve a sua data entre as opções disponíveis abaixo."
                          : "Review the open evaluation sessions and reserve your date from the available slots below."}
                      </p>
                    </div>
                  </div>
                )}

                {/* Slot selection */}
                <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <Calendar size={16} className="text-gray-400" />
                      <span>{isPt ? "Seleccione a sua data" : "Select your date"}</span>
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {isPt
                        ? "Turnos presenciais com vagas limitadas. Seleccione um horário disponível abaixo."
                        : "In-person test sessions with limited capacity. Select an open slot below."}
                    </p>
                  </div>

                  <div className="p-4 space-y-2">
                    {slotsList.length === 0 && (
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center text-xs text-gray-500">
                        {isPt
                          ? "Nenhum turno disponível de momento. Por favor aguarde pela actualização de horários."
                          : "No test slots are currently open. Please check back shortly."}
                      </div>
                    )}
                    {slotsList.map((slot) => {
                      const isSelected = selectedSlot === slot;
                      const stat = candidate?.slotStats?.[slot];
                      const isPast = Boolean(stat?.isPast) || isPastDateSlot(slot);
                      const isFull = Boolean(stat?.isFull) || isPast;
                      const remaining = stat ? Math.max(0, stat.remaining) : undefined;

                      if (isFull) {
                        return (
                          <div
                            key={slot}
                            aria-disabled="true"
                            className="w-full text-left rounded-xl border border-gray-200/90 bg-gray-50/90 px-4 py-3.5 flex items-center justify-between gap-3 opacity-55 cursor-not-allowed select-none pointer-events-none"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-4 w-4 rounded-full border-2 border-gray-300 bg-gray-200/80 flex items-center justify-center shrink-0">
                                <Lock size={8} className="text-gray-500" strokeWidth={2.5} />
                              </div>

                              <div>
                                <p className="text-sm font-semibold text-gray-500 line-through">
                                  {formatSlotDisplay(slot, isPt)}
                                </p>
                                <p className="text-xs mt-0.5 text-gray-400">
                                  {isPast
                                    ? (isPt ? "Sessão encerrada · Data passada" : "Session concluded · Past date")
                                    : (isPt ? "Vagas esgotadas · Não disponível" : "No spots available · Full")}
                                </p>
                              </div>
                            </div>

                            <span className={`flex items-center gap-1 text-[0.65rem] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                              isPast
                                ? "text-gray-600 bg-gray-200/80 border border-gray-300"
                                : "text-red-600 bg-red-100/90 border border-red-200"
                            }`}>
                              <Lock size={9} />
                              <span>{isPast ? (isPt ? "Encerrado" : "Concluded") : (isPt ? "Esgotado" : "Full")}</span>
                            </span>
                          </div>
                        );
                      }

                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`w-full text-left rounded-xl border px-4 py-3.5 transition-all flex items-center justify-between gap-3 cursor-pointer ${
                            isSelected
                              ? "border-[#07080f] bg-[#07080f] shadow-md ring-1 ring-[#07080f]"
                              : "border-gray-200 bg-white hover:border-gray-400 hover:shadow-sm"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? "border-white bg-white"
                                : "border-gray-300 bg-white"
                            }`}>
                              {isSelected ? (
                                <div className="h-2 w-2 rounded-full bg-[#07080f]" />
                              ) : null}
                            </div>

                            <div>
                              <p className={`text-sm font-semibold ${
                                isSelected ? "text-white" : "text-gray-900"
                              }`}>
                                {formatSlotDisplay(slot, isPt)}
                              </p>
                              <p className={`text-xs mt-0.5 ${
                                isSelected ? "text-white/60" : "text-gray-400"
                              }`}>
                                {durationText} · Maputo
                              </p>
                            </div>
                          </div>

                          {isSelected ? (
                            <span className="flex items-center gap-1 text-[0.65rem] font-semibold text-white/90 bg-white/15 border border-white/25 px-2.5 py-0.5 rounded-full shrink-0">
                              <Check size={9} />
                              <span>{isPt ? "Selecionada" : "Selected"}</span>
                            </span>
                          ) : remaining !== undefined && remaining <= 3 ? (
                            <span className="text-[0.65rem] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                              {isPt ? `Só ${remaining} vaga${remaining !== 1 ? "s" : ""}` : `Only ${remaining} left`}
                            </span>
                          ) : remaining !== undefined ? (
                            <span className="text-[0.65rem] text-gray-500 font-medium shrink-0">
                              {isPt ? `${remaining} vagas abertas` : `${remaining} spots left`}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="mx-4 mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-xs text-red-700">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Submit */}
                  <div className="px-4 pb-5 pt-2 space-y-3">
                    <button
                      type="button"
                      onClick={handleConfirmSlot}
                      disabled={submitting || !selectedSlot || Boolean(candidate?.slotStats?.[selectedSlot]?.isFull)}
                      className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-[#07080f] text-white text-sm font-bold py-3.5 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer"
                    >
                      {submitting ? (
                        <>
                          <RefreshCw className="animate-spin" size={15} />
                          <span>{isPt ? "A confirmar…" : "Confirming…"}</span>
                        </>
                      ) : (
                        <>
                          <span>{isPt ? "Confirmar data definitiva" : "Confirm my test date"}</span>
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                    <p className="text-center text-[0.68rem] text-gray-400">
                      {isPt
                        ? "🔒 Ao confirmar, a sua escolha fica gravada de forma permanente e não pode ser alterada."
                        : "🔒 By confirming, your choice is permanently recorded and cannot be changed."}
                    </p>
                  </div>
                </div>

                {/* Chatbot & Email Support Heads-Up + Dynamic Curved Arrow */}
                <ChatbotSupportHeadsUp isPt={isPt} supportEmail={supportEmail} />
              </div>
            )}

            {/* Footer info bar */}
            <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-gray-700">Overwatch Moçambique, Lda.</p>
                <p className="text-xs text-gray-400 mt-0.5">{siteContact.address.pt}</p>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={`mailto:${supportEmail}`}
                  className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors font-medium"
                >
                  <Mail size={12} />
                  <span>{supportEmail}</span>
                </a>
              </div>
            </div>

          </div>
        ) : null}
      </div>

      {/* Non-obstructive dynamic floating pointer above the bottom-right Chatbot icon */}
      {!dismissFloatingArrow && (
        <div className="fixed bottom-[86px] right-4 sm:right-6 z-40 pointer-events-none hidden sm:flex flex-col items-end">
          <div className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-[#07080f]/95 text-white border border-white/15 px-3.5 py-2 shadow-xl backdrop-blur-md">
            <button
              type="button"
              onClick={() => openOverwatchChatbot()}
              className="flex items-center gap-2 text-left text-[11px] font-medium leading-snug hover:text-emerald-300 transition-colors cursor-pointer"
            >
              <MessageSquare size={13} className="text-emerald-400 shrink-0" />
              <span>
                {isPt ? (
                  <>
                    Dúvidas? Abra o <strong className="text-emerald-400">Chatbot</strong> e escolha{" "}
                    <strong className="underline decoration-emerald-400/60">«Falar com um agente»</strong>
                  </>
                ) : (
                  <>
                    Need help? Open the <strong className="text-emerald-400">Chatbot</strong> &amp; choose{" "}
                    <strong className="underline decoration-emerald-400/60">&ldquo;Speak with an agent&rdquo;</strong>
                  </>
                )}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setDismissFloatingArrow(true)}
              aria-label={isPt ? "Fechar dica" : "Dismiss hint"}
              className="ml-1 rounded-full p-0.5 text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={12} />
            </button>
          </div>
          <svg
            width="54"
            height="36"
            viewBox="0 0 54 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="mr-3 -mt-0.5 text-emerald-500 drop-shadow-sm"
            aria-hidden="true"
          >
            <path
              d="M 8 2 C 24 6, 36 14, 40 31"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeDasharray="4 3"
            />
            <path
              d="M 33 26 L 41 33 L 45 23"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
