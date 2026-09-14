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
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-xs font-bold text-[#090d16] hover:bg-white/90 transition-colors"
            >
              <Phone size={14} />
              <span>{isPt ? "Contactar Recursos Humanos" : "Contact HR via WhatsApp"}</span>
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
                <span className="text-[0.68rem] font-mono text-white/40">
                  Ref: CCO-2026/MAPUTO
                </span>
              </div>

              <div className="mt-5 space-y-2">
                <div className="text-xs font-semibold text-sky-400 uppercase tracking-wider">
                  {isPt ? "Convocatória Oficial para Teste Presencial" : "Official In-Person Selection Test"}
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {candidate.name}
                </h1>
                <p className="text-xs sm:text-sm text-white/70 leading-relaxed pt-1">
                  {isPt
                    ? "Agradecemos a sua candidatura à vaga de Operadora de CCO. Após avaliação curricular, foi apurada para a realização do teste presencial de selecção técnica nas instalações da Overwatch em Maputo."
                    : "Following review of your application for the CCTV Operator position, you have been shortlisted for the in-person selection test at the Overwatch office in Maputo."}
                </p>
              </div>
            </div>

            {/* If Already Confirmed: Clean Official Confirmation Card */}
            {isAlreadyBooked && (
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/[0.05] p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 size={20} className="text-sky-400" />
                    <span className="text-sm font-bold text-white">
                      {isPt ? "Presença Confirmada no Teste" : "Attendance Confirmed"}
                    </span>
                  </div>
                  <span className="text-[0.68rem] font-semibold text-white bg-white/10 border border-white/20 px-2.5 py-0.5 rounded-full">
                    {isPt ? "Agendado no Sistema" : "Recorded in System"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg bg-black/40 border border-white/10 p-3.5 space-y-1">
                    <span className="text-white/50 text-[0.68rem] block font-medium">
                      {isPt ? "Turno Seleccionado:" : "Confirmed Slot:"}
                    </span>
                    <span className="text-white font-bold text-sm block">
                      {candidate.testSlot}
                    </span>
                    <span className="text-white/50 text-[0.68rem] block">
                      {isPt ? "Horário: 10h00 às 11h30 (Chegada às 09h45)" : "10:00 to 11:30 (Arrival at 09:45)"}
                    </span>
                  </div>

                  <div className="rounded-lg bg-black/40 border border-white/10 p-3.5 space-y-1">
                    <span className="text-white/50 text-[0.68rem] block font-medium">
                      {isPt ? "Local das Provas:" : "Testing Venue:"}
                    </span>
                    <span className="text-white font-medium block leading-snug">
                      {siteContact.address.pt}
                    </span>
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[0.68rem] text-cyan-400 hover:underline pt-1"
                    >
                      {isPt ? "Abrir Google Maps" : "Open Google Maps"} <ExternalLink size={10} />
                    </a>
                  </div>
                </div>

                <div className="pt-2 text-xs text-white/70 space-y-1">
                  <div className="font-semibold text-white">
                    {isPt ? "Requisitos para admissão ao teste:" : "Admission requirements:"}
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5 text-white/60 text-[0.72rem]">
                    <li>{isPt ? "Apresentar documento de identificação original e válido (BI, Passaporte ou DIRE)." : "Original valid photo ID (BI, Passport or DIRE)."}</li>
                    <li>{isPt ? "Trazer caneta esferográfica de tinta azul ou preta." : "Blue or black ballpoint pen."}</li>
                    <li>{isPt ? "Chegar com 15 minutos de antecedência para registo de segurança na portaria." : "Arrive 15 minutes prior for security check-in at reception."}</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Slot Selection Card */}
            <div className="rounded-xl border border-white/10 bg-[#121827]/90 p-6 sm:p-8 space-y-5">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Calendar size={18} className="text-white/70" />
                  <span>
                    {isAlreadyBooked
                      ? isPt
                        ? "Deseja alterar a sua data?"
                        : "Need to change your date?"
                      : isPt
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
                  const isCurrentSaved = candidate.testSlot === slot;

                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                        isSelected
                          ? "border-white/50 bg-white/[0.08] shadow-sm"
                          : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`h-4 w-4 rounded-full border flex items-center justify-center transition-colors shrink-0 ${
                            isSelected
                              ? "border-white bg-white text-[#090d16]"
                              : "border-white/30 bg-transparent"
                          }`}
                        >
                          {isSelected && <Check size={11} strokeWidth={3} />}
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-semibold text-white">
                            {slot}
                          </div>
                          <div className="text-[0.68rem] text-white/50 flex items-center gap-2 mt-0.5">
                            <span>{isPt ? "10h00 às 11h30" : "10:00 to 11:30"}</span>
                            <span>•</span>
                            <span>{isPt ? "Sede Maputo" : "Maputo HQ"}</span>
                          </div>
                        </div>
                      </div>

                      {isCurrentSaved && (
                        <span className="text-[0.65rem] font-semibold text-sky-300 bg-sky-500/15 px-2 py-0.5 rounded border border-sky-500/25">
                          {isPt ? "Data Atual" : "Current"}
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

              {successNotice && (
                <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-sky-200 flex items-center gap-2">
                  <CheckCircle2 size={15} className="shrink-0 text-sky-400" />
                  <span>
                    {isPt
                      ? "Presença confirmada com sucesso! Os detalhes do agendamento foram enviados para o seu e-mail."
                      : "Attendance confirmed! Details have been sent to your email address."}
                  </span>
                </div>
              )}

              {/* Confirm Button */}
              <button
                type="button"
                onClick={handleConfirmSlot}
                disabled={
                  submitting ||
                  (isAlreadyBooked && candidate.testSlot === selectedSlot)
                }
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-xs sm:text-sm font-bold text-[#090d16] hover:bg-white/90 disabled:opacity-40 transition-all cursor-pointer shadow-md"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} />
                    <span>{isPt ? "A gravar confirmação..." : "Saving confirmation..."}</span>
                  </>
                ) : isAlreadyBooked ? (
                  candidate.testSlot === selectedSlot ? (
                    <>
                      <Check size={16} />
                      <span>{isPt ? "Data Confirmada" : "Slot Confirmed"}</span>
                    </>
                  ) : (
                    <>
                      <span>{isPt ? "Gravar Nova Data de Teste" : "Save New Test Date"}</span>
                      <ArrowRight size={16} />
                    </>
                  )
                ) : (
                  <>
                    <span>{isPt ? "Confirmar Minha Presença no Teste" : "Confirm My Test Attendance"}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>

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
                  className="inline-flex items-center gap-1 text-[0.7rem] text-cyan-400 hover:underline"
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
                  className="text-sky-400 hover:underline inline-flex items-center gap-1 font-medium"
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
