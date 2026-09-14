"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Check,
  ExternalLink,
  Phone,
  RefreshCw,
  Sparkles,
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

export default function CandidateBookingClient({
  id,
  locale,
}: {
  id: string;
  locale: string;
}) {
  const isPt = locale === "pt";
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

  const mapsUrl = getGoogleMapsUrl(locale);
  const slotsList =
    candidate?.slots && candidate.slots.length > 0
      ? candidate.slots
      : DEFAULT_TEST_SLOTS;
  const isAlreadyBooked = Boolean(candidate?.testSlot);

  return (
    <section className="relative min-h-[85vh] bg-[#090d16] text-white py-12 sm:py-20 px-4 sm:px-6 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 tech-grid opacity-25 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.15),transparent_70%)] pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto">
        {loading ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 text-center">
            <RefreshCw className="animate-spin text-emerald-400" size={32} />
            <p className="text-sm text-white/70">
              {isPt
                ? "A carregar os detalhes da sua convocatória..."
                : "Loading invitation details..."}
            </p>
          </div>
        ) : error && !candidate ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center backdrop-blur-sm max-w-lg mx-auto">
            <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">
              {isPt ? "Convocatória Não Encontrada" : "Invitation Not Found"}
            </h2>
            <p className="text-sm text-white/70 mb-6 leading-relaxed">
              {error ||
                (isPt
                  ? "Não foi possível localizar esta convocatória. Verifique se o link está correto ou entre em contacto connosco."
                  : "Could not find this invitation. Please verify the link or contact our team.")}
            </p>
            <a
              href={`https://wa.me/${siteContact.whatsappNumber}?text=${encodeURIComponent(
                isPt
                  ? "Olá, tive dificuldades ao abrir o link de confirmação do teste da Overwatch."
                  : "Hello, I had trouble opening the Overwatch test confirmation link.",
              )}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-[#090d16] hover:bg-emerald-400 transition-colors"
            >
              <Phone size={16} />
              <span>{isPt ? "Apoio via WhatsApp" : "WhatsApp Support"}</span>
            </a>
          </div>
        ) : candidate ? (
          <div className="space-y-8">
            {/* Header Badge & Greeting */}
            <div className="text-center sm:text-left border-b border-white/10 pb-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-400 mb-3">
                <Sparkles size={13} />
                <span>
                  {isPt
                    ? "Fase 2: Teste de Selecção Presencial"
                    : "Phase 2: In-Person Selection Test"}
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
                {isPt ? "Olá," : "Hello,"}{" "}
                <span className="text-emerald-400">{candidate.name}</span>
              </h1>
              <p className="mt-2 text-sm sm:text-base text-white/75 leading-relaxed">
                {isPt
                  ? "Parabéns! A sua candidatura para a vaga de "
                  : "Congratulations! Your application for the position of "}
                <strong className="text-white">Operadora de CCO</strong>
                {isPt
                  ? " foi seleccionada para avançar para a fase de teste presencial de aptidão técnica."
                  : " has been shortlisted for the technical in-person test."}
              </p>
            </div>

            {/* If Already Confirmed: Show High-Priority Status Card */}
            {isAlreadyBooked && (
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 sm:p-8 backdrop-blur-md relative overflow-hidden shadow-[0_0_40px_rgba(16,185,129,0.12)]">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-emerald-500/20 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-emerald-500/20 border border-emerald-500/40 p-2.5 text-emerald-400">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        {isPt ? "Estado da Convocatória" : "Invitation Status"}
                      </span>
                      <h3 className="text-lg sm:text-xl font-bold text-white">
                        {isPt ? "Presença Confirmada" : "Attendance Confirmed"}
                      </h3>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 text-emerald-300 text-xs font-medium px-3 py-1">
                    <Check size={13} />
                    {isPt ? "Vaga Reservada no Sistema" : "Reserved in System"}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl bg-[#090d16]/70 border border-white/10 p-4">
                    <span className="text-xs font-semibold text-white/60 flex items-center gap-1.5 mb-1">
                      <Calendar size={14} className="text-emerald-400" />
                      {isPt
                        ? "Data e Hora Escolhida:"
                        : "Selected Date & Time:"}
                    </span>
                    <p className="text-base font-bold text-white mt-1">
                      {candidate.testSlot}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#090d16]/70 border border-white/10 p-4">
                    <span className="text-xs font-semibold text-white/60 flex items-center gap-1.5 mb-1">
                      <MapPin size={14} className="text-emerald-400" />
                      {isPt ? "Local do Teste:" : "Test Location:"}
                    </span>
                    <p className="text-xs font-medium text-white/90 leading-snug mt-1">
                      {siteContact.address.pt}
                    </p>
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline mt-2"
                    >
                      {isPt ? "Abrir no Google Maps" : "Open in Google Maps"}{" "}
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>

                {/* Requirements Checklist */}
                <div className="mt-5 pt-4 border-t border-white/10 text-xs sm:text-sm text-white/80 space-y-2">
                  <div className="font-semibold text-white flex items-center gap-2">
                    <Clock size={15} className="text-emerald-400" />
                    <span>
                      {isPt
                        ? "Instruções Importantes para o Dia:"
                        : "Important Instructions for the Day:"}
                    </span>
                  </div>
                  <ul className="space-y-1.5 pl-6 list-disc text-white/70">
                    <li>
                      {isPt
                        ? "Chegar com 15 minutos de antecedência (às 09h45)."
                        : "Arrive 15 minutes in advance (at 09:45)."}
                    </li>
                    <li>
                      {isPt
                        ? "Apresentar documento de identificação original e válido (BI, Passaporte ou DIRE)."
                        : "Bring original valid photo ID (BI, Passport or DIRE)."}
                    </li>
                    <li>
                      {isPt
                        ? "Trazer caneta esferográfica de tinta azul ou preta."
                        : "Bring a blue or black ballpoint pen."}
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Interactive Slot Selector */}
            <div className="rounded-2xl border border-white/10 bg-[#121827]/80 p-6 sm:p-8 backdrop-blur-md space-y-6">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <Calendar size={20} className="text-emerald-400" />
                  <span>
                    {isAlreadyBooked
                      ? isPt
                        ? "Deseja alterar o seu dia de teste?"
                        : "Need to change your test slot?"
                      : isPt
                        ? "Escolha o seu dia de preferência:"
                        : "Choose your preferred test date:"}
                  </span>
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-white/60">
                  {isPt
                    ? "Seleccione um dos dias abaixo para realizar o seu teste de selecção presencial de 10h00 às 11h30."
                    : "Select one of the available dates below for your in-person technical evaluation (10:00 to 11:30)."}
                </p>
              </div>

              {/* Slot Cards */}
              <div className="space-y-3">
                {slotsList.map((slot) => {
                  const isSelected = selectedSlot === slot;
                  const isCurrentSaved = candidate.testSlot === slot;

                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`w-full text-left p-4 sm:p-5 rounded-xl border transition-all flex items-center justify-between gap-4 cursor-pointer ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-500/[0.08] shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/50"
                          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`h-5 w-5 rounded-full border flex items-center justify-center transition-colors shrink-0 ${
                            isSelected
                              ? "border-emerald-500 bg-emerald-500 text-[#090d16]"
                              : "border-white/30 bg-transparent"
                          }`}
                        >
                          {isSelected && <Check size={13} strokeWidth={3} />}
                        </div>
                        <div>
                          <div className="text-sm sm:text-base font-semibold text-white">
                            {slot}
                          </div>
                          <div className="text-xs text-white/50 flex items-center gap-2 mt-0.5">
                            <span>
                              {isPt
                                ? "Presencial • Maputo"
                                : "In-Person • Maputo"}
                            </span>
                            <span>•</span>
                            <span>
                              {isPt
                                ? "Duração aprox. 1h30"
                                : "Approx. 1h30 duration"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isCurrentSaved && (
                        <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-[0.68rem] font-bold text-emerald-400 uppercase tracking-wider">
                          {isPt ? "Turno Atual" : "Current Slot"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400 flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successNotice && (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2
                    size={16}
                    className="shrink-0 text-emerald-400"
                  />
                  <span>
                    {isPt
                      ? "Presença confirmada com sucesso! Enviámos os dados da confirmação para o seu e-mail."
                      : "Attendance confirmed! We sent the confirmation details to your email."}
                  </span>
                </div>
              )}

              {/* Action Button */}
              <button
                type="button"
                onClick={handleConfirmSlot}
                disabled={
                  submitting ||
                  (isAlreadyBooked && candidate.testSlot === selectedSlot)
                }
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-4 text-sm sm:text-base font-bold text-[#090d16] shadow-xl hover:bg-white/90 active:scale-[0.99] disabled:opacity-40 transition-all cursor-pointer"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="animate-spin" size={18} />
                    <span>
                      {isPt
                        ? "A gravar a sua confirmação..."
                        : "Saving confirmation..."}
                    </span>
                  </>
                ) : isAlreadyBooked ? (
                  candidate.testSlot === selectedSlot ? (
                    <>
                      <Check size={18} className="text-emerald-600" />
                      <span>
                        {isPt
                          ? "Este Turno Já Está Confirmado"
                          : "This Slot is Already Confirmed"}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        {isPt
                          ? "Actualizar para a Nova Data Seleccionada"
                          : "Update to Newly Selected Date"}
                      </span>
                      <ArrowRight size={18} />
                    </>
                  )
                ) : (
                  <>
                    <span>
                      {isPt
                        ? "Confirmar Minha Presença no Teste"
                        : "Confirm My Test Attendance"}
                    </span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <p className="text-center text-xs text-white/50">
                {isPt
                  ? "Ao confirmar, a sua vaga para a data seleccionada é automaticamente guardada no nosso sistema de recrutamento."
                  : "Upon confirming, your seat for the selected date is immediately booked in our recruitment system."}
              </p>
            </div>

            {/* Help / WhatsApp Contact */}
            <div className="rounded-2xl border border-white/10 bg-[#0e1320]/60 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
              <div>
                <h4 className="text-sm font-semibold text-white">
                  {isPt
                    ? "Tem alguma dúvida ou imprevisto?"
                    : "Have questions or schedule conflicts?"}
                </h4>
                <p className="text-xs text-white/60 mt-0.5">
                  {isPt
                    ? "A nossa equipa de recursos humanos está disponível para auxiliar."
                    : "Our HR team is available on WhatsApp to assist you."}
                </p>
              </div>

              <a
                href={`https://wa.me/${siteContact.whatsappNumber}?text=${encodeURIComponent(
                  isPt
                    ? `Olá, sou ${candidate.name} (candidata a Operadora de CCO) e tenho uma questão sobre o teste de selecção.`
                    : `Hello, I am ${candidate.name} (CCO Operator applicant) and have a question regarding the selection test.`,
                )}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
              >
                <Phone size={14} />
                <span>WhatsApp: +258 84 287 0793</span>
              </a>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
