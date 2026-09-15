"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Check,
  ExternalLink,
  Phone,
  RefreshCw,
  Lock,
  ShieldOff,
  ChevronRight,
  QrCode,
  Download,
  Printer,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { siteContact, getGoogleMapsUrl } from "@/lib/site-config";
import { DEFAULT_TEST_SLOTS } from "@/lib/careers";

type SlotStat = {
  booked: number;
  max: number;
  isFull: boolean;
  remaining: number;
};

type CandidateData = {
  id: string;
  name: string;
  role: string;
  testSlot: string | null;
  testBookedAt: string | null;
  invitedAt: string | null;
  attendedAt?: string | null;
  attendanceStatus?: string | null;
  slots: string[];
  slotStats?: Record<string, SlotStat>;
  windowFilledNotice?: boolean;
  address: string;
  whatsapp: string;
};

function formatSlotDisplay(slot: string, isPt: boolean) {
  if (isPt) return slot;
  return slot
    .replace("Segunda-feira", "Monday")
    .replace("Terça-feira", "Tuesday")
    .replace("Quarta-feira", "Wednesday")
    .replace("Quinta-feira", "Thursday")
    .replace("Sexta-feira", "Friday")
    .replace("Sábado", "Saturday")
    .replace("Domingo", "Sunday")
    .replace("de Setembro", "September")
    .replace("de Outubro", "October")
    .replace("de Novembro", "November")
    .replace("de Dezembro", "December")
    .replace("de Janeiro", "January")
    .replace("de Fevereiro", "February")
    .replace("de Março", "March")
    .replace("de Abril", "April")
    .replace("de Maio", "May")
    .replace("de Junho", "June")
    .replace("de Julho", "July")
    .replace("de Agosto", "August")
    .replace(/(\d{1,2})h(\d{2})/, (_, h, m) => {
      const hour = parseInt(h, 10);
      const ampm = hour >= 12 ? "PM" : "AM";
      const h12 = hour % 12 || 12;
      return `${h12}:${m} ${ampm}`;
    });
}

export default function CandidateBookingClient({
  id,
  locale,
}: {
  id: string;
  locale: string;
}) {
  const [activeLang, setActiveLang] = useState<"pt" | "en">("pt");

  useEffect(() => {
    let initial: "pt" | "en" = "pt";
    try {
      const stored = localStorage.getItem("overwatch_preferred_locale");
      if (stored === "en" || stored === "pt") {
        initial = stored;
      } else {
        const match = document.cookie.match(/NEXT_LOCALE=([^;]+)/);
        if (match && (match[1] === "en" || match[1] === "pt")) {
          initial = match[1] as "pt" | "en";
        } else if (locale === "en") {
          initial = "en";
        }
      }
    } catch {
      // fallback
    }
    setActiveLang(initial);
  }, [locale]);

  const switchLanguage = (newLang: "pt" | "en") => {
    setActiveLang(newLang);
    try {
      localStorage.setItem("overwatch_preferred_locale", newLang);
      document.cookie = `NEXT_LOCALE=${newLang}; path=/; max-age=31536000; SameSite=Lax`;
      if (typeof window !== "undefined" && window.history.replaceState) {
        window.history.replaceState(null, "", `/${newLang}/careers/test-invite/${id}`);
      }
    } catch {}
  };

  const isPt = activeLang === "pt";
  const [candidate, setCandidate] = useState<CandidateData | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isDeactivated, setIsDeactivated] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    if (candidate?.id && candidate.testSlot) {
      const origin = typeof window !== "undefined" ? window.location.origin : "https://www.overwatchmoz.com";
      const checkInUrl = `${origin}/${activeLang}/careers/check-in?id=${candidate.id}`;
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

    async function fetchCandidate() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`/api/careers/test-booking?id=${encodeURIComponent(id)}`);

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
          if (data.testSlot) {
            setSelectedSlot(data.testSlot);
          } else if (data.slots && data.slots.length > 0) {
            const available = data.slots.find((s) => !data.slotStats?.[s]?.isFull);
            setSelectedSlot(available || data.slots[0]);
          } else {
            setSelectedSlot(DEFAULT_TEST_SLOTS[0]);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (id) {
      fetchCandidate();
    } else {
      setError(isPt ? "Link de convocatória inválido." : "Invalid invitation link.");
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [id, isPt]);

  async function handleConfirmSlot() {
    if (!selectedSlot) {
      setError(isPt ? "Por favor seleccione uma data para o teste." : "Please select a test slot.");
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

  const mapsUrl = getGoogleMapsUrl(activeLang);
  const slotsList =
    candidate?.slots && candidate.slots.length > 0 ? candidate.slots : DEFAULT_TEST_SLOTS;
  const isAlreadyBooked = Boolean(candidate?.testSlot);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-28 sm:pt-36 pb-12 sm:pb-16">

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
          <div className="max-w-lg mx-auto text-center py-8">
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
            <p className="text-sm text-gray-500 leading-relaxed mb-8">
              {isPt
                ? "Se acredita que se trata de um erro, por favor entre em contacto connosco directamente."
                : "If you believe this is an error, please contact us directly."}
            </p>
            <a
              href={`https://wa.me/${siteContact.whatsappNumber}?text=${encodeURIComponent(isPt ? "Olá, o meu link de agendamento foi desactivado. Podem ajudar?" : "Hello, my booking link appears to be deactivated. Can you help?")}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-[#07080f] text-white rounded-xl px-5 py-3 text-sm font-semibold hover:bg-gray-800 transition-colors shadow-sm"
            >
              <Phone size={15} />
              <span>{isPt ? "Contactar RH via WhatsApp" : "Contact HR via WhatsApp"}</span>
              <ExternalLink size={13} className="opacity-60" />
            </a>
          </div>

        /* ── NOT FOUND / ERROR ───────────────────────────────────── */
        ) : error && !candidate ? (
          <div className="max-w-lg mx-auto text-center py-8">
            <div className="inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-amber-50 border border-amber-100 mb-6">
              <AlertCircle size={36} className="text-amber-400" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-3">
              {isPt ? "Convocatória não encontrada" : "Invitation not found"}
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed mb-8">
              {error ||
                (isPt
                  ? "Não foi possível localizar esta convocatória. Verifique se o link está correcto ou contacte o nosso departamento de RH."
                  : "Could not locate this invitation. Please verify the link or contact our HR department.")}
            </p>
            <a
              href={`https://wa.me/${siteContact.whatsappNumber}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-[#07080f] text-white rounded-xl px-5 py-3 text-sm font-semibold hover:bg-gray-800 transition-colors shadow-sm"
            >
              <Phone size={15} />
              <span>{isPt ? "Contactar Recursos Humanos" : "Contact HR"}</span>
            </a>
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
                      {isAlreadyBooked
                        ? isPt ? "Presença confirmada" : "Attendance confirmed"
                        : isPt ? "Convocatória oficial" : "Official convocation"}
                    </p>
                    <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">
                      {candidate.name}
                    </h1>
                  </div>
                  {isAlreadyBooked ? (
                    <div className="shrink-0 h-10 w-10 rounded-full bg-emerald-400/20 border border-emerald-400/30 flex items-center justify-center">
                      <CheckCircle2 size={20} className="text-emerald-400" />
                    </div>
                  ) : (
                    <span className="shrink-0 text-[0.65rem] font-mono font-medium text-white/25 border border-white/10 rounded-lg px-2 py-1 mt-1">
                      CCO-2026/MZQ
                    </span>
                  )}
                </div>
              </div>
              <div className="px-6 py-4">
                <p className="text-sm text-gray-500 leading-relaxed">
                  {isAlreadyBooked
                    ? isPt
                      ? "A sua confirmação foi registada com sucesso. Abaixo encontram-se todos os detalhes do seu teste presencial."
                      : "Your confirmation has been successfully registered. All details for your in-person test are shown below."
                    : isPt
                      ? "Foi seleccionada para a fase de teste presencial de selecção técnica para a vaga de Operadora de CCO. Escolha a data mais conveniente abaixo."
                      : "You have been selected for the in-person technical assessment for the CCTV Operator position. Choose your preferred date below."}
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
                          Overwatch Moçambique
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
                        <QrCode size={48} className="animate-pulse" />
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
                        {isPt ? "10h00 às 11h30 · Chegada às 09h30" : "10:00 AM to 11:30 AM · Arrive at 09:30"}
                      </p>
                    </div>

                    <div className="h-px bg-emerald-200" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-emerald-600 mb-1.5">
                          {isPt ? "Local" : "Venue"}
                        </p>
                        <p className="text-sm font-semibold text-gray-900">Overwatch Moçambique</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-snug">{siteContact.address.pt}</p>
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium mt-2"
                        >
                          <MapPin size={11} />
                          <span>{isPt ? "Ver no Google Maps" : "Open in Google Maps"}</span>
                          <ExternalLink size={10} />
                        </a>
                      </div>
                      <div>
                        <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-emerald-600 mb-1.5">
                          {isPt ? "O que trazer" : "What to bring"}
                        </p>
                        <ul className="space-y-1 text-xs text-gray-600">
                          <li className="flex items-start gap-1.5">
                            <Check size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                            <span>{isPt ? "Documento de identificação original (BI / Passaporte)" : "Original photo ID (BI / Passport)"}</span>
                          </li>
                          <li className="flex items-start gap-1.5">
                            <Check size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                            <span>{isPt ? "Caneta (azul ou preta)" : "A pen (blue or black)"}</span>
                          </li>
                          <li className="flex items-start gap-1.5">
                            <Check size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                            <span>{isPt ? "Chegar até às 09h30 (portão fecha às 09h50)" : "Arrive by 09:30 (gate closes at 09:50)"}</span>
                          </li>
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

                {/* Support row */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 rounded-xl border border-gray-200 bg-white">
                  <p className="text-xs text-gray-500 text-center sm:text-left">
                    {isPt ? "Questões ou imprevistos de última hora?" : "Last-minute questions or issues?"}
                  </p>
                  <a
                    href={`https://wa.me/${siteContact.whatsappNumber}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#25d366] text-white text-xs font-semibold px-4 py-2 hover:bg-[#22c55e] transition-colors shadow-sm"
                  >
                    <Phone size={13} />
                    <span>{isPt ? "WhatsApp RH" : "WhatsApp HR"}</span>
                    <ChevronRight size={13} className="opacity-70" />
                  </a>
                </div>
              </div>

            /* ── YET TO BOOK VIEW ── */
            ) : (
              <div className="space-y-4">
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
                        {isPt ? "Sessões desta semana esgotadas" : "This week's sessions are full"}
                      </p>
                      <p className="text-xs text-blue-700 leading-relaxed">
                        {isPt
                          ? "Abrimos novas sessões para a próxima semana (Segunda a Sexta, 10h00). Limitadas a 10 vagas por dia — reserve já a sua."
                          : "New sessions are open for next week (Mon–Fri, 10:00 AM). Limited to 10 per day — reserve yours now."}
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
                      {isPt ? "Cada sessão está limitada a 10 candidatas." : "Each session is limited to 10 candidates."}
                    </p>
                  </div>

                  <div className="p-4 space-y-2">
                    {slotsList.map((slot) => {
                      const isSelected = selectedSlot === slot;
                      const stat = candidate?.slotStats?.[slot];
                      const isFull = Boolean(stat?.isFull);
                      const remaining = stat ? Math.max(0, stat.remaining) : undefined;

                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={isFull}
                          onClick={() => { if (!isFull) setSelectedSlot(slot); }}
                          className={`w-full text-left rounded-xl border px-4 py-3.5 transition-all flex items-center justify-between gap-3 ${
                            isFull
                              ? "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                              : isSelected
                              ? "border-[#07080f] bg-[#07080f] shadow-md cursor-pointer"
                              : "border-gray-200 bg-white hover:border-gray-400 hover:shadow-sm cursor-pointer"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {/* Radio indicator */}
                            <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                              isFull
                                ? "border-gray-300 bg-gray-100"
                                : isSelected
                                ? "border-white bg-white"
                                : "border-gray-300 bg-white"
                            }`}>
                              {isFull ? (
                                <Lock size={8} className="text-gray-400" strokeWidth={2.5} />
                              ) : isSelected ? (
                                <div className="h-2 w-2 rounded-full bg-[#07080f]" />
                              ) : null}
                            </div>

                            <div>
                              <p className={`text-sm font-semibold ${
                                isFull ? "text-gray-400 line-through" : isSelected ? "text-white" : "text-gray-900"
                              }`}>
                                {formatSlotDisplay(slot, isPt)}
                              </p>
                              <p className={`text-xs mt-0.5 ${
                                isFull ? "text-gray-400" : isSelected ? "text-white/60" : "text-gray-400"
                              }`}>
                                {isFull
                                  ? isPt ? "Vagas esgotadas" : "No spots available"
                                  : isPt ? "10h00–11h30 · Chegada às 09h30 · Maputo" : "10:00–11:30 · Arrive 09:30 · Maputo"
                                }
                              </p>
                            </div>
                          </div>

                          {/* Status badge */}
                          {isFull ? (
                            <span className="flex items-center gap-1 text-[0.65rem] font-semibold text-red-500 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full shrink-0">
                              <Lock size={9} />
                              <span>{isPt ? "Esgotado" : "Full"}</span>
                            </span>
                          ) : isSelected ? (
                            <span className="flex items-center gap-1 text-[0.65rem] font-semibold text-white/80 bg-white/10 border border-white/20 px-2 py-0.5 rounded-full shrink-0">
                              <Check size={9} />
                              <span>{isPt ? "Selecionada" : "Selected"}</span>
                            </span>
                          ) : remaining !== undefined && remaining <= 3 ? (
                            <span className="text-[0.65rem] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                              {isPt ? `Só ${remaining} vaga${remaining !== 1 ? "s" : ""}` : `Only ${remaining} left`}
                            </span>
                          ) : remaining !== undefined ? (
                            <span className="text-[0.65rem] text-gray-400 shrink-0">
                              {isPt ? `${remaining} vagas` : `${remaining} spots`}
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
                      disabled={submitting || !selectedSlot}
                      className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-[#07080f] text-white text-sm font-bold py-3.5 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
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
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <MapPin size={12} />
                  <span>{isPt ? "Mapa" : "Map"}</span>
                </a>
                <span className="text-gray-200">·</span>
                <a
                  href={`https://wa.me/${siteContact.whatsappNumber}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <Phone size={12} />
                  <span>+258 84 287 0793</span>
                </a>
              </div>
            </div>

          </div>
        ) : null}
      </div>
    </div>
  );
}
