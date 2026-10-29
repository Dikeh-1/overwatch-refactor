"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Check,
  RefreshCw,
  Lock,
  ShieldOff,
  Printer,
  ShieldCheck,
  RotateCcw,
  MessageSquare,
  Mail,
  MapPin,
  Clock,
  Briefcase,
  User,
  FileText,
  X,
} from "lucide-react";
import { siteContact } from "@/lib/site-config";
import {
  formatSlotDisplay,
  formatCandidateName,
  isPastDateSlot,
  isSlotBookingExpired,
} from "@/lib/careers";
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
  isNextPhase?: boolean;
  nextPhaseToken?: string;
  supportEmail?: string;
};

function ChatbotSupportSection({
  isPt,
  supportEmail = "info@overwatchmoz.com",
}: {
  isPt: boolean;
  supportEmail?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#0b1329] text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
            <MessageSquare size={18} />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-slate-900">
              {isPt
                ? "Dúvidas ou Dificuldade no Agendamento?"
                : "Questions or need assistance with your booking?"}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
              {isPt ? (
                <>
                  A nossa equipa de Recursos Humanos está disponível para ajudar. Se encontrar qualquer
                  constrangimento, pode falar directamente com um assistente através do{" "}
                  <strong className="text-slate-900">Chatbot no website</strong> (opção{" "}
                  <em>«Falar com um agente»</em>) ou enviar email para{" "}
                  <a
                    href={`mailto:${supportEmail}`}
                    className="font-semibold text-slate-900 underline underline-offset-2 hover:text-slate-700"
                  >
                    {supportEmail}
                  </a>
                  .
                </>
              ) : (
                <>
                  Our HR team is here to assist. If you encounter any issues, please reach out via the{" "}
                  <strong className="text-slate-900">website chatbot</strong> (select{" "}
                  <em>&ldquo;Speak with an agent&rdquo;</em>) or email us at{" "}
                  <a
                    href={`mailto:${supportEmail}`}
                    className="font-semibold text-slate-900 underline underline-offset-2 hover:text-slate-700"
                  >
                    {supportEmail}
                  </a>
                  .
                </>
              )}
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => openOverwatchChatbot()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0b1329] hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 transition-colors shadow-xs cursor-pointer"
              >
                <MessageSquare size={14} />
                <span>
                  {isPt
                    ? "Abrir Chat de Apoio · Falar com Agente"
                    : "Open Support Chat · Speak with Agent"}
                </span>
              </button>
              <a
                href={`mailto:${supportEmail}?subject=${encodeURIComponent(
                  isPt ? "Apoio ao Agendamento de Teste — Overwatch" : "Test Booking Support — Overwatch",
                )}`}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold px-4 py-2.5 transition-colors"
              >
                <Mail size={14} className="text-slate-500" />
                <span>{supportEmail}</span>
              </a>
            </div>
          </div>
        </div>
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
  const cleanId = (id || "").trim().replace(/\/+$/, "").replace(/[\s.…]+$/, "");
  const activeLang: "pt" | "en" = locale === "en" ? "en" : "pt";
  const isPt = activeLang === "pt";

  const [candidate, setCandidate] = useState<CandidateData | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isDeactivated, setIsDeactivated] = useState(false);
  const [liveSlotTakenNotice, setLiveSlotTakenNotice] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function fetchCandidate(silent = false) {
      try {
        if (!silent) {
          setLoading(true);
          setError("");
        }
        const res = await fetch(
          `/api/careers/test-booking?id=${encodeURIComponent(cleanId)}&t=${Date.now()}`,
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
              if (currentSelected && data.slots.includes(currentSelected)) {
                if (!data.slotStats?.[currentSelected]?.isFull) {
                  return currentSelected;
                }
                if (silent) {
                  setLiveSlotTakenNotice(
                    isPt
                      ? `Actualização: O turno «${formatSlotDisplay(currentSelected, true)}» foi entretanto preenchido. Seleccionámos automaticamente a próxima vaga aberta.`
                      : `Live update: The slot "${formatSlotDisplay(currentSelected, false)}" was just filled. We selected the next available slot.`,
                  );
                }
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

    if (cleanId) {
      void fetchCandidate(false);
    } else {
      setError(isPt ? "Link de convocatória inválido." : "Invalid invitation link.");
      setLoading(false);
    }

    // 45s live polling with activity throttling to prevent Supabase egress quota exhaustion
    let lastFetchedTime = Date.now();
    const interval = setInterval(() => {
      if (cleanId && !cancelled && (typeof document === "undefined" || !document.hidden)) {
        lastFetchedTime = Date.now();
        void fetchCandidate(true);
      }
    }, 45000);
    const onFocus = () => {
      if (cleanId && !cancelled && Date.now() - lastFetchedTime > 20000) {
        lastFetchedTime = Date.now();
        void fetchCandidate(true);
      }
    };
    const onVisibility = () => {
      if (cleanId && !cancelled && typeof document !== "undefined" && !document.hidden && Date.now() - lastFetchedTime > 20000) {
        lastFetchedTime = Date.now();
        void fetchCandidate(true);
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        channel = new BroadcastChannel("overwatch_test_booking_live");
        channel.onmessage = () => {
          if (cleanId && !cancelled) void fetchCandidate(true);
        };
      }
    } catch {}

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      try {
        channel?.close();
      } catch {}
    };
  }, [cleanId, isPt]);

  async function handleConfirmSlot() {
    if (!selectedSlot) {
      setError(isPt ? "Por favor seleccione uma data disponível para o teste." : "Please select an available test slot.");
      return;
    }

    if (candidate?.slotStats?.[selectedSlot]?.isFull) {
      setError(
        isPt
          ? "As vagas para esta data já se encontram preenchidas. Por favor seleccione outra data disponível."
          : "This slot is full. Please choose another open session.",
      );
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      const res = await fetch("/api/careers/test-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cleanId, slot: selectedSlot }),
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
        if (res.status === 409 && data.code === "SLOT_FULL") {
          const refreshed = await fetch(
            `/api/careers/test-booking?id=${encodeURIComponent(id)}&t=${Date.now()}`,
            { cache: "no-store" },
          )
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null);
          if (refreshed) {
            setCandidate(refreshed);
            const nextOpen = (refreshed.slots || []).find(
              (s: string) => !refreshed.slotStats?.[s]?.isFull,
            );
            setSelectedSlot(nextOpen || "");
          }
        }
        throw new Error(
          data.error || (isPt ? "Ocorreu um erro ao confirmar a data." : "Failed to confirm test slot."),
        );
      }

      try {
        if (typeof BroadcastChannel !== "undefined") {
          const bc = new BroadcastChannel("overwatch_test_booking_live");
          bc.postMessage({ slot: selectedSlot, ts: Date.now() });
          bc.close();
        }
      } catch {}

      setCandidate((prev) =>
        prev
          ? { ...prev, testSlot: selectedSlot, testBookedAt: data.testBookedAt || new Date().toISOString() }
          : null,
      );
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
    ? candidate?.roleTitle?.pt || (isTechManager ? "Gestor Técnico e Instalação de CCTV" : "Operadora de Centro de Controlo (CCO)")
    : candidate?.roleTitle?.en || (isTechManager ? "CCTV Installation & Technical Manager" : "CCTV Control Centre Operator");

  const referenceCodeText =
    candidate?.referenceCode || (isTechManager ? "TM-2026/MZQ" : "CCO-2026/MZQ");

  const formattedCandidateName = formatCandidateName(candidate?.name);

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
            "Documento de identificação válido com fotografia (BI ou Passaporte original)",
            "Caneta de tinta azul ou preta",
            "Lápis e borracha para cálculos ou apontamentos, se desejar",
            "Calculadora científica ou simples (opcional)",
          ]
        : [
            "Documento de identificação original com fotografia (BI / Passaporte)",
            "Caneta de tinta azul ou preta",
            "Chegada até às 09h30 (o portão de acesso fecha às 09h50)",
          ])
    : candidate?.whatToBring?.en ||
      (isTechManager
        ? [
            "Valid photo identification (original ID / Passport)",
            "Blue or black ballpoint pen",
            "Pencil and eraser for notes/drawings, if desired",
            "Simple or scientific calculator (optional)",
          ]
        : [
            "Original valid photo ID (National ID / Passport)",
            "Blue or black pen",
            "Arrive by 09:30 (access gate closes promptly at 09:50)",
          ]);

  const supportEmail = candidate?.supportEmail || siteContact.email || "info@overwatchmoz.com";
  const refDisplay = candidate?.id ? candidate.id.slice(0, 8).toUpperCase() : "CONF";

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans selection:bg-[#0b1329] selection:text-white">
      {/* ── PRINT MEDIA CSS (Clean single-page voucher export) ── */}
      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #0f172a !important;
          }
          header,
          footer,
          .no-print {
            display: none !important;
          }
          .print-container {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-slip {
            border: 1px solid #cbd5e1 !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #0f172a !important;
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* ── TOP CORPORATE HEADER ── */}
      <header className="border-b border-slate-800/80 bg-[#0b1329] text-white sticky top-0 z-40 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <Image
              src="/logo-white.png"
              alt="Overwatch Moçambique"
              width={130}
              height={22}
              className="h-5 sm:h-5.5 w-auto object-contain"
              priority
            />
            <span className="hidden sm:inline-block h-4 w-px bg-white/20" />
            <span className="hidden sm:inline-block text-xs font-semibold tracking-wide text-slate-300">
              {isPt ? "Portal de Recrutamento & Selecção" : "Recruitment & Selection Portal"}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {candidate && (
              <span className="font-mono text-[11px] font-bold px-2.5 py-1 rounded-md bg-white/10 border border-white/15 text-slate-200">
                REF: #{refDisplay}
              </span>
            )}
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              {isAlreadyBooked
                ? isPt ? "Confirmado" : "Confirmed"
                : isPt ? "Convocatória" : "Invited"}
            </span>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT WORKSPACE ── */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6 print-container">

        {/* ── LOADING STATE ─────────────────────────────────────── */}
        {loading ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#0b1329] text-white flex items-center justify-center shadow-md">
              <RefreshCw className="animate-spin text-white/80" size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                {isPt ? "A carregar dados da convocatória…" : "Loading invitation details…"}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Overwatch Moçambique · {isPt ? "Aguarde um momento" : "Please hold on"}
              </p>
            </div>
          </div>

        /* ── DEACTIVATED LINK ────────────────────────────────────── */
        ) : isDeactivated ? (
          <div className="py-8 space-y-6 max-w-xl mx-auto">
            <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-xs">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-red-50 border border-red-100 text-red-600 mb-4">
                <ShieldOff size={28} />
              </div>
              <h1 className="text-lg font-bold text-slate-900 mb-2">
                {isPt ? "Link de Agendamento Desactivado" : "Booking Link Deactivated"}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {isPt
                  ? "Este link de convocatória foi encerrado ou substituído pelo departamento de Recursos Humanos e já não se encontra activo."
                  : "This invitation link was closed or updated by the Human Resources department and is no longer active."}
              </p>
            </div>
            <ChatbotSupportSection isPt={isPt} supportEmail={supportEmail} />
          </div>

        /* ── NOT FOUND / ERROR ───────────────────────────────────── */
        ) : error && !candidate ? (
          <div className="py-8 space-y-6 max-w-xl mx-auto">
            <div className="rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-xs">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 mb-4">
                <AlertCircle size={28} />
              </div>
              <h1 className="text-lg font-bold text-slate-900 mb-2">
                {isPt ? "Convocatória Não Localizada" : "Invitation Not Found"}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                {error ||
                  (isPt
                    ? "Não foi possível localizar o registo desta convocatória. Por favor confirme o link recebido ou contacte a nossa equipa."
                    : "Unable to find this invitation record. Please verify the URL or contact our team.")}
              </p>
            </div>
            <ChatbotSupportSection isPt={isPt} supportEmail={supportEmail} />
          </div>

        /* ── CANDIDATE WORKSPACE ─────────────────────────────────── */
        ) : candidate ? (
          <div className="space-y-6">

            {/* Next Phase notification badge (if advanced) */}
            {candidate.isNextPhase && (
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50/90 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 no-print">
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-emerald-950">
                      {isPt ? "Aprovado(a) para a Próxima Fase do Processo!" : "Advanced to Next Phase!"}
                    </h2>
                    <p className="text-xs text-emerald-800 leading-relaxed mt-0.5">
                      {isPt
                        ? "Concluiu a avaliação presencial e foi apurado(a) para a fase subsequente. Clique para aceder ao portal da Próxima Fase."
                        : "You completed the in-person assessment and qualified for the next phase. Click to access your Next Phase portal."}
                    </p>
                  </div>
                </div>
                <a
                  href={`/${locale}/careers/next-phase/${encodeURIComponent(candidate.nextPhaseToken || candidate.id)}`}
                  className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0b1329] hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-xs"
                >
                  <span>{isPt ? "Aceder à Próxima Fase →" : "Access Next Phase →"}</span>
                </a>
              </div>
            )}

            {/* ── CANDIDATE HERO BANNER ── */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
                <div>
                  <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 font-mono">
                    <ShieldCheck size={14} className="text-[#0b1329]" />
                    <span>
                      {candidate.rebookingGraceActive
                        ? isPt ? "Reagendamento Excepcional Autorizado" : "Exceptional Rebooking Authorized"
                        : isAlreadyBooked
                          ? isPt ? "Presença Confirmada" : "Attendance Confirmed"
                          : isPt ? "Convocatória Oficial para Teste Presencial" : "Official In-Person Test Convocation"}
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {formattedCandidateName}
                  </h1>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1.5 shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 border border-slate-200/80 text-xs font-semibold text-slate-800">
                    <Briefcase size={13} className="text-slate-500" />
                    <span>{roleTitleText}</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Código: #{referenceCodeText}
                  </span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {candidate.rebookingGraceActive
                  ? isPt
                    ? `A Direcção de Recursos Humanos autorizou uma oportunidade excepcional de reagendamento para a função de ${roleTitleText}. Por favor seleccione a sua nova data entre os turnos disponíveis abaixo.`
                    : `The HR Directorate has authorized an exceptional rebooking window for the ${roleTitleText} position. Please select your new session below.`
                  : isAlreadyBooked
                    ? isPt
                      ? "A sua vaga para a avaliação presencial encontra-se registada e garantida. Guarde ou imprima o Comprovativo Oficial abaixo com todas as indicações de comparência e acesso às instalações."
                      : "Your in-person assessment session is confirmed and reserved. Please save or print your Official Confirmation Slip below with venue and check-in instructions."
                    : isPt
                      ? `Foi seleccionado(a) para a prova de avaliação técnica presencial da Overwatch Moçambique para a função de ${roleTitleText}. Seleccione o dia e horário mais conveniente entre as sessões abertas.`
                      : `You have been selected for the Overwatch Mozambique in-person technical evaluation for the ${roleTitleText} role. Please select your preferred session from the open slots below.`}
              </p>
            </div>

            {/* ══════════════════════════════════════════════════════════
                STATE A: ALREADY BOOKED — SINGLE EXECUTIVE OFFICIAL VOUCHER
                (Unified human-grade slip: NO duplicates, NO neon blobs)
                ══════════════════════════════════════════════════════════ */}
            {isAlreadyBooked ? (
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-300/90 bg-white text-slate-900 shadow-sm overflow-hidden print-slip">
                  {/* Voucher Header Band */}
                  <div className="bg-[#0b1329] text-white px-6 sm:px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-emerald-400 shrink-0">
                        <ShieldCheck size={22} />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold block">
                          {isPt ? "Documento Oficial de Convocatória" : "Official Convocation Slip"}
                        </span>
                        <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                          {isPt ? "Comprovativo de Agendamento Presencial" : "In-Person Assessment Slip"}
                        </h2>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto no-print">
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white text-[#0b1329] hover:bg-slate-100 text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        <Printer size={14} />
                        <span>{isPt ? "Imprimir / Guardar PDF" : "Print / Save PDF"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Attendance Check-in Banner if already arrived at gate */}
                  {candidate.attendedAt ? (
                    <div className="mx-6 sm:mx-8 mt-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                          {isPt ? "Presença Validada na Recepção" : "Attendance Verified at Reception"}
                        </p>
                        <p className="text-xs text-emerald-700">
                          {isPt ? "Check-in registado às" : "Checked in at"}{" "}
                          {new Date(candidate.attendedAt).toLocaleTimeString("pt-MZ", {
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "Africa/Maputo",
                          })}{" "}
                          (Hora de Maputo)
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {/* Main Voucher Body Grid */}
                  <div className="p-6 sm:p-8 space-y-6">

                    {/* Candidate & Role Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-6 border-b border-slate-200">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold block mb-1">
                          {isPt ? "Candidato(a) Convocado(a)" : "Candidate Name"}
                        </span>
                        <p className="text-base font-bold text-slate-900">
                          {formattedCandidateName}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold block mb-1">
                          {isPt ? "Posição Convocada" : "Position"}
                        </span>
                        <p className="text-sm font-semibold text-slate-800">
                          {roleTitleText}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold block mb-1">
                          {isPt ? "Código de Referência" : "Reference ID"}
                        </span>
                        <p className="text-sm font-mono font-bold text-slate-800">
                          #{refDisplay}
                        </p>
                      </div>
                    </div>

                    {/* Highlighted Session Date & Time Box */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 space-y-2">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Calendar size={18} className="text-[#0b1329]" />
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                            {isPt ? "Sessão Agendada & Confirmada" : "Confirmed Test Session"}
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                          <Check size={11} />
                          <span>{isPt ? "Vaga Garantida" : "Slot Secured"}</span>
                        </span>
                      </div>

                      <p className="text-lg sm:text-xl font-extrabold text-slate-900 pt-1">
                        {formatSlotDisplay(candidate.testSlot || "", isPt)}
                      </p>
                      <p className="text-xs text-slate-600 flex items-center gap-1.5">
                        <Clock size={13} className="text-slate-400" />
                        <span>{durationText}</span>
                      </p>
                    </div>

                    {/* Venue & Access Instructions (2 Columns) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
                      {/* Venue Column */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wide">
                          <MapPin size={15} className="text-[#0b1329]" />
                          <span>{isPt ? "Local de Realização" : "Test Venue"}</span>
                        </div>
                        <div className="rounded-xl border border-slate-200 p-4 bg-white space-y-1.5 text-xs">
                          <p className="font-bold text-slate-900">Overwatch Moçambique</p>
                          <p className="text-slate-700 leading-snug">{siteContact.address.pt}</p>
                          <p className="text-slate-500 text-[11px] pt-1 border-t border-slate-100 leading-snug">
                            {venueLandmarkText}
                          </p>
                        </div>
                      </div>

                      {/* What to bring Column */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wide">
                          <FileText size={15} className="text-[#0b1329]" />
                          <span>{isPt ? "Material Obrigatório" : "Requirements"}</span>
                        </div>
                        <div className="rounded-xl border border-slate-200 p-4 bg-white space-y-2 text-xs">
                          <ul className="space-y-1.5">
                            {whatToBringItems.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-slate-700 leading-snug">
                                <Check size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Security Entrance Notice */}
                    <div className="rounded-xl border border-slate-200/90 bg-slate-50 p-4 text-xs text-slate-700 flex items-start gap-3">
                      <ShieldCheck size={18} className="text-[#0b1329] shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold text-slate-900">
                          {isPt ? "Instruções de Acesso na Recepção:" : "Reception Check-In Protocol:"}
                        </p>
                        <p className="text-slate-600 leading-relaxed">
                          {isPt
                            ? "A entrada nas instalações é autorizada mediante apresentação de um Documento de Identificação oficial com fotografia válido (BI ou Passaporte original) e conferência do seu nome na lista da recepção. Não é necessário apresentar código QR."
                            : "Entry is granted upon presenting a valid photo identification document (original ID Card or Passport) and verifying your name on the reception roster. No QR code is required."}
                        </p>
                      </div>
                    </div>

                    {/* Printable Footer / Metadata */}
                    <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
                      <span>
                        {isPt ? "Emissão Oficial" : "Official Record"} · Overwatch Moçambique, Lda.
                      </span>
                      <span className="font-mono">
                        {isPt ? "Registo Único" : "Single Record"}: #{refDisplay}
                      </span>
                    </div>

                  </div>
                </div>

                {/* Single-use note */}
                <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-xs no-print">
                  <Lock size={14} className="text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-slate-500 leading-relaxed">
                    {isPt
                      ? "Este agendamento é pessoal e intransmissível. A sua vaga encontra-se confirmada e não requer nova acção. Em caso de força maior, contacte-nos pelo canal de apoio abaixo."
                      : "This booking is personal and confirmed. In case of unexpected constraints, please contact our support team below."}
                  </p>
                </div>

                {/* Support Section */}
                <div className="no-print">
                  <ChatbotSupportSection isPt={isPt} supportEmail={supportEmail} />
                </div>
              </div>

            /* ══════════════════════════════════════════════════════════
                STATE B: YET TO BOOK — CLEAN SLOT SELECTION INTERFACE
                ══════════════════════════════════════════════════════════ */
            ) : (
              <div className="space-y-6">

                {/* Grace period banner if applicable */}
                {candidate.rebookingGraceActive && (
                  <div className="rounded-2xl border border-emerald-300 bg-emerald-50/90 p-5 text-emerald-950 shadow-xs">
                    <div className="flex items-start gap-3.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                        <RotateCcw size={18} />
                      </div>
                      <div className="space-y-1 flex-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 block">
                          {isPt ? "Período de Graça Autorizado" : "Grace Period Authorized"}
                        </span>
                        <p className="text-xs text-emerald-800 leading-relaxed">
                          {isPt
                            ? "A Direcção de RH autorizou a remarcação da sua data de teste presencial. Seleccione uma nova sessão entre as vagas disponíveis abaixo. Ao confirmar, o novo agendamento torna-se definitivo."
                            : "HR has authorized you to reschedule your in-person test session. Choose an available slot below. Once confirmed, this booking is final."}
                        </p>
                        {candidate.previousTestSlot && (
                          <p className="text-[11px] text-emerald-700 pt-1 font-mono">
                            {isPt ? "Turno anterior:" : "Previous slot:"}{" "}
                            <span className="line-through">{candidate.previousTestSlot}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Venue preview & What to bring card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 font-mono">
                    {isPt ? "Informações & Requisitos do Teste" : "Test Information & Requirements"}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1.5 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="font-bold text-slate-900 flex items-center gap-1.5">
                        <MapPin size={14} className="text-[#0b1329]" />
                        <span>{isPt ? "Local das Provas" : "Test Venue"}</span>
                      </p>
                      <p className="font-semibold text-slate-800">Overwatch Moçambique</p>
                      <p className="text-slate-600 leading-snug">{siteContact.address.pt}</p>
                      <p className="text-[11px] text-slate-500 leading-snug pt-1">
                        {venueLandmarkText}
                      </p>
                    </div>

                    <div className="space-y-1.5 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="font-bold text-slate-900 flex items-center gap-1.5">
                        <FileText size={14} className="text-[#0b1329]" />
                        <span>{isPt ? "O Que Trazer" : "What to Bring"}</span>
                      </p>
                      <ul className="space-y-1 text-slate-700 leading-snug">
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

                {/* Slot Selection Card */}
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Calendar size={16} className="text-[#0b1329]" />
                        <span>{isPt ? "Seleccione a Sessão Pretendida" : "Select Your Session"}</span>
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {isPt
                          ? "Vagas limitadas por turma presencial. Escolha o seu horário."
                          : "Limited capacity per in-person session. Pick your slot."}
                      </p>
                    </div>
                  </div>

                  {liveSlotTakenNotice && (
                    <div className="mx-6 mt-4 flex items-start justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                      <div className="flex items-start gap-2">
                        <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-600" />
                        <span>{liveSlotTakenNotice}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLiveSlotTakenNotice("")}
                        className="text-amber-700 hover:text-amber-950 p-0.5 cursor-pointer"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  )}

                  <div className="p-5 sm:p-6 space-y-2.5">
                    {slotsList.length === 0 && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                        {isPt
                          ? "Nenhum turno disponível de momento. Por favor aguarde pela publicação de novos horários."
                          : "No test slots are currently open. Please check back shortly."}
                      </div>
                    )}

                    {slotsList.map((slot) => {
                      const isSelected = selectedSlot === slot;
                      const stat = candidate?.slotStats?.[slot];
                      const isBookingExpired = isSlotBookingExpired(slot);
                      const isPast = Boolean(stat?.isPast) || isPastDateSlot(slot) || isBookingExpired;
                      const isFull = Boolean(stat?.isFull) || isPast;
                      const remaining = stat ? Math.max(0, stat.remaining) : undefined;

                      if (isFull) {
                        return (
                          <div
                            key={slot}
                            aria-disabled="true"
                            className="w-full text-left rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 flex items-center justify-between gap-3 opacity-60 cursor-not-allowed select-none"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-4 w-4 rounded-full border border-slate-300 bg-slate-200 flex items-center justify-center shrink-0">
                                <Lock size={9} className="text-slate-500" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-500 line-through">
                                  {formatSlotDisplay(slot, isPt)}
                                </p>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  {isBookingExpired
                                    ? (isPt ? "Inscrições encerradas às 23h59 da véspera" : "Bookings closed at 11:59 PM day prior")
                                    : isPast
                                      ? (isPt ? "Sessão já realizada" : "Session concluded")
                                      : (isPt ? "Vagas esgotadas" : "Full capacity reached")}
                                </p>
                              </div>
                            </div>

                            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 border border-slate-300 shrink-0">
                              {isBookingExpired || isPast
                                ? (isPt ? "ENCERRADO" : "CLOSED")
                                : (isPt ? "ESGOTADO" : "FULL")}
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
                              ? "border-[#0b1329] bg-[#0b1329] text-white shadow-md ring-1 ring-[#0b1329]"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                isSelected ? "border-white bg-white" : "border-slate-300 bg-white"
                              }`}
                            >
                              {isSelected && <div className="h-2 w-2 rounded-full bg-[#0b1329]" />}
                            </div>

                            <div>
                              <p className={`text-sm font-bold ${isSelected ? "text-white" : "text-slate-900"}`}>
                                {formatSlotDisplay(slot, isPt)}
                              </p>
                              <p className={`text-xs mt-0.5 ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                                {durationText}
                              </p>
                            </div>
                          </div>

                          {isSelected ? (
                            <span className="flex items-center gap-1 text-[11px] font-bold text-white bg-white/20 border border-white/30 px-2.5 py-0.5 rounded-full shrink-0">
                              <Check size={11} />
                              <span>{isPt ? "Seleccionada" : "Selected"}</span>
                            </span>
                          ) : remaining !== undefined && remaining <= 3 ? (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                              {isPt ? `Só ${remaining} vaga${remaining !== 1 ? "s" : ""}` : `Only ${remaining} left`}
                            </span>
                          ) : remaining !== undefined ? (
                            <span className="text-[11px] text-slate-500 font-medium shrink-0">
                              {isPt ? `${remaining} vagas abertas` : `${remaining} spots open`}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>

                  {/* Submission Error Banner */}
                  {error && (
                    <div className="mx-6 mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                      <AlertCircle size={15} className="shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Confirm Button */}
                  <div className="px-6 pb-6 pt-2 space-y-3">
                    <button
                      type="button"
                      onClick={handleConfirmSlot}
                      disabled={submitting || !selectedSlot || Boolean(candidate?.slotStats?.[selectedSlot]?.isFull)}
                      className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-[#0b1329] text-white text-sm font-bold py-3.5 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
                    >
                      {submitting ? (
                        <>
                          <RefreshCw className="animate-spin" size={16} />
                          <span>{isPt ? "A registar agendamento…" : "Confirming booking…"}</span>
                        </>
                      ) : (
                        <>
                          <span>{isPt ? "Confirmar Agendamento Presencial" : "Confirm My Test Session"}</span>
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                    <p className="text-center text-[11px] text-slate-500">
                      {isPt
                        ? "A confirmação é registada de imediato no sistema da Overwatch e o seu comprovativo é gerado."
                        : "Your confirmation is saved immediately and an official slip is generated."}
                    </p>
                  </div>
                </div>

                {/* Support Section */}
                <ChatbotSupportSection isPt={isPt} supportEmail={supportEmail} />
              </div>
            )}

            {/* Official Footer */}
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 no-print">
              <div>
                <p className="font-semibold text-slate-800">Overwatch Moçambique, Lda.</p>
                <p className="text-slate-400 mt-0.5">{siteContact.address.pt}</p>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={`mailto:${supportEmail}`}
                  className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-semibold"
                >
                  <Mail size={13} />
                  <span>{supportEmail}</span>
                </a>
              </div>
            </div>

          </div>
        ) : null}
      </main>
    </div>
  );
}
