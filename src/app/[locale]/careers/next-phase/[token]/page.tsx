"use client";

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { formatCandidateName, formatSlotDisplay } from "@/lib/careers";
import {
  PortalShell,
  PortalHeading,
  Card,
  SectionTitle,
  PlainList,
  Notice,
  PrimaryButton,
  OptionRow,
  StatusTag,
} from "@/components/careers/portal/PortalShell";

/* ================================================================
   CANDIDATE RESPONSE / CONFIRMATION PAGE
   —————————————————————————————————————————
   Official Overwatch Mozambique recruitment confirmation page.
   Content is ALWAYS in PT-MZ regardless of locale.
   Business logic (token verify, POST response) is unchanged.
   ================================================================ */

export default function NextPhaseCandidatePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params?.token as string;
  const initialChoice = searchParams.get("choice") === "no" ? "no" : "yes";

  const [candidateInfo, setCandidateInfo] = useState<{
    name: string;
    email: string;
    role?: string;
    roleTitle?: string;
    isTechManager?: boolean;
    testScore?: number | null;
    respondedAt?: string | null;
    response?: string | null;
  } | null>(null);

  const [isPreview, setIsPreview] = useState(false);
  const [stageMismatchInfo, setStageMismatchInfo] = useState<{
    candidate: {
      id?: string;
      name: string;
      email: string;
      role?: string;
      roleTitle?: string;
      testSlot?: string | null;
      testScore?: number | null;
    };
    stage?: string;
    bookingUrl: string;
    checkStatusUrl: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<"yes" | "no">(initialChoice);
  const [submitting, setSubmitting] = useState(false);
  const [submittedChoice, setSubmittedChoice] = useState<"yes" | "no" | null>(null);

  /* ---- Token verification (unchanged logic) ---- */
  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setError("Link de confirmação inválido ou incompleto.");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/careers/next-phase/respond?token=${token}`);
        const data = await res.json();
        if (res.ok && data.valid) {
          setCandidateInfo(data.candidate);
          if (data.preview) setIsPreview(true);
          if (data.candidate.response) {
            setSubmittedChoice(data.candidate.response as "yes" | "no");
          }
        } else {
          setError(data.error || "Este link já expirou ou não foi encontrado.");
        }
      } catch {
        setError("Erro de conexão ao verificar o seu convite. Por favor tente novamente.");
      } finally {
        setLoading(false);
      }
    }
    verifyToken();
  }, [token]);

  /* ---- Submit response (unchanged logic) ---- */
  const handleConfirmResponse = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/careers/next-phase/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        token,
        choice: selectedChoice,
        responseOption: searchParams.get("responseOption") || searchParams.get("customAction") || undefined,
      }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSubmittedChoice(selectedChoice);
      } else {
        setError(data.error || "Não foi possível registar a sua resposta. Por favor tente novamente.");
      }
    } catch {
      setError("Erro de comunicação com o servidor. Por favor tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ================================================================
     RENDER — shared Overwatch candidate portal design
     ================================================================ */
  const isConfirmMode = Boolean(candidateInfo?.isTechManager) || searchParams.get("mode") === "confirm";

  if (loading) {
    return (
      <PortalShell isPt>
        <div className="flex min-h-[40vh] items-center justify-center gap-3 text-[15px] text-[#6b6f7b]">
          <Loader2 size={18} strokeWidth={1.75} className="animate-spin" />
          A verificar o seu convite…
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell isPt>
      {isPreview && (
        <p className="no-print mb-6 inline-block rounded-full border border-[#d4d6dc] px-3 py-1 text-[12px] font-medium text-[#4a4e5a]">
          Pré-visualização
        </p>
      )}

      {/* Stage mismatch: applicant opened a later-phase link while still at the testing stage */}
      {stageMismatchInfo && (
        <>
          <PortalHeading
            overline="Processo de recrutamento"
            title={`Olá, ${formatCandidateName(stageMismatchInfo.candidate.name)}`}
            meta={stageMismatchInfo.candidate.roleTitle || "Candidatura Overwatch"}
          />
          <p className="max-w-[580px] text-[16px] leading-relaxed text-[#4a4e5a]">
            Este link destina-se a uma fase posterior. A sua candidatura encontra-se, neste momento, na fase de
            marcação e realização do teste presencial.
          </p>
          <div className="mt-6">
            <Notice>
              {stageMismatchInfo.candidate.testSlot ? (
                <>
                  Teste marcado para{" "}
                  <strong className="font-semibold text-[#1a1a2e]">
                    {formatSlotDisplay(stageMismatchInfo.candidate.testSlot, true)}
                  </strong>
                  .
                </>
              ) : (
                "Ainda não escolheu a data do teste presencial. Use o botão abaixo para escolher."
              )}
            </Notice>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href={stageMismatchInfo.bookingUrl}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#1a1a2e] px-6 text-[15px] font-medium text-white hover:bg-[#2d2d44]"
            >
              {stageMismatchInfo.candidate.testSlot ? "Ver marcação" : "Escolher data do teste"}
              <ArrowRight size={17} strokeWidth={1.75} />
            </a>
            <a
              href={stageMismatchInfo.checkStatusUrl}
              className="inline-flex h-12 items-center justify-center rounded-lg border border-[#d4d6dc] px-6 text-[15px] font-medium hover:border-[#1a1a2e]"
            >
              Consultar estado
            </a>
          </div>
        </>
      )}

      {/* Invalid / expired token */}
      {error && !candidateInfo && !stageMismatchInfo && (
        <PortalHeading overline="Confirmação" title="Este link não é válido" meta={error} />
      )}

      {candidateInfo && (
        <>
          <PortalHeading
            overline={isConfirmMode ? "Convocatória e confirmação de presença" : "Confirmação · Processo de selecção"}
            title={formatCandidateName(candidateInfo.name)}
            meta={
              <span>
                {candidateInfo.roleTitle || "Recrutamento Overwatch"}
                {typeof candidateInfo.testScore === "number" && (
                  <span className="text-[#8a8e99]"> · Resultado do teste: {candidateInfo.testScore}%</span>
                )}
              </span>
            }
          />

          {submittedChoice ? (
            <Card className="px-6 py-7 sm:px-8">
              <StatusTag>{submittedChoice === "yes" ? "Resposta confirmada" : "Resposta registada"}</StatusTag>
              <p className="mt-4 max-w-[560px] text-[16px] leading-relaxed text-[#4a4e5a]">
                {submittedChoice === "yes"
                  ? "Agradecemos a sua confirmação. Enviámos um email para a sua caixa de correio e entraremos em contacto brevemente com os próximos passos."
                  : "Agradecemos a sua resposta e a sua participação no processo de selecção da Overwatch. Desejamos-lhe os maiores sucessos profissionais."}
              </p>
              <p className="mt-6 border-t border-[#e6e7eb] pt-4 text-[13px] text-[#8a8e99]">
                Registado em {new Date().toLocaleString("pt-MZ")}
              </p>
            </Card>
          ) : (
            <>
              <p className="mb-8 max-w-[580px] text-[16px] leading-relaxed text-[#4a4e5a]">
                Confirme, por favor, a sua intenção relativamente às condições da próxima etapa do processo de
                selecção.
              </p>

              <section className="mb-8">
                <SectionTitle>{candidateInfo.isTechManager ? "Próxima fase" : "Condições"}</SectionTitle>
                <Card className="px-5 py-5 sm:px-6">
                  {candidateInfo.isTechManager ? (
                    <PlainList
                      items={[
                        "Entrevista técnica presencial e sessão de avaliação nas instalações da Overwatch, em Maputo.",
                        "Documentação: CV impresso actualizado, Bilhete de Identidade (BI/DIRE) e certificados de habilitações e formações técnicas.",
                        "Enquadramento contratual alinhado com a experiência e as competências demonstradas.",
                      ]}
                    />
                  ) : (
                    <PlainList
                      items={[
                        "10 dias de formação inicial, sem remuneração",
                        "3 meses de formação prática, com remuneração mensal de 9.000 MZN",
                        "Regime de trabalho 2D / 2N / 2F (turnos de 12 horas)",
                      ]}
                    />
                  )}
                </Card>
              </section>

              <section>
                <SectionTitle>A sua resposta</SectionTitle>
                <div role="radiogroup" className="space-y-2">
                  <OptionRow
                    selected={selectedChoice === "yes"}
                    onSelect={() => setSelectedChoice("yes")}
                    title={
                      isConfirmMode
                        ? "Sim, confirmo a minha presença e disponibilidade"
                        : "Sim, tenho interesse e estou disponível"
                    }
                    subtitle={
                      isConfirmMode
                        ? "Estarei presente na próxima etapa."
                        : "Pretendo continuar no processo e aceito as condições indicadas."
                    }
                  />
                  <OptionRow
                    selected={selectedChoice === "no"}
                    onSelect={() => setSelectedChoice("no")}
                    title="Não tenho interesse"
                    subtitle="Pretendo terminar a minha participação no processo."
                  />
                </div>
              </section>

              <div className="mt-8">
                {error && (
                  <p role="alert" className="mb-3 text-[14px] text-[#b42318]">
                    {error}
                  </p>
                )}
                <PrimaryButton
                  type="button"
                  onClick={handleConfirmResponse}
                  disabled={submitting}
                  className="w-full sm:w-auto"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={17} strokeWidth={1.75} className="animate-spin" />
                      A registar…
                    </>
                  ) : (
                    <>
                      Confirmar resposta
                      <ArrowRight size={17} strokeWidth={1.75} />
                    </>
                  )}
                </PrimaryButton>
              </div>
            </>
          )}
        </>
      )}
    </PortalShell>
  );
}
