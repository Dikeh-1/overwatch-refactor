"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Printer, Loader2 } from "lucide-react";
import { siteContact } from "@/lib/site-config";
import { formatSlotDisplay, formatCandidateName, isPastDateSlot, isSlotBookingExpired } from "@/lib/careers";
import { openOverwatchChatbot } from "@/components/layout/ZohoChatbot";
import {
  PortalShell,
  PortalHeading,
  Card,
  SectionTitle,
  Field,
  PlainList,
  Notice,
  PrimaryButton,
  SecondaryButton,
  OptionRow,
  StatusTag,
  splitSlot,
} from "@/components/careers/portal/PortalShell";

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

function SupportBlock({ isPt, supportEmail }: { isPt: boolean; supportEmail: string }) {
  return (
    <div className="no-print mt-10 border-t border-[#e6e7eb] pt-8">
      <SectionTitle>{isPt ? "Precisa de ajuda?" : "Need help?"}</SectionTitle>
      <p className="max-w-[560px] text-[15px] leading-relaxed text-[#4a4e5a]">
        {isPt
          ? "Fale com a nossa equipa de Recursos Humanos através do chat do site (opção «Falar com um agente») ou por email. Respondemos no mesmo dia útil."
          : "Talk to our HR team through the website chat (choose “Speak with an agent”) or by email. We reply within the same business day."}
      </p>
      <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
        <SecondaryButton type="button" onClick={() => openOverwatchChatbot()}>
          {isPt ? "Abrir chat" : "Open chat"}
        </SecondaryButton>
        <a
          href={`mailto:${supportEmail}`}
          className="inline-flex h-11 items-center justify-center rounded-lg px-2 text-[14px] font-medium text-[#1a1a2e] underline decoration-[#b8bbc3] underline-offset-4 hover:decoration-[#1a1a2e]"
        >
          {supportEmail}
        </a>
      </div>
    </div>
  );
}

export default function CandidateBookingClient({ id, locale }: { id: string; locale: string }) {
  const cleanId = (id || "").trim().replace(/\/+$/, "").replace(/[\s.…]+$/, "");
  // The URL locale (/pt/ or /en/) is the single source of truth. Default is strictly Portuguese (pt).
  const isPt = locale !== "en";

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
        const res = await fetch(`/api/careers/test-booking?id=${encodeURIComponent(cleanId)}&t=${Date.now()}`, {
          cache: "no-store",
        });

        if (res.status === 410) {
          if (!cancelled) setIsDeactivated(true);
          return;
        }

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            data.error ||
              (isPt ? "Não foi possível carregar os detalhes da convocatória." : "Could not load invitation details."),
          );
        }
        const data: CandidateData = await res.json();
        if (!cancelled) {
          setCandidate(data);
          setSelectedSlot((currentSelected) => {
            if (data.testSlot) return data.testSlot;
            if (data.slots && data.slots.length > 0) {
              if (currentSelected && data.slots.includes(currentSelected)) {
                if (!data.slotStats?.[currentSelected]?.isFull) return currentSelected;
                if (silent) {
                  setLiveSlotTakenNotice(
                    isPt
                      ? `O horário de ${formatSlotDisplay(currentSelected, true)} acabou de ficar completo. Seleccionámos o próximo horário disponível.`
                      : `${formatSlotDisplay(currentSelected, false)} has just filled up. We selected the next available time.`,
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
        if (!cancelled && !silent) setError((err as Error).message);
      } finally {
        if (!cancelled && !silent) setLoading(false);
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
      if (
        cleanId &&
        !cancelled &&
        typeof document !== "undefined" &&
        !document.hidden &&
        Date.now() - lastFetchedTime > 20000
      ) {
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
      setError(isPt ? "Seleccione uma data disponível." : "Please select an available date.");
      return;
    }
    if (candidate?.slotStats?.[selectedSlot]?.isFull) {
      setError(isPt ? "Este horário já está completo. Escolha outro." : "This time is full. Please choose another.");
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
          setCandidate((prev) => (prev ? { ...prev, testSlot: data.testSlot || prev.testSlot || selectedSlot } : null));
          setError("");
          return;
        }
        if (res.status === 409 && data.code === "SLOT_FULL") {
          const refreshed = await fetch(`/api/careers/test-booking?id=${encodeURIComponent(id)}&t=${Date.now()}`, {
            cache: "no-store",
          })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null);
          if (refreshed) {
            setCandidate(refreshed);
            const nextOpen = (refreshed.slots || []).find((s: string) => !refreshed.slotStats?.[s]?.isFull);
            setSelectedSlot(nextOpen || "");
          }
        }
        throw new Error(data.error || (isPt ? "Não foi possível confirmar a data." : "Failed to confirm the date."));
      }

      try {
        if (typeof BroadcastChannel !== "undefined") {
          const bc = new BroadcastChannel("overwatch_test_booking_live");
          bc.postMessage({ slot: selectedSlot, ts: Date.now() });
          bc.close();
        }
      } catch {}

      setCandidate((prev) =>
        prev ? { ...prev, testSlot: selectedSlot, testBookedAt: data.testBookedAt || new Date().toISOString() } : null,
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

  const roleTitle = isPt
    ? candidate?.roleTitle?.pt || (isTechManager ? "Gestor Técnico e Instalação de CCTV" : "Operador(a) de CCO")
    : candidate?.roleTitle?.en || (isTechManager ? "CCTV Installation & Technical Manager" : "CCTV Operator");

  const durationText = isPt
    ? candidate?.durationText?.pt ||
      (isTechManager ? "Cerca de 90 minutos. Chegue 15 minutos antes." : "Das 10h00 às 11h30. Chegue às 09h30.")
    : candidate?.durationText?.en ||
      (isTechManager ? "About 90 minutes. Arrive 15 minutes early." : "10:00 to 11:30. Arrive at 09:30.");

  const landmark = isPt
    ? candidate?.venueLandmark?.pt ||
      "Casa cor-de-laranja com portão preto, antes do cruzamento com a Av. Filipe Samuel Magaia"
    : candidate?.venueLandmark?.en ||
      "Orange house with a black gate, before the junction with Av. Filipe Samuel Magaia";

  const whatToBring = isPt
    ? candidate?.whatToBring?.pt ||
      (isTechManager
        ? ["Documento de identificação (BI ou passaporte)", "Caneta", "Lápis e borracha, se desejar", "Calculadora simples, opcional"]
        : ["Documento de identificação original (BI ou passaporte)", "Caneta azul ou preta", "Chegada até às 09h30 — o portão fecha às 09h50"])
    : candidate?.whatToBring?.en ||
      (isTechManager
        ? ["Identification document (ID or passport)", "Pen", "Pencil and eraser, if you wish", "Simple calculator, optional"]
        : ["Original photo ID (ID or passport)", "Blue or black pen", "Arrive by 09:30 — the gate closes at 09:50"]);

  const supportEmail = candidate?.supportEmail || siteContact.email || "info@overwatchmoz.com";
  const ref = candidate?.id ? candidate.id.slice(0, 8).toUpperCase() : "";
  const name = formatCandidateName(candidate?.name);
  const address = isPt ? siteContact.address.pt : siteContact.address.en;

  return (
    <PortalShell isPt={isPt}>
      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center gap-3 text-[15px] text-[#6b6f7b]">
          <Loader2 size={18} strokeWidth={1.75} className="animate-spin" />
          {isPt ? "A carregar a sua convocatória…" : "Loading your invitation…"}
        </div>
      ) : isDeactivated ? (
        <>
          <PortalHeading
            overline={isPt ? "Convocatória" : "Invitation"}
            title={isPt ? "Este link já não está activo" : "This link is no longer active"}
            meta={
              isPt
                ? "O link foi encerrado ou substituído pelos Recursos Humanos. Se acha que se trata de um erro, contacte-nos."
                : "The link was closed or replaced by Human Resources. If you think this is a mistake, please contact us."
            }
          />
          <SupportBlock isPt={isPt} supportEmail={supportEmail} />
        </>
      ) : error && !candidate ? (
        <>
          <PortalHeading
            overline={isPt ? "Convocatória" : "Invitation"}
            title={isPt ? "Não encontrámos esta convocatória" : "We couldn't find this invitation"}
            meta={error}
          />
          <SupportBlock isPt={isPt} supportEmail={supportEmail} />
        </>
      ) : candidate ? (
        <>
          <PortalHeading
            overline={
              candidate.rebookingGraceActive
                ? isPt ? "Reagendamento autorizado" : "Rebooking authorised"
                : isPt ? "Teste presencial" : "In-person assessment"
            }
            title={name}
            meta={
              <span>
                {roleTitle}
                {ref && <span className="text-[#8a8e99]"> · Ref. {ref}</span>}
              </span>
            }
          />

          {candidate.isNextPhase && (
            <div className="no-print mb-6">
              <Notice
                title={isPt ? "Passou para a fase seguinte" : "You have moved to the next phase"}
                action={
                  <a
                    href={`/${locale}/careers/next-phase/${encodeURIComponent(candidate.nextPhaseToken || candidate.id)}`}
                    className="inline-flex items-center gap-1.5 text-[14px] font-medium underline underline-offset-4"
                  >
                    {isPt ? "Ir para a fase seguinte" : "Go to the next phase"}
                    <ArrowRight size={15} strokeWidth={1.75} />
                  </a>
                }
              >
                {isPt
                  ? "Já concluiu o teste. Confirme a sua disponibilidade para a próxima etapa."
                  : "You have completed the test. Please confirm your availability for the next stage."}
              </Notice>
            </div>
          )}

          {isAlreadyBooked ? (
            /* ── Booked: single printable slip ── */
            <>
              <Card className="print-slip overflow-hidden">
                <div className="flex items-center justify-between gap-4 border-b border-[#e6e7eb] px-6 py-4 sm:px-8">
                  <p className="text-[14px] font-semibold">{isPt ? "Comprovativo de agendamento" : "Booking confirmation"}</p>
                  <StatusTag>
                    {candidate.attendedAt ? (isPt ? "Presença registada" : "Checked in") : isPt ? "Confirmado" : "Confirmed"}
                  </StatusTag>
                </div>

                <div className="px-6 py-7 sm:px-8">
                  {(() => {
                    const s = splitSlot(candidate.testSlot, isPt);
                    return (
                      <div>
                        <p className="text-[22px] font-semibold leading-snug tracking-[-0.01em] sm:text-[24px]">{s.date}</p>
                        {s.time && <p className="mt-1 text-[16px] text-[#4a4e5a]">{s.time}</p>}
                        <p className="mt-3 text-[14px] text-[#6b6f7b]">{durationText}</p>
                      </div>
                    );
                  })()}

                  <dl className="mt-7 grid gap-6 border-t border-[#e6e7eb] pt-6 sm:grid-cols-2">
                    <Field label={isPt ? "Candidato(a)" : "Candidate"}>{name}</Field>
                    <Field label={isPt ? "Função" : "Position"}>{roleTitle}</Field>
                    <Field label={isPt ? "Local" : "Venue"}>
                      Overwatch Moçambique
                      <br />
                      <span className="text-[#4a4e5a]">{address}</span>
                      <br />
                      <span className="text-[14px] text-[#6b6f7b]">{landmark}</span>
                    </Field>
                    <Field label={isPt ? "Referência" : "Reference"}>
                      <span className="tabular-nums">{ref}</span>
                    </Field>
                  </dl>

                  <div className="mt-7 border-t border-[#e6e7eb] pt-6">
                    <p className="mb-3 text-[12px] font-medium uppercase tracking-[0.06em] text-[#8a8e99]">
                      {isPt ? "Traga consigo" : "Please bring"}
                    </p>
                    <PlainList items={whatToBring} />
                  </div>

                  <div className="mt-7 border-t border-[#e6e7eb] pt-6">
                    <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.06em] text-[#8a8e99]">
                      {isPt ? "Entrada" : "Entry"}
                    </p>
                    <p className="text-[15px] leading-relaxed text-[#4a4e5a]">
                      {isPt
                        ? "Apresente o seu documento de identificação na recepção. O seu nome consta da lista de convocados — não precisa de código QR."
                        : "Show your ID at reception. Your name is on the attendee list — no QR code is needed."}
                    </p>
                    {candidate.attendedAt && (
                      <p className="mt-2 text-[14px] text-[#1a1a2e]">
                        {isPt ? "Entrada registada às " : "Checked in at "}
                        {new Date(candidate.attendedAt).toLocaleTimeString("pt-MZ", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Africa/Maputo",
                        })}
                        .
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[#e6e7eb] bg-[#fafafb] px-6 py-3 text-[12px] text-[#8a8e99] sm:px-8">
                  <span>Overwatch Moçambique, Lda.</span>
                  <span>{siteContact.website}</span>
                </div>
              </Card>

              <div className="no-print mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[14px] text-[#6b6f7b]">
                  {isPt ? "A sua vaga está garantida. Não precisa de fazer mais nada." : "Your place is secured. No further action is needed."}
                </p>
                <SecondaryButton type="button" onClick={() => window.print()}>
                  <Printer size={16} strokeWidth={1.75} />
                  {isPt ? "Imprimir ou guardar PDF" : "Print or save PDF"}
                </SecondaryButton>
              </div>

              <SupportBlock isPt={isPt} supportEmail={supportEmail} />
            </>
          ) : (
            /* ── Not booked yet: choose a date ── */
            <>
              <p className="mb-8 max-w-[580px] text-[16px] leading-relaxed text-[#4a4e5a]">
                {candidate.rebookingGraceActive
                  ? isPt
                    ? "Os Recursos Humanos autorizaram a escolha de uma nova data. Seleccione um dos horários disponíveis abaixo — após confirmar, a marcação é definitiva."
                    : "Human Resources has authorised you to choose a new date. Select one of the available times below — once confirmed, the booking is final."
                  : isPt
                    ? "Foi seleccionado(a) para o teste presencial. Escolha a data que lhe for mais conveniente. Só é possível fazer uma marcação."
                    : "You have been selected for the in-person assessment. Choose the date that suits you best. Only one booking is possible."}
              </p>

              {candidate.rebookingGraceActive && candidate.previousTestSlot && (
                <p className="-mt-5 mb-8 text-[14px] text-[#8a8e99]">
                  {isPt ? "Data anterior: " : "Previous date: "}
                  <span className="line-through">{formatSlotDisplay(candidate.previousTestSlot, isPt)}</span>
                </p>
              )}

              <section>
                <SectionTitle>{isPt ? "Escolha a data" : "Choose a date"}</SectionTitle>

                {liveSlotTakenNotice && (
                  <div className="mb-3">
                    <Notice>
                      <div className="flex items-start justify-between gap-3">
                        <span>{liveSlotTakenNotice}</span>
                        <button
                          type="button"
                          onClick={() => setLiveSlotTakenNotice("")}
                          className="shrink-0 text-[13px] font-medium text-[#1a1a2e] underline underline-offset-2"
                        >
                          {isPt ? "Fechar" : "Dismiss"}
                        </button>
                      </div>
                    </Notice>
                  </div>
                )}

                <div role="radiogroup" className="space-y-2">
                  {slotsList.length === 0 && (
                    <Card className="px-5 py-6 text-[15px] text-[#6b6f7b]">
                      {isPt
                        ? "De momento não há horários disponíveis. Volte a consultar esta página em breve."
                        : "There are no times available right now. Please check this page again shortly."}
                    </Card>
                  )}
                  {slotsList.map((slot) => {
                    const stat = candidate.slotStats?.[slot];
                    const expired = isSlotBookingExpired(slot);
                    const past = Boolean(stat?.isPast) || isPastDateSlot(slot) || expired;
                    const full = Boolean(stat?.isFull) || past;
                    const remaining = stat ? Math.max(0, stat.remaining) : undefined;
                    const s = splitSlot(slot, isPt);
                    const aside = full
                      ? past
                        ? isPt ? "Encerrado" : "Closed"
                        : isPt ? "Completo" : "Full"
                      : remaining !== undefined
                        ? remaining <= 3
                          ? isPt ? `Restam ${remaining}` : `${remaining} left`
                          : isPt ? `${remaining} vagas` : `${remaining} places`
                        : undefined;
                    return (
                      <OptionRow
                        key={slot}
                        selected={!full && selectedSlot === slot}
                        disabled={full}
                        onSelect={() => setSelectedSlot(slot)}
                        title={s.date}
                        subtitle={s.time}
                        aside={aside}
                      />
                    );
                  })}
                </div>
              </section>

              <dl className="mt-10 grid gap-6 border-t border-[#e6e7eb] pt-8 sm:grid-cols-2">
                <Field label={isPt ? "Local" : "Venue"}>
                  Overwatch Moçambique
                  <br />
                  <span className="text-[#4a4e5a]">{address}</span>
                  <br />
                  <span className="text-[14px] text-[#6b6f7b]">{landmark}</span>
                </Field>
                <Field label={isPt ? "Duração" : "Duration"}>{durationText}</Field>
                <div className="sm:col-span-2">
                  <Field label={isPt ? "Traga consigo" : "Please bring"}>
                    <div className="mt-1">
                      <PlainList items={whatToBring} />
                    </div>
                  </Field>
                </div>
              </dl>

              <div className="mt-10">
                {error && (
                  <p role="alert" className="mb-3 text-[14px] text-[#b42318]">
                    {error}
                  </p>
                )}
                <PrimaryButton
                  type="button"
                  onClick={handleConfirmSlot}
                  disabled={submitting || !selectedSlot || Boolean(candidate.slotStats?.[selectedSlot]?.isFull)}
                  className="w-full sm:w-auto"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={17} strokeWidth={1.75} className="animate-spin" />
                      {isPt ? "A confirmar…" : "Confirming…"}
                    </>
                  ) : (
                    <>
                      {isPt ? "Confirmar data" : "Confirm date"}
                      <ArrowRight size={17} strokeWidth={1.75} />
                    </>
                  )}
                </PrimaryButton>
                <p className="mt-3 text-[13px] text-[#8a8e99]">
                  {isPt
                    ? "Ao confirmar, recebe um email com os detalhes. A marcação não pode ser alterada depois."
                    : "Once confirmed, you will receive an email with the details. The booking cannot be changed afterwards."}
                </p>
              </div>

              <SupportBlock isPt={isPt} supportEmail={supportEmail} />
            </>
          )}
        </>
      ) : null}
    </PortalShell>
  );
}
