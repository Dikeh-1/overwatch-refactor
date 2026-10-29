"use client";

import React, { useState, useEffect } from "react";
import { ArrowRight, Printer, Loader2 } from "lucide-react";
import { formatCandidateName } from "@/lib/careers";
import { siteContact } from "@/lib/site-config";
import {
  PortalShell,
  PortalHeading,
  Card,
  SectionTitle,
  Field,
  PlainList,
  PrimaryButton,
  SecondaryButton,
  OptionRow,
  StatusTag,
} from "@/components/careers/portal/PortalShell";

interface TrainingGroup {
  id: string;
  name: string;
  schedule: string;
  timeRange: string;
  evaluationTime: string;
  capacity: number;
  bookedCount: number;
  availableSlots: number;
  isFull: boolean;
  isExpired?: boolean;
  enabled: boolean;
  isSelectedByCandidate: boolean;
}

interface CandidateTrainingData {
  id: string;
  name: string;
  email: string;
  role: string;
  roleTitle?: { pt: string; en: string } | string;
  trainingGroupId?: string | null;
  trainingGroup?: string | null;
  trainingBookedAt?: string | null;
}

export default function CandidateTrainingClient({
  candidateId,
  locale = "pt",
}: {
  candidateId: string;
  locale: string;
}) {
  const isPt = locale !== "en";
  const t = (pt: string, en: string) => (isPt ? pt : en);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<CandidateTrainingData | null>(null);
  const [groups, setGroups] = useState<TrainingGroup[]>([]);
  const [trainingTitle, setTrainingTitle] = useState("");
  const [location, setLocation] = useState("Av Paulo Samuel Khankhomba 1948");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/careers/training-booking?candidateId=${encodeURIComponent(candidateId)}`);
        const data = await res.json();

        if (!res.ok || data.error) {
          setError(data.error || t("Não foi possível carregar os dados da formação.", "Could not load training details."));
          return;
        }

        setCandidate(data.candidate);
        setGroups(data.groups || []);
        if (data.title) setTrainingTitle(data.title);
        if (data.location) setLocation(data.location);

        if (data.candidate?.trainingGroupId) {
          setSelectedGroupId(data.candidate.trainingGroupId);
          setSubmitSuccess(true);
        } else {
          // Pre-select first available group
          const firstAvailable = (data.groups || []).find((g: TrainingGroup) => !g.isFull && g.enabled);
          if (firstAvailable) setSelectedGroupId(firstAvailable.id);
        }
      } catch (err) {
        console.error("Error loading training data:", err);
        setError(t("Erro de ligação. Recarregue a página.", "Connection error. Please reload the page."));
      } finally {
        setLoading(false);
      }
    }

    if (candidateId) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateId]);

  const handleConfirmBooking = async () => {
    if (!selectedGroupId || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/careers/training-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, groupId: selectedGroupId }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || t("Não foi possível concluir a inscrição.", "Could not complete your registration."));
        if (data.isFull) {
          const refreshRes = await fetch(`/api/careers/training-booking?candidateId=${encodeURIComponent(candidateId)}`);
          const refreshData = await refreshRes.json();
          if (refreshData.groups) setGroups(refreshData.groups);
        }
        return;
      }

      setCandidate((prev) => (prev ? { ...prev, ...data.candidate } : data.candidate));
      setSubmitSuccess(true);
    } catch (err) {
      console.error("Error submitting booking:", err);
      setError(t("Erro de rede. Tente novamente.", "Network error. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedGroup = groups.find((g) => g.id === (candidate?.trainingGroupId || selectedGroupId));
  const name = formatCandidateName(candidate?.name);
  const isTechManager = Boolean(candidate?.role && candidate.role.includes("technical_manager"));
  const roleTitle =
    (typeof candidate?.roleTitle === "string"
      ? candidate.roleTitle
      : candidate?.roleTitle?.[isPt ? "pt" : "en"]) ||
    (isTechManager
      ? t("Gestor Técnico e Instalação de CCTV", "CCTV Installation & Technical Manager")
      : t("Operador(a) do Centro de Controlo (CCO)", "Control Centre Operator (CCO)"));
  const ref = candidate?.id ? candidate.id.slice(0, 8).toUpperCase() : "";
  const title =
    trainingTitle || "Formação em Consciência Situacional e Identificação de Ameaças através de CCTV";

  const bring = [
    t("Documento de identificação válido (BI ou passaporte)", "Valid ID (ID card or passport)"),
    t("Cópia do documento, caso ainda não a tenha entregue", "A copy of your ID, if not yet submitted"),
    t("Caneta e bloco de notas", "Pen and notebook"),
  ];

  if (loading) {
    return (
      <PortalShell isPt={isPt}>
        <div className="flex min-h-[40vh] items-center justify-center gap-3 text-[15px] text-[#6b6f7b]">
          <Loader2 size={18} strokeWidth={1.75} className="animate-spin" />
          {t("A carregar…", "Loading…")}
        </div>
      </PortalShell>
    );
  }

  if (error && !candidate) {
    return (
      <PortalShell isPt={isPt}>
        <PortalHeading
          overline={t("Formação", "Training")}
          title={t("Não encontrámos este convite", "We couldn't find this invitation")}
          meta={error}
        />
        <a href={`mailto:${siteContact.email}`} className="text-[15px] font-medium underline underline-offset-4">
          {siteContact.email}
        </a>
      </PortalShell>
    );
  }

  return (
    <PortalShell isPt={isPt}>
      <PortalHeading
        overline={t("2.ª fase · Formação e avaliação prática", "Phase 2 · Training and practical assessment")}
        title={name || title}
        meta={
          <span>
            {roleTitle}
            {ref && <span className="text-[#8a8e99]"> · Ref. {ref}</span>}
          </span>
        }
      />

      {submitSuccess && candidate?.trainingGroup ? (
        <>
          <Card className="print-slip overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b border-[#e6e7eb] px-6 py-4 sm:px-8">
              <p className="text-[14px] font-semibold">{t("Comprovativo de inscrição", "Registration confirmation")}</p>
              <StatusTag>{t("Confirmado", "Confirmed")}</StatusTag>
            </div>

            <div className="px-6 py-7 sm:px-8">
              <p className="text-[14px] text-[#6b6f7b]">{title}</p>
              <p className="mt-2 text-[22px] font-semibold leading-snug tracking-[-0.01em] sm:text-[24px]">
                {candidate.trainingGroup}
              </p>
              <p className="mt-1 text-[16px] text-[#4a4e5a]">
                {selectedGroup?.schedule || t("2, 3 e 4 de Novembro de 2026", "2, 3 and 4 November 2026")}
                {selectedGroup?.timeRange ? ` · ${selectedGroup.timeRange}` : ""}
              </p>
              {selectedGroup?.evaluationTime && (
                <p className="mt-1 text-[14px] text-[#6b6f7b]">
                  {t("Avaliação prática: 5 de Novembro, ", "Practical assessment: 5 November, ")}
                  {selectedGroup.evaluationTime}
                </p>
              )}

              <dl className="mt-7 grid gap-6 border-t border-[#e6e7eb] pt-6 sm:grid-cols-2">
                <Field label={t("Participante", "Participant")}>{name}</Field>
                <Field label={t("Função", "Position")}>{roleTitle}</Field>
                <Field label={t("Local", "Venue")}>
                  Overwatch Moçambique
                  <br />
                  <span className="text-[#4a4e5a]">{location}</span>
                </Field>
                <Field label={t("Chegada", "Arrival")}>{t("15 minutos antes do início", "15 minutes before the start")}</Field>
              </dl>

              <div className="mt-7 border-t border-[#e6e7eb] pt-6">
                <p className="mb-3 text-[12px] font-medium uppercase tracking-[0.06em] text-[#8a8e99]">
                  {t("Traga consigo", "Please bring")}
                </p>
                <PlainList items={bring} />
                <p className="mt-3 text-[14px] text-[#6b6f7b]">
                  {t(
                    "Não precisa de computador — o material prático é fornecido pela Overwatch.",
                    "No computer needed — practical materials are provided by Overwatch.",
                  )}
                </p>
              </div>

              <div className="mt-7 border-t border-[#e6e7eb] pt-6">
                <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.06em] text-[#8a8e99]">
                  {t("Entrada", "Entry")}
                </p>
                <p className="text-[15px] leading-relaxed text-[#4a4e5a]">
                  {t(
                    "Apresente o seu documento de identificação na recepção. O seu nome consta da lista — não precisa de código QR.",
                    "Show your ID at reception. Your name is on the list — no QR code is needed.",
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[#e6e7eb] bg-[#fafafb] px-6 py-3 text-[12px] text-[#8a8e99] sm:px-8">
              <span>
                {t("Confirmado em ", "Confirmed on ")}
                {new Date(candidate.trainingBookedAt || Date.now()).toLocaleDateString("pt-MZ")}
              </span>
              <span>Overwatch Moçambique, Lda.</span>
            </div>
          </Card>

          <div className="no-print mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[14px] text-[#6b6f7b]">
              {t("A sua vaga está reservada. Deve frequentar os três dias no mesmo grupo.", "Your place is reserved. Please attend all three days in the same group.")}
            </p>
            <SecondaryButton type="button" onClick={() => window.print()}>
              <Printer size={16} strokeWidth={1.75} />
              {t("Imprimir ou guardar PDF", "Print or save PDF")}
            </SecondaryButton>
          </div>
        </>
      ) : (
        <>
          <p className="mb-8 max-w-[580px] text-[16px] leading-relaxed text-[#4a4e5a]">
            {t(
              `Na sequência da sua aprovação no teste de selecção, foi convocado(a) para a formação «${title}». A formação decorre durante 3 dias consecutivos (2, 3 e 4 de Novembro), 4 horas por dia, com avaliação prática individual na quinta-feira, 5 de Novembro. Os três dias devem ser frequentados no mesmo grupo.`,
              `Following your approval in the selection test, you have been invited to the training “${title}”. It runs over 3 consecutive days (2, 3 and 4 November), 4 hours per day, with an individual practical assessment on Thursday, 5 November. All three days must be attended in the same group.`,
            )}
          </p>

          <section>
            <SectionTitle>{t("Escolha o seu grupo", "Choose your group")}</SectionTitle>
            <div role="radiogroup" className="space-y-2">
              {groups.map((g) => {
                const disabled = g.isFull || !g.enabled;
                return (
                  <OptionRow
                    key={g.id}
                    selected={!disabled && selectedGroupId === g.id}
                    disabled={disabled}
                    onSelect={() => setSelectedGroupId(g.id)}
                    title={g.name}
                    subtitle={
                      <>
                        {t("2, 3 e 4 de Novembro", "2, 3 and 4 November")} · {g.timeRange}
                        {g.evaluationTime && (
                          <>
                            <br />
                            {t("Avaliação: 5 de Novembro, ", "Assessment: 5 November, ")}
                            {g.evaluationTime}
                          </>
                        )}
                      </>
                    }
                    aside={
                      g.isExpired
                        ? t("Encerrado", "Closed")
                        : g.isFull
                          ? t("Completo", "Full")
                          : t(`${g.availableSlots} vagas`, `${g.availableSlots} places`)
                    }
                  />
                );
              })}
            </div>
          </section>

          <dl className="mt-10 grid gap-6 border-t border-[#e6e7eb] pt-8 sm:grid-cols-2">
            <Field label={t("Local", "Venue")}>
              Overwatch Moçambique
              <br />
              <span className="text-[#4a4e5a]">{location}</span>
            </Field>
            <Field label={t("Chegada", "Arrival")}>{t("15 minutos antes de cada sessão", "15 minutes before each session")}</Field>
            <div className="sm:col-span-2">
              <Field label={t("Traga consigo", "Please bring")}>
                <div className="mt-1">
                  <PlainList items={bring} />
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
              disabled={submitting || !selectedGroupId}
              onClick={handleConfirmBooking}
              className="w-full sm:w-auto"
            >
              {submitting ? (
                <>
                  <Loader2 size={17} strokeWidth={1.75} className="animate-spin" />
                  {t("A confirmar…", "Confirming…")}
                </>
              ) : (
                <>
                  {t("Confirmar inscrição", "Confirm registration")}
                  {selectedGroup ? ` · ${selectedGroup.name}` : ""}
                  <ArrowRight size={17} strokeWidth={1.75} />
                </>
              )}
            </PrimaryButton>
            <p className="mt-3 text-[13px] text-[#8a8e99]">
              {t(
                "Ao confirmar, a vaga fica reservada e recebe a confirmação por email.",
                "Once confirmed, your place is reserved and you will receive an email confirmation.",
              )}
            </p>
          </div>
        </>
      )}
    </PortalShell>
  );
}
