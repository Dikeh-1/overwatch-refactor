"use client";

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2, ShieldCheck, ArrowRight, XCircle } from "lucide-react";
import Logo from "@/components/ui/Logo";

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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<"yes" | "no">(initialChoice);
  const [submitting, setSubmitting] = useState(false);
  const [submittedChoice, setSubmittedChoice] = useState<"yes" | "no" | null>(null);

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
          if (data.candidate.response) {
            setSubmittedChoice(data.candidate.response as "yes" | "no");
          }
        } else {
          setError(data.error || "Este link já expirou ou não foi encontrado.");
        }
      } catch (err) {
        setError("Erro de conexão ao verificar o seu convite. Por favor tente novamente.");
      } finally {
        setLoading(false);
      }
    }

    verifyToken();
  }, [token]);

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
    } catch (err: any) {
      setError("Erro de comunicação com o servidor. Por favor tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080c14] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-slate-300 text-sm">
          <Loader2 size={28} className="animate-spin text-sky-400" />
          <span>A carregar a sua confirmação...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-8">
      <div className="max-w-xl w-full mx-auto my-auto">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Logo />
        </div>

        {/* Card */}
        <div className="bg-[#0d121f] border border-white/[0.08] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="text-center mb-6">
            <span className="text-[0.7rem] font-bold uppercase tracking-widest text-sky-400">
              Recrutamento CCO • Overwatch Mozambique
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">
              Confirmação – Processo de Selecção
            </h1>
            {candidateInfo && (
              <p className="text-xs text-slate-400 mt-1">
                Candidata: <strong className="text-white">{candidateInfo.name}</strong>
              </p>
            )}
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5 mb-6">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {submittedChoice ? (
            /* Thank you screen */
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                {submittedChoice === "yes" ? <CheckCircle2 size={32} /> : <XCircle size={32} className="text-slate-400" />}
              </div>

              {submittedChoice === "yes" ? (
                <>
                  <h2 className="text-lg font-bold text-white">
                    Confirmação Registada com Sucesso!
                  </h2>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
                    Obrigada pela sua confirmação e pelo interesse em continuar no processo de selecção da Overwatch.
                    Enviámos um email de confirmação para a sua caixa de correio. Entraremos em contacto brevemente com os próximos passos.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-bold text-white">
                    Resposta Registada
                  </h2>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
                    Agradecemos a sua resposta e a participação no processo de selecção da Overwatch.
                    Desejamos-lhe os maiores sucessos nas suas futuras oportunidades profissionais.
                  </p>
                </>
              )}

              <div className="pt-4 border-t border-white/[0.06] text-[0.7rem] text-slate-500">
                Data do registo: {new Date().toLocaleString("pt-MZ")}
              </div>
            </div>
          ) : (
            /* Confirmation Form */
            <div className="space-y-5">
              <p className="text-xs text-slate-300 leading-relaxed">
                Por favor confirme a sua intenção relativamente às condições previstas para a próxima etapa:
              </p>

              <div className="space-y-3">
                {/* YES Option */}
                <label
                  onClick={() => setSelectedChoice("yes")}
                  className={`block p-4 rounded-2xl border transition-all cursor-pointer ${
                    selectedChoice === "yes"
                      ? "bg-sky-500/10 border-sky-500/40 shadow-sm"
                      : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="choice"
                      checked={selectedChoice === "yes"}
                      onChange={() => setSelectedChoice("yes")}
                      className="mt-1 text-sky-500 focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-semibold text-white leading-snug">
                        Sim, tenho interesse em continuar no processo de selecção e estou disponível para cumprir as condições indicadas.
                      </div>
                      <div className="text-[0.7rem] text-slate-400 mt-1">
                        10 dias de formação inicial + 3 meses de formação prática (9.000 MZN/mês) em regime 2D/2N/2F.
                      </div>
                    </div>
                  </div>
                </label>

                {/* NO Option */}
                <label
                  onClick={() => setSelectedChoice("no")}
                  className={`block p-4 rounded-2xl border transition-all cursor-pointer ${
                    selectedChoice === "no"
                      ? "bg-slate-700/20 border-slate-500/40 shadow-sm"
                      : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="choice"
                      checked={selectedChoice === "no"}
                      onChange={() => setSelectedChoice("no")}
                      className="mt-1 text-slate-400 focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-200">
                        Não tenho interesse
                      </div>
                      <div className="text-[0.7rem] text-slate-400 mt-0.5">
                        Não poderei comparecer ou não estou disponível para as condições indicadas.
                      </div>
                    </div>
                  </div>
                </label>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleConfirmResponse}
                  disabled={submitting}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 text-black font-bold text-xs hover:opacity-95 transition-all shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>A registar resposta...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirmar resposta</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-[0.7rem] text-slate-500">
          Overwatch Mozambique • Departamento de Recrutamento & Seleção
        </div>
      </div>
    </div>
  );
}
