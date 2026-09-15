"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Shield,
  Check,
  ExternalLink,
  Phone,
  RefreshCw,
  Building,
  FileCheck,
  User,
  Lock,
} from "lucide-react";
import { siteContact, getGoogleMapsUrl } from "@/lib/site-config";
import { DEFAULT_TEST_SLOTS } from "@/lib/careers";

type CandidateData = {
  id: string;
  name: string;
  role: string;
  testSlot: string | null;
  testBookedAt: string | null;
  invitedAt: string | null;
  slots: string[];
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
  // Language region: defaults to PT, inherits from main page, with option to switch to EN
  const [activeLang, setActiveLang] = useState<"pt" | "en">("pt");

  useEffect(() => {
    let initial: "pt" | "en" = "pt"; // default is Portuguese
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
  const [successNotice, setSuccessNotice] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchCandidate() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(
          `/api/careers/test-booking?id=${encodeURIComponent(id)}`,
        );
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
            setSelectedSlot(data.slots[0]);
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
      setError(
        isPt ? "Link de convocatória inválido." : "Invalid invitation link.",
      );
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [id, isPt]);

  async function handleConfirmSlot() {
    if (!selectedSlot) {
      setError(
        isPt
          ? "Por favor seleccione uma data para o teste."
          : "Please select a test slot.",
      );
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

      if (!res.ok) {
        if (res.status === 409) {
          setCandidate((prev) =>
            prev
              ? {
                  ...prev,
                  testSlot: data.testSlot || prev.testSlot || selectedSlot,
                }
              : null,
          );
          setError("");
          return;
        }
        throw new Error(
          data.error ||
            (isPt
              ? "Ocorreu um erro ao confirmar a data."
              : "Failed to confirm test slot."),
        );
      }

      setCandidate((prev) =>
        prev
          ? {
              ...prev,
              testSlot: selectedSlot,
              testBookedAt: data.testBookedAt || new Date().toISOString(),
            }
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
    candidate?.slots && candidate.slots.length > 0
      ? candidate.slots
      : DEFAULT_TEST_SLOTS;
  const isAlreadyBooked = Boolean(candidate?.testSlot);

  return (
    <section className="relative min-h-[85vh] bg-[#090d16] text-white py-12 sm:py-16 px-4 sm:px-6">
      <div className="relative z-10 max-w-2xl mx-auto space-y-6">
        {loading ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 text-center">
            <RefreshCw className="animate-spin text-white/60" size={28} />
            <p className="text-xs text-white/60">
              {isPt
                ? "A carregar convocatória oficial..."
                : "Loading official convocation..."}
            </p>
          </div>
        ) : error && !candidate ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center max-w-lg mx-auto">
            <AlertCircle size={36} className="text-red-400 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-white mb-2">
              {isPt ? "Convocatória Não Encontrada" : "Convocation Not Found"}
            </h2>
            <p className="text-xs text-white/70 mb-6 leading-relaxed">
              {error ||
                (isPt
                  ? "Não foi possível localizar esta convocatória. Verifique se o link está correto ou contacte o nosso departamento de recursos humanos."
                  : "Could not find this convocation record. Please verify the URL or contact HR.")}
            </p>
            <a
              href={`https://wa.me/${siteContact.whatsappNumber}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-xs font-bold text-[#090d16] hover:bg-emerald-400 transition-colors shadow-md"
            >
              <Phone size={14} />
              <span>{isPt ? "Contactar Recursos Humanos (WhatsApp)" : "Contact HR via WhatsApp"}</span>
            </a>
          </div>
        ) : candidate ? (
          <div className="space-y-6">
            {/* Executive Letterhead Header Card */}
            <div className="rounded-xl border border-white/10 bg-[#121827]/90 p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <Building size={14} className="text-white/40" />
                  <span className="font-semibold uppercase tracking-wider text-[0.68rem]">
                    Overwatch Moçambique • Recrutamento & Selecção
                  </span>
                </div>

                {/* Language Switcher & Ref */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-white/[0.06] border border-white/10 rounded-lg p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => switchLanguage("pt")}
                      className={`px-2.5 py-1 rounded-md text-[0.7rem] font-bold transition-all cursor-pointer ${
                        activeLang === "pt"
                          ? "bg-white text-[#090d16] shadow-sm"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      PT
                    </button>
                    <button
                      type="button"
                      onClick={() => switchLanguage("en")}
                      className={`px-2.5 py-1 rounded-md text-[0.7rem] font-bold transition-all cursor-pointer ${
                        activeLang === "en"
                          ? "bg-white text-[#090d16] shadow-sm"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      EN
                    </button>
                  </div>

                  <span className="text-[0.68rem] font-mono text-white/40 hidden sm:inline-block">
                    Ref: CCO-2026/MAPUTO
                  </span>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  {isAlreadyBooked ? (
                    <>
                      <CheckCircle2 size={14} className="text-emerald-400" />
                      <span className="text-emerald-400">
                        {isPt
                          ? "Agendamento Confirmado no Sistema"
                          : "Booking Confirmed in System"}
                      </span>
                    </>
                  ) : (
                    <span className="text-sky-400">
                      {isPt
                        ? "Convocatória Oficial para Teste Presencial"
                        : "Official In-Person Selection Test"}
                    </span>
                  )}
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {candidate.name}
                </h1>
                <p className="text-xs sm:text-sm text-white/70 leading-relaxed pt-1">
                  {isAlreadyBooked
                    ? isPt
                      ? "Agradecemos a sua confirmação. O seu teste presencial de selecção para a vaga de Operadora de CCO já se encontra agendado nas instalações da Overwatch em Maputo."
                      : "Thank you for confirming. Your in-person selection test for the CCTV Operator position has been scheduled at the Overwatch office in Maputo."
                    : isPt
                      ? "Agradecemos a sua candidatura à vaga de Operadora de CCO. Após avaliação curricular, foi apurada para a realização do teste presencial de selecção técnica nas instalações da Overwatch em Maputo."
                      : "Following review of your application for the CCTV Operator position, you have been shortlisted for the in-person selection test at the Overwatch office in Maputo."}
                </p>
              </div>
            </div>

            {/* If Already Confirmed: Dedicated Clean Official Confirmation Card */}
            {isAlreadyBooked ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-6 sm:p-8 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-500/20 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                      <CheckCircle2 size={22} className="text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-white">
                        {isPt
                          ? "Obrigada pela confirmação, já agendou o seu teste!"
                          : "Thank you for booking, you have already scheduled your test!"}
                      </h2>
                      <span className="text-[0.72rem] text-emerald-300 font-medium">
                        {isPt
                          ? "Presença confirmada • O agendamento é de utilização única"
                          : "Attendance confirmed • Booking is single-use only"}
                      </span>
                    </div>
                  </div>
                  <span className="text-[0.68rem] font-semibold text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 rounded-full">
                    {isPt ? "Agendamento Único Confirmado" : "Single-Use Booking Confirmed"}
                  </span>
                </div>

                {/* Confirmed Slot Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div className="rounded-xl bg-black/40 border border-white/10 p-4 space-y-2">
                    <div className="flex items-center gap-1.5 text-white/50 text-[0.68rem] font-semibold uppercase tracking-wider">
                      <Calendar size={13} className="text-emerald-400" />
                      <span>{isPt ? "Data e Turno do Teste:" : "Confirmed Date & Slot:"}</span>
                    </div>
                    <span className="text-white font-bold text-base block">
                      {formatSlotDisplay(candidate.testSlot || "", isPt)}
                    </span>
                    <div className="space-y-1 pt-1 text-[0.72rem] text-white/70 border-t border-white/10">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-sky-400 shrink-0" />
                        <span>{isPt ? "Horário da prova: 10h00 às 11h30" : "Test session: 10:00 to 11:30"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-amber-300 font-medium">
                        <AlertCircle size={12} className="shrink-0" />
                        <span>
                          {isPt
                            ? "Chegada às 09h30 (Portão encerra às 09h50)"
                            : "Arrive at 09:30 (Gates close at 09:50)"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-black/40 border border-white/10 p-4 space-y-2">
                    <div className="flex items-center gap-1.5 text-white/50 text-[0.68rem] font-semibold uppercase tracking-wider">
                      <MapPin size={13} className="text-sky-400" />
                      <span>{isPt ? "Local das Provas:" : "Testing Venue:"}</span>
                    </div>
                    <div>
                      <strong className="text-white block font-semibold text-xs">Overwatch Moçambique</strong>
                      <span className="text-white/70 text-[0.72rem] block leading-snug mt-0.5">
                        {siteContact.address.pt}
                      </span>
                    </div>
                    <div className="pt-1 border-t border-white/10">
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-[0.72rem] font-medium text-sky-400 hover:text-sky-300 hover:underline"
                      >
                        <span>{isPt ? "Abrir rota no Google Maps" : "Open route on Google Maps"}</span>
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Admission Instructions */}
                <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4 space-y-2 text-xs text-white/80">
                  <div className="font-bold text-white text-[0.75rem] uppercase tracking-wider">
                    {isPt ? "Instruções Obrigatórias para o Dia do Teste:" : "Mandatory Test Day Instructions:"}
                  </div>
                  <ul className="list-disc pl-5 space-y-1.5 text-[0.72rem] text-white/70 leading-relaxed">
                    <li>
                      <strong className="text-white">
                        {isPt ? "Documento de Identificação: " : "Identification: "}
                      </strong>
                      {isPt
                        ? "Apresentar documento de identificação original e válido (BI, Passaporte ou DIRE) e trazer uma cópia simples."
                        : "Bring your original valid photo ID (BI, Passport or DIRE) along with a simple copy."}
                    </li>
                    <li>
                      <strong className="text-white">
                        {isPt ? "Material de escrita: " : "Writing material: "}
                      </strong>
                      {isPt ? "Trazer caneta esferográfica de tinta azul ou preta." : "Bring a blue or black ballpoint pen."}
                    </li>
                    <li>
                      <strong className="text-amber-300">
                        {isPt ? "Pontualidade Rigorosa: " : "Strict Punctuality: "}
                      </strong>
                      {isPt
                        ? "Pedimos que chegue impreterivelmente às 09h30 para check-in de segurança. Às 09h50 o portão será encerrado e não será permitida a entrada de candidatas que cheguem depois dessa hora."
                        : "Please arrive strictly at 09:30 for security check-in. At 09:50 gates are locked and late arrivals will strictly not be admitted."}
                    </li>
                  </ul>
                </div>

                {/* Single-Use Enforced Notice Callout */}
                <div className="rounded-xl bg-white/[0.04] border border-white/10 p-4 flex items-start gap-3 text-xs">
                  <Lock size={18} className="text-sky-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold text-white text-xs">
                      {isPt ? "Agendamento Único Realizado" : "Single-Use Booking Completed"}
                    </div>
                    <p className="text-[0.72rem] text-white/60 leading-relaxed">
                      {isPt
                        ? "Cada candidata só pode agendar uma única vez. Como a sua presença já se encontra confirmada e gravada no sistema, este link não permite novo agendamento nem alteração de data. A sua vaga está garantida para o turno indicado acima."
                        : "Each candidate may only book once. Because your attendance is already confirmed and recorded in our system, this link does not permit re-booking or date changes. Your slot is guaranteed for the session shown above."}
                    </p>
                  </div>
                </div>

                {/* Direct WhatsApp Support */}
                <div className="pt-1 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10">
                  <span className="text-[0.72rem] text-white/50 text-center sm:text-left">
                    {isPt ? "Dúvidas ou imprevistos de transporte?" : "Questions or scheduling conflicts?"}
                  </span>
                  <a
                    href={`https://wa.me/${siteContact.whatsappNumber}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 transition-colors"
                  >
                    <Phone size={13} />
                    <span>{isPt ? "WhatsApp Recursos Humanos" : "Contact HR via WhatsApp"}</span>
                  </a>
                </div>
              </div>
            ) : (
              /* YET TO BOOK VIEW: Slot Selection Card with Clear Single-Use Notice */
              <div className="rounded-xl border border-white/10 bg-[#121827]/90 p-6 sm:p-8 space-y-5">
                {/* Prominent Single-Use Notice Banner */}
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 sm:p-5 flex items-start gap-3.5 text-xs text-amber-200">
                  <AlertCircle size={20} className="text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold text-amber-300 uppercase tracking-wider text-[0.72rem]">
                      {isPt
                        ? "⚠️ AVISO IMPORTANTE: AGENDAMENTO ÚNICO E DEFINITIVO"
                        : "⚠️ IMPORTANT NOTICE: SINGLE-USE & FINAL BOOKING"}
                    </div>
                    <p className="text-[0.75rem] text-amber-100/90 leading-relaxed">
                      {isPt
                        ? "Cada candidata só pode agendar uma única vez. Uma vez confirmada a data, a escolha é definitiva e NÃO poderá ser desfeita ou alterada. Por favor, certifique-se da sua disponibilidade antes de confirmar."
                        : "Each candidate can only book once. Once confirmed, your chosen date is permanent and CANNOT be changed or undone. Please verify your availability before submitting."}
                    </p>
                  </div>
                </div>

                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Calendar size={18} className="text-white/70" />
                    <span>
                      {isPt
                        ? "Escolha a data da sua preferência:"
                        : "Choose your preferred date:"}
                    </span>
                  </h2>
                  <p className="mt-1 text-xs text-white/60 leading-relaxed">
                    {isPt
                      ? "Seleccione uma das datas abaixo para a realização do seu teste presencial. A confirmação é gravada imediatamente no sistema de recursos humanos."
                      : "Select one of the dates below for your in-person technical evaluation. Your selection is immediately saved in the recruitment system."}
                  </p>
                </div>

                {/* Slot Cards List */}
                <div className="space-y-2.5">
                  {slotsList.map((slot) => {
                    const isSelected = selectedSlot === slot;

                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                          isSelected
                            ? "border-emerald-500/50 bg-emerald-500/[0.08] shadow-sm"
                            : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]"
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div
                            className={`h-4 w-4 rounded-full border flex items-center justify-center transition-colors shrink-0 ${
                              isSelected
                                ? "border-emerald-400 bg-emerald-400 text-[#090d16]"
                                : "border-white/30 bg-transparent"
                            }`}
                          >
                            {isSelected && <Check size={11} strokeWidth={3} />}
                          </div>
                          <div>
                            <div className="text-xs sm:text-sm font-semibold text-white">
                              {formatSlotDisplay(slot, isPt)}
                            </div>
                            <div className="text-[0.68rem] text-white/50 flex items-center gap-2 mt-0.5">
                              <span>{isPt ? "10h00 às 11h30 (Chegada 09h30)" : "10:00 to 11:30 (Arrival 09:30)"}</span>
                              <span>•</span>
                              <span>{isPt ? "Sede Maputo" : "Maputo HQ"}</span>
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <span className="text-[0.65rem] font-semibold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                            {isPt ? "Seleccionada" : "Selected"}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {error && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400 flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Confirm Button */}
                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={handleConfirmSlot}
                    disabled={submitting || !selectedSlot}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-xs sm:text-sm font-bold text-[#090d16] hover:bg-white/90 disabled:opacity-40 transition-all cursor-pointer shadow-md"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="animate-spin" size={16} />
                        <span>{isPt ? "A gravar confirmação definitiva..." : "Saving final confirmation..."}</span>
                      </>
                    ) : (
                      <>
                        <span>{isPt ? "Confirmar Minha Data Definitiva →" : "Confirm My Final Test Date →"}</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                  <p className="text-center text-[0.68rem] text-white/40">
                    {isPt
                      ? "🔒 Lembre-se: O agendamento é único. Uma vez confirmada a data, a escolha não poderá ser desfeita ou alterada."
                      : "🔒 Note: Booking is single-use. Once confirmed, your slot cannot be undone or changed."}
                  </p>
                </div>
              </div>
            )}

            {/* Corporate Location & Support Card */}
            <div className="rounded-xl border border-white/10 bg-[#0e1320] p-5 sm:p-6 text-xs text-white/70 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div>
                  <strong className="text-white block">Overwatch Moçambique, Lda.</strong>
                  <span className="text-[0.7rem] text-white/50">{siteContact.address.pt}</span>
                </div>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[0.7rem] text-sky-400 hover:underline"
                >
                  <MapPin size={12} />
                  <span>{isPt ? "Ver no Mapa" : "View Map"}</span>
                </a>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[0.7rem] text-white/50">
                <span>{isPt ? "Dúvidas ou imprevistos de transporte?" : "Questions or scheduling conflicts?"}</span>
                <a
                  href={`https://wa.me/${siteContact.whatsappNumber}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 hover:underline inline-flex items-center gap-1 font-medium"
                >
                  <Phone size={11} />
                  <span>WhatsApp: +258 84 287 0793</span>
                </a>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
