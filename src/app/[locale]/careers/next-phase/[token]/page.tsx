"use client";

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Check, Loader2, AlertCircle } from "lucide-react";

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
    respondedAt?: string | null;
    response?: string | null;
  } | null>(null);

  const [isPreview, setIsPreview] = useState(false);
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
        body: JSON.stringify({ token, choice: selectedChoice }),
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
     LOADING STATE
     ================================================================ */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F7F9] flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500 text-sm">
          <Loader2 size={20} className="animate-spin" />
          <span>A verificar...</span>
        </div>
      </div>
    );
  }

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div className="min-h-screen bg-[#F6F7F9] flex flex-col">

      {/* ---- HEADER: Dark navy bar ---- */}
      <header className="h-16 sm:h-[68px] bg-[#0b1329] flex items-center px-5 sm:px-8 shrink-0">
        <div className="flex items-center justify-between w-full max-w-[720px] mx-auto">
          <Image
            src="/logo.png"
            alt="Overwatch"
            width={140}
            height={21}
            className="h-5 w-auto brightness-0 invert"
            priority
          />
          <span className="text-[11px] font-medium tracking-wide text-white/60 uppercase">
            Recrutamento
          </span>
        </div>
      </header>

      {/* ---- Preview Mode indicator ---- */}
      {isPreview && (
        <div className="bg-amber-50 border-b border-amber-200 py-2 px-4 text-center">
          <span className="text-xs font-medium text-amber-700">Preview Mode</span>
        </div>
      )}

      {/* ---- MAIN CONTENT ---- */}
      <main className="flex-1 flex flex-col items-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-[680px]">

          {/* ---- Error-only state (invalid/expired token) ---- */}
          {error && !candidateInfo && (
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 sm:p-8">
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-1">Link inválido</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* ---- Main card ---- */}
          {candidateInfo && (
            <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">

              {/* Card header */}
              <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-5 border-b border-[#EAECF0]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400 mb-1">
                  Overwatch • Recrutamento CCO 2026
                </p>
                <h1 className="text-lg sm:text-xl font-bold text-[#0b1329] leading-snug">
                  Confirmação – Processo de Selecção
                </h1>
                <p className="text-sm text-slate-600 mt-2">
                  Candidata: <strong className="text-slate-900">{candidateInfo.name}</strong>
                </p>
              </div>

              {/* Card body */}
              <div className="px-6 sm:px-8 py-6 sm:py-8">

                {/* ============================================
                    SUBMITTED STATE
                    ============================================ */}
                {submittedChoice ? (
                  <div className="space-y-4">
                    {submittedChoice === "yes" ? (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                            <Check size={16} className="text-emerald-600" />
                          </div>
                          <h2 className="text-base font-semibold text-slate-900">
                            Resposta confirmada
                          </h2>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          Obrigada pela sua confirmação. Enviámos um email de confirmação
                          para a sua caixa de correio. Entraremos em contacto brevemente com
                          os próximos passos do processo de selecção.
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                            <Check size={16} className="text-slate-500" />
                          </div>
                          <h2 className="text-base font-semibold text-slate-900">
                            Resposta registada
                          </h2>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          Agradecemos a sua resposta e a participação no processo de selecção
                          da Overwatch. Desejamos-lhe os maiores sucessos nas suas futuras
                          oportunidades profissionais.
                        </p>
                      </>
                    )}
                    <p className="text-xs text-slate-400 pt-3 border-t border-[#EAECF0]">
                      Data do registo: {new Date().toLocaleString("pt-MZ")}
                    </p>
                  </div>
                ) : (
                  /* ============================================
                     CONFIRMATION FORM
                     ============================================ */
                  <div className="space-y-6">
                    <p className="text-sm text-slate-700 leading-relaxed">
                      Por favor confirme a sua intenção relativamente às condições previstas
                      para a próxima etapa do processo de selecção.
                    </p>

                    {/* ---- Conditions box ---- */}
                    <div className="bg-[#F9FAFB] border border-[#EAECF0] rounded-md p-5">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                        Condições
                      </p>
                      <ul className="space-y-2.5 text-sm text-slate-700 leading-relaxed">
                        <li className="flex gap-2">
                          <span className="text-slate-400 mt-0.5 shrink-0">•</span>
                          <span>
                            <strong>10 dias de formação inicial</strong>, sem remuneração
                          </span>
                        </li>
                        <li className="flex gap-2">
                          <span className="text-slate-400 mt-0.5 shrink-0">•</span>
                          <span>
                            <strong>3 meses de formação prática</strong> com remuneração mensal
                            de <strong>9.000 MZN</strong>
                          </span>
                        </li>
                        <li className="flex gap-2">
                          <span className="text-slate-400 mt-0.5 shrink-0">•</span>
                          <span>
                            Regime de trabalho: <strong>2D / 2N / 2F</strong> (12 horas por turno)
                          </span>
                        </li>
                      </ul>
                    </div>

                    {/* ---- YES / NO selection rows ---- */}
                    <div className="space-y-2">
                      {/* YES row */}
                      <label
                        className={`flex items-center gap-3 h-[60px] px-4 rounded-md border cursor-pointer transition-colors ${
                          selectedChoice === "yes"
                            ? "border-[#0b1329] bg-[#F0F4FF]"
                            : "border-[#E5E7EB] bg-white hover:bg-slate-50"
                        }`}
                        onClick={() => setSelectedChoice("yes")}
                      >
                        <input
                          type="radio"
                          name="choice"
                          checked={selectedChoice === "yes"}
                          onChange={() => setSelectedChoice("yes")}
                          className="w-4 h-4 text-[#0b1329] border-slate-300 focus:ring-[#0b1329] focus:ring-offset-0 cursor-pointer shrink-0"
                        />
                        <span className="text-sm text-slate-800 leading-snug">
                          Sim, tenho interesse em continuar no processo de selecção e estou disponível para cumprir as condições indicadas.
                        </span>
                      </label>

                      {/* NO row */}
                      <label
                        className={`flex items-center gap-3 h-[60px] px-4 rounded-md border cursor-pointer transition-colors ${
                          selectedChoice === "no"
                            ? "border-[#0b1329] bg-[#F0F4FF]"
                            : "border-[#E5E7EB] bg-white hover:bg-slate-50"
                        }`}
                        onClick={() => setSelectedChoice("no")}
                      >
                        <input
                          type="radio"
                          name="choice"
                          checked={selectedChoice === "no"}
                          onChange={() => setSelectedChoice("no")}
                          className="w-4 h-4 text-[#0b1329] border-slate-300 focus:ring-[#0b1329] focus:ring-offset-0 cursor-pointer shrink-0"
                        />
                        <span className="text-sm text-slate-800">
                          Não tenho interesse
                        </span>
                      </label>
                    </div>

                    {/* ---- Inline error ---- */}
                    {error && (
                      <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 border border-red-200">
                        <AlertCircle size={15} className="text-red-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-red-700">{error}</p>
                      </div>
                    )}

                    {/* ---- Confirm button ---- */}
                    <button
                      type="button"
                      onClick={handleConfirmResponse}
                      disabled={submitting}
                      className="w-full h-12 rounded-md bg-[#0b1329] text-white text-sm font-semibold hover:bg-[#111b3a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>A registar resposta...</span>
                        </>
                      ) : (
                        <span>Confirmar resposta</span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ---- FOOTER ---- */}
      <footer className="py-6 text-center shrink-0">
        <p className="text-xs text-slate-400">
          Overwatch Mozambique · Recrutamento e Selecção
        </p>
      </footer>
    </div>
  );
}
