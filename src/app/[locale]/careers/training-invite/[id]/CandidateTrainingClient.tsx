"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  ChevronRight,
  ShieldCheck,
  Info,
  Check,
  RefreshCw,
} from "lucide-react";
import OverwatchOrbitLoader from "@/components/ui/OverwatchOrbitLoader";
import { formatCandidateName } from "@/lib/careers";

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
  roleTitle?: { pt: string; en: string };
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
          setError(data.error || "Não foi possível carregar os dados de inscrição na formação.");
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
      } catch (err: any) {
        console.error("Error loading training data:", err);
        setError("Erro de ligação ao servidor. Por favor recarregue a página.");
      } finally {
        setLoading(false);
      }
    }

    if (candidateId) {
      loadData();
    }
  }, [candidateId]);

  const handleConfirmBooking = async () => {
    if (!selectedGroupId || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/careers/training-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId,
          groupId: selectedGroupId,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Ocorreu um erro ao submeter a sua inscrição.");
        if (data.isFull) {
          const refreshRes = await fetch(`/api/careers/training-booking?candidateId=${encodeURIComponent(candidateId)}`);
          const refreshData = await refreshRes.json();
          if (refreshData.groups) setGroups(refreshData.groups);
        }
        return;
      }

      setCandidate((prev) => (prev ? { ...prev, ...data.candidate } : data.candidate));
      setSubmitSuccess(true);
    } catch (err: any) {
      console.error("Error submitting booking:", err);
      setError("Erro de rede. Por favor tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedGroup = groups.find((g) => g.id === (candidate?.trainingGroupId || selectedGroupId));
  const formattedCandidateName = formatCandidateName(candidate?.name);
  const isTechManager =
    candidate?.role === "cctv_technical_manager" ||
    (candidate?.role && candidate.role.includes("manager"));

  const roleTitleDisplay =
    candidate?.roleTitle?.[isPt ? "pt" : "en"] ||
    (isTechManager
      ? isPt ? "Gestor Técnico e Instalação de CCTV" : "CCTV Installation & Technical Manager"
      : isPt ? "Operadora do Centro de Controlo (CCO)" : "CCTV Control Centre Operator");

  const refDisplay = candidate?.id ? candidate.id.slice(0, 8).toUpperCase() : "CONF";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4">
        <OverwatchOrbitLoader />
        <p className="mt-4 text-xs font-semibold text-slate-500 tracking-wide uppercase font-mono">
          {isPt ? "A carregar dados da formação…" : "Loading training details…"}
        </p>
      </div>
    );
  }

  if (error && !candidate) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 text-slate-800">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-xs">
          <AlertCircle size={36} className="mx-auto text-red-500 mb-3" />
          <h1 className="text-base font-bold text-slate-900 mb-2">
            {isPt ? "Convite Não Encontrado" : "Invitation Not Found"}
          </h1>
          <p className="text-xs text-slate-600 leading-relaxed mb-5">{error}</p>
          <a
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0b1329] hover:bg-slate-800 text-xs font-semibold text-white transition-colors"
          >
            {isPt ? "Voltar ao Início" : "Return to Home"}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans selection:bg-[#0b1329] selection:text-white">
      {/* ── PRINT MEDIA CSS ── */}
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
              {isPt ? "2.ª Fase de Selecção · Convocatória Oficial" : "2nd Phase Selection · Official Convocation"}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {candidate?.id && (
              <span className="font-mono text-[11px] font-bold px-2.5 py-1 rounded-md bg-white/10 border border-white/15 text-slate-200">
                REF: #{refDisplay}
              </span>
            )}
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              {submitSuccess ? (isPt ? "Inscrição Confirmada" : "Confirmed") : (isPt ? "Vagas Abertas" : "Open")}
            </span>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT WORKSPACE ── */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">

        {/* Intro Hero Header */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-mono font-bold text-slate-700 uppercase tracking-wider mb-3">
            <ShieldCheck size={13} className="text-[#0b1329]" />
            <span>2.ª Fase de Selecção · Convocatória Oficial</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
            {trainingTitle || "Formação em Consciência Situacional e Identificação de Ameaças através de CCTV"}
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-2.5 max-w-2xl">
            {candidate ? (
              <>
                Prezado(a) candidato(a) <strong className="text-slate-900">{formattedCandidateName}</strong>, na sequência da sua aprovação na prova de selecção para a função de <strong className="text-slate-900">{roleTitleDisplay}</strong>, foi convocado(a) para a 2.ª fase de avaliação presencial e formação prática da Overwatch Moçambique.
              </>
            ) : (
              "Seleccione o grupo pretendido para a formação presencial e avaliação prática."
            )}
          </p>
        </div>

        {/* ══════════════════════════════════════════════════════════
            ALREADY CONFIRMED VOUCHER VIEW
            (Unified executive slip: NO duplicates, NO neon blobs)
            ══════════════════════════════════════════════════════════ */}
        {submitSuccess && candidate?.trainingGroup ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="rounded-2xl border border-slate-300/90 bg-white text-slate-900 shadow-sm overflow-hidden print-slip">
              {/* Slip Header */}
              <div className="bg-[#0b1329] text-white px-6 sm:px-8 py-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-emerald-400 shrink-0">
                    <CheckCircle2 size={22} />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold block">
                      Inscrição Confirmada com Sucesso
                    </span>
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      Comprovativo de Inscrição na Formação
                    </h2>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="no-print inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white text-[#0b1329] hover:bg-slate-100 text-xs font-bold transition-colors shadow-xs cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Imprimir / Guardar PDF</span>
                </button>
              </div>

              {/* Slip Body Grid */}
              <div className="p-6 sm:p-8 space-y-6">
                {/* Candidate Info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-6 border-b border-slate-200">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold block mb-1">
                      Candidato(a) Convocado(a)
                    </span>
                    <p className="text-base font-bold text-slate-900">
                      {formattedCandidateName}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold block mb-1">
                      Função de Avaliação
                    </span>
                    <p className="text-sm font-semibold text-slate-800">
                      {roleTitleDisplay}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold block mb-1">
                      Código de Inscrição
                    </span>
                    <p className="text-sm font-mono font-bold text-slate-800">
                      #{refDisplay}
                    </p>
                  </div>
                </div>

                {/* Group and Schedule Highlight Box */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                      Grupo &amp; Calendário de Sessões
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                      <Check size={11} />
                      <span>Vaga Reservada</span>
                    </span>
                  </div>

                  <p className="text-lg font-extrabold text-slate-900">
                    {candidate.trainingGroup}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-[#0b1329] shrink-0" />
                      <span>{selectedGroup?.schedule || "2, 3 e 4 de Novembro de 2026"} ({selectedGroup?.timeRange || "Horário do Grupo"})</span>
                    </div>
                    {selectedGroup?.evaluationTime && (
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-amber-600 shrink-0" />
                        <span className="font-semibold text-amber-900">Avaliação Prática: 5 de Novembro ({selectedGroup.evaluationTime})</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Venue and Instructions (2 Columns) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wide">
                      <MapPin size={15} className="text-[#0b1329]" />
                      <span>Localização das Sessões</span>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-4 bg-white text-xs space-y-1.5">
                      <p className="font-bold text-slate-900">Overwatch Moçambique</p>
                      <p className="text-slate-700 leading-snug">{location}</p>
                      <p className="text-amber-800 text-[11px] font-medium pt-1 border-t border-slate-100">
                        Chegada recomendada com 15 minutos de antecedência
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wide">
                      <FileText size={15} className="text-[#0b1329]" />
                      <span>O Que Deve Trazer</span>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-4 bg-white text-xs space-y-1.5">
                      <ul className="space-y-1.5 text-slate-700">
                        <li className="flex items-start gap-1.5">
                          <Check size={12} className="text-emerald-600 mt-0.5 shrink-0" />
                          <span>Documento de Identificação válido (BI ou Passaporte original)</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <Check size={12} className="text-emerald-600 mt-0.5 shrink-0" />
                          <span>Caneta azul ou preta e caderno para apontamentos</span>
                        </li>
                        <li className="flex items-start gap-1.5 text-slate-500 text-[11px]">
                          <span>Não é necessário trazer computador. Os materiais práticos são fornecidos.</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Gate Security Notice */}
                <div className="rounded-xl border border-slate-200/90 bg-slate-50 p-4 text-xs text-slate-700 flex items-start gap-3">
                  <ShieldCheck size={18} className="text-[#0b1329] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900">
                      Instruções de Acesso na Recepção da Overwatch:
                    </p>
                    <p className="text-slate-600 leading-relaxed">
                      A entrada nas instalações é autorizada mediante apresentação de um <strong>Documento de Identificação válido (BI / Passaporte original)</strong> e conferência do seu nome na lista da recepção. <strong>Não é necessário apresentar código QR.</strong>
                    </p>
                  </div>
                </div>

                {/* Slip Footer */}
                <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
                  <span>
                    Confirmado em: {new Date(candidate.trainingBookedAt || Date.now()).toLocaleDateString("pt-MZ")}
                  </span>
                  <span className="font-mono">
                    ID de Registo: #{refDisplay}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ══════════════════════════════════════════════════════════
              GROUP SELECTION FORM VIEW
              ══════════════════════════════════════════════════════════ */
          <div className="space-y-6">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Instruction Notice */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-xs text-slate-700 flex items-start gap-3.5 shadow-xs">
              <Info size={18} className="shrink-0 text-[#0b1329] mt-0.5" />
              <div className="space-y-1 leading-relaxed">
                <p className="font-bold text-slate-900">
                  Estrutura e Frequência da Formação Prática:
                </p>
                <p className="text-slate-600">
                  A formação tem a duração de 4 horas por dia durante 3 dias consecutivos (<strong>2, 3 e 4 de Novembro</strong>), com avaliação prática individual na <strong>quinta-feira, 5 de Novembro</strong>. O(A) participante deverá frequentar os três dias no mesmo grupo.
                </p>
              </div>
            </div>

            {/* Group Selection Grid */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block font-mono">
                1. Seleccione o Grupo Pretendido (Vagas Limitadas):
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groups.map((g) => {
                  const isSelected = selectedGroupId === g.id;
                  const isFull = g.isFull;

                  return (
                    <div
                      key={g.id}
                      onClick={() => {
                        if (!isFull && g.enabled) setSelectedGroupId(g.id);
                      }}
                      className={`rounded-2xl border p-5 transition-all text-left relative overflow-hidden ${
                        isFull
                          ? "opacity-55 border-slate-200 bg-slate-50 cursor-not-allowed"
                          : isSelected
                          ? "border-[#0b1329] bg-[#0b1329] text-white shadow-md ring-1 ring-[#0b1329] cursor-pointer"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs cursor-pointer"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="space-y-0.5">
                          <span
                            className={`text-[10px] font-mono font-bold uppercase tracking-wider block ${
                              isSelected ? "text-slate-300" : "text-slate-500"
                            }`}
                          >
                            {g.timeRange || "Turno"}
                          </span>
                          <h3 className={`text-base font-extrabold ${isSelected ? "text-white" : "text-slate-900"}`}>
                            {g.name}
                          </h3>
                        </div>

                        <div className="text-right">
                          {g.isExpired ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 text-slate-700 border border-slate-300">
                              {isPt ? "Encerrado" : "Closed"}
                            </span>
                          ) : isFull ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-700 border border-red-200">
                              {isPt ? "Esgotado" : "Full"}
                            </span>
                          ) : (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                isSelected
                                  ? "bg-white/20 text-white border border-white/30"
                                  : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              }`}
                            >
                              {g.availableSlots} {isPt ? "vagas livres" : "open slots"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Schedule details */}
                      <div
                        className={`text-xs space-y-1.5 border-t pt-3 ${
                          isSelected ? "border-white/15 text-slate-200" : "border-slate-100 text-slate-600"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-medium">
                          <Calendar size={13} className={isSelected ? "text-white" : "text-[#0b1329]"} />
                          <span>2, 3 e 4 de Novembro: {g.timeRange}</span>
                        </div>
                        <div
                          className={`flex items-center gap-1.5 font-semibold ${
                            isSelected ? "text-amber-200" : "text-amber-700"
                          }`}
                        >
                          <Clock size={13} className="shrink-0" />
                          <span>Avaliação: 5 de Novembro ({g.evaluationTime})</span>
                        </div>
                      </div>

                      {/* Radio Selection Indicator */}
                      <div
                        className={`mt-4 pt-3 border-t flex items-center justify-between ${
                          isSelected ? "border-white/10" : "border-slate-100"
                        }`}
                      >
                        <span
                          className={`text-[11px] font-mono ${
                            isSelected ? "text-slate-300" : "text-slate-400"
                          }`}
                        >
                          Capacidade: {g.capacity} vagas
                        </span>
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                            isSelected ? "border-white bg-white" : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <div className="w-2 h-2 rounded-full bg-[#0b1329]" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Venue & Guidelines Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-xs">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2">
                <MapPin size={14} className="text-[#0b1329]" />
                <span>2. Local e Condições de Comparência:</span>
              </h4>
              <div className="text-xs text-slate-600 space-y-1.5 leading-relaxed pl-1">
                <p>• <strong>Localização:</strong> {location}</p>
                <p>• <strong>Pontualidade:</strong> Deverá apresentar-se <strong>15 minutos antes</strong> do início de cada sessão.</p>
                <p>• <strong>O que Trazer:</strong> Documento de identificação original com foto (BI / Passaporte), caneta azul ou preta e caderno para apontamentos.</p>
                <p>• <strong>Acesso à Portaria:</strong> A autorização de entrada é efectuada mediante conferência do seu nome na lista da recepção. Não é necessário apresentar código QR.</p>
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                disabled={submitting || !selectedGroupId}
                onClick={handleConfirmBooking}
                className="w-full py-3.5 px-6 rounded-xl bg-[#0b1329] hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-sm tracking-wide shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} />
                    <span>A registar inscrição…</span>
                  </>
                ) : (
                  <>
                    <span>Confirmar Inscrição no {selectedGroup?.name || "Grupo Seleccionado"}</span>
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
              <p className="text-center text-[11px] text-slate-500">
                Ao confirmar, a sua vaga fica imediatamente reservada e o comprovativo oficial é emitido.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
