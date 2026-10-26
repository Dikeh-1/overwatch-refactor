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
  UserCheck,
  Printer,
  ChevronRight,
  ShieldCheck,
  Info,
} from "lucide-react";
import OverwatchOrbitLoader from "@/components/ui/OverwatchOrbitLoader";

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
  enabled: boolean;
  isSelectedByCandidate: boolean;
}

interface CandidateTrainingData {
  id: string;
  name: string;
  email: string;
  role: string;
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
          // Refresh groups
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <OverwatchOrbitLoader />
        <p className="mt-4 text-xs font-semibold text-slate-400 animate-pulse tracking-wide uppercase font-mono">
          {isPt ? "A carregar dados da formação…" : "Loading training details…"}
        </p>
      </div>
    );
  }

  if (error && !candidate) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-white">
        <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-red-950/20 p-6 text-center shadow-xl">
          <AlertCircle size={36} className="mx-auto text-red-400 mb-3" />
          <h1 className="text-base font-bold text-white mb-2">
            {isPt ? "Convite Não Encontrado" : "Invitation Not Found"}
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed mb-4">{error}</p>
          <a
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
          >
            {isPt ? "Voltar ao Website" : "Return to Website"}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white">
      {/* Top Banner / Navigation */}
      <header className="border-b border-white/10 bg-[#0b1329]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo-white.png"
              alt="Overwatch"
              width={120}
              height={18}
              className="h-4 sm:h-5 w-auto object-contain"
              priority
            />
            <span className="hidden sm:inline-block h-3.5 w-[1px] bg-white/20" />
            <span className="text-[11px] font-mono tracking-wider text-sky-400 uppercase font-semibold">
              Recrutamento Overwatch
            </span>
          </div>
          {candidate?.id && (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/10 border border-white/15 text-slate-300">
              REF: #{candidate.id.slice(0, 8).toUpperCase()}
            </span>
          )}
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 sm:py-12 space-y-6">
        {/* Intro Hero Header */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#0e172e] to-[#0a1022] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-sky-500/15 border border-sky-400/30 text-[10px] font-mono font-bold text-sky-300 uppercase tracking-widest">
              <ShieldCheck size={12} />
              <span>2.ª Fase de Selecção · Convocatória Oficial</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {trainingTitle || "Formação em Consciência Situacional e Identificação de Ameaças através de CCTV"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
              {candidate ? (
                <>
                  Exma. Senhora <strong className="text-white">{candidate.name}</strong>, na sequência da sua aprovação na prova de selecção para a função de <strong>Operadora do Centro de Controlo (CCO)</strong>, foi convocada para a 2.ª fase de avaliação presencial.
                </>
              ) : (
                "Selecione o grupo pretendido para a formação presencial e avaliação prática."
              )}
            </p>
          </div>
        </div>

        {/* ALREADY CONFIRMED VOUCHER VIEW */}
        {submitSuccess && candidate?.trainingGroup ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Voucher Card */}
            <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-b from-[#0b1b2a] to-[#07121c] p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
              <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                      Inscrição Confirmada com Sucesso
                    </span>
                    <h2 className="text-lg font-bold text-white">
                      Comprovativo de Inscrição na Formação
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer size={13} />
                  <span>Imprimir Comprovativo</span>
                </button>
              </div>

              {/* Group Confirmation Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                    Grupo Seleccionado
                  </span>
                  <p className="text-base font-extrabold text-emerald-300">
                    {candidate.trainingGroup}
                  </p>
                  <p className="text-xs text-slate-300 pt-1">
                    {selectedGroup?.schedule || "9, 10 e 11 de Novembro de 2026"}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                    Localização &amp; Horário de Comparência
                  </span>
                  <p className="text-sm font-bold text-white flex items-center gap-1.5">
                    <MapPin size={13} className="text-sky-400 shrink-0" />
                    <span>{location}</span>
                  </p>
                  <p className="text-xs text-amber-300 font-semibold pt-1">
                    Apresentar-se 15 minutos antes do início da sessão
                  </p>
                </div>
              </div>

              {/* Security Entry Instructions */}
              <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-xs text-emerald-100 flex items-start gap-2.5">
                <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-emerald-300">
                    Instruções de Acesso na Recepção da Overwatch:
                  </p>
                  <p className="text-emerald-200/90 leading-relaxed">
                    A sua entrada nas instalações é autorizada mediante apresentação de um <strong>Documento de Identificação válido (BI / Passaporte)</strong> e confirmação do seu nome na lista da recepção. <strong>Não é necessário apresentar código QR.</strong>
                  </p>
                </div>
              </div>

              {/* Requirements summary */}
              <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4 text-xs text-slate-300 space-y-2">
                <p className="font-bold text-white flex items-center gap-1.5">
                  <FileText size={13} className="text-sky-400" />
                  <span>O Que Deve Trazer para a Formação:</span>
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
                  <li>Documento de identificação válido (BI / Passaporte).</li>
                  <li>Uma cópia do documento de identificação (caso ainda não tenha entregue).</li>
                  <li>Caneta azul ou preta e caderno ou bloco de notas para apontamentos.</li>
                  <li className="text-slate-400 italic">Não é necessário trazer computador. Os materiais práticos serão fornecidos pela Overwatch.</li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                <span>Confirmado em: {new Date(candidate.trainingBookedAt || Date.now()).toLocaleDateString("pt-MZ")}</span>
                <span className="font-mono text-slate-300">ID: #{candidate.id.slice(0, 8).toUpperCase()}</span>
              </div>
            </div>
          </div>
        ) : (
          /* GROUP SELECTION FORM VIEW */
          <div className="space-y-6">
            {error && (
              <div className="rounded-xl border border-red-500/40 bg-red-950/30 p-4 text-xs text-red-200 flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Instruction Box */}
            <div className="rounded-xl border border-sky-500/20 bg-sky-950/20 p-4 text-xs text-sky-200 flex items-start gap-3">
              <Info size={16} className="shrink-0 text-sky-400 mt-0.5" />
              <div className="space-y-1 leading-relaxed">
                <p className="font-bold text-white">
                  Escolha do Grupo de Formação (Vagas Limitadas por Ordem de Inscrição):
                </p>
                <p>
                  A formação tem a duração de quatro horas por dia, durante 3 dias consecutivos (<strong>9, 10 e 11 de Novembro</strong>), com avaliação prática individual na <strong>quinta-feira, 12 de Novembro</strong>. A candidata deverá frequentar os três dias no mesmo grupo.
                </p>
              </div>
            </div>

            {/* Groups Selection Grid */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block font-mono">
                1. Seleccione o Grupo Pretendido:
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
                      className={`rounded-2xl border-2 p-5 transition-all text-left relative overflow-hidden ${
                        isFull
                          ? "opacity-50 border-white/5 bg-white/[0.02] cursor-not-allowed"
                          : isSelected
                          ? "border-sky-500 bg-sky-950/30 shadow-lg shadow-sky-950/50 cursor-pointer"
                          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.08] cursor-pointer"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-400">
                            {g.timeRange || "Turno"}
                          </span>
                          <h3 className="text-base font-extrabold text-white">
                            {g.name}
                          </h3>
                        </div>

                        <div className="text-right">
                          {isFull ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-950/60 text-red-300 border border-red-800">
                              Esgotado
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800">
                              {g.availableSlots} vagas livres
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Schedule details */}
                      <div className="text-xs text-slate-300 space-y-1.5 border-t border-white/10 pt-3">
                        <div className="flex items-center gap-1.5 text-slate-200 font-medium">
                          <Calendar size={13} className="text-sky-400 shrink-0" />
                          <span>9, 10 e 11 de Novembro: {g.timeRange}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-amber-300 font-medium">
                          <Clock size={13} className="text-amber-400 shrink-0" />
                          <span>Avaliação: 12 de Novembro ({g.evaluationTime})</span>
                        </div>
                      </div>

                      {/* Selection Radio Indicator */}
                      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400 font-mono">
                          Lotação máxima: {g.capacity} alunas
                        </span>
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            isSelected
                              ? "border-sky-500 bg-sky-500 text-slate-950"
                              : "border-white/30 bg-transparent"
                          }`}
                        >
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Venue & Guidelines */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <MapPin size={13} className="text-sky-400" />
                <span>2. Local e Condições de Comparência:</span>
              </h4>
              <div className="text-xs text-slate-300 space-y-1.5 leading-relaxed pl-1">
                <p>• <strong>Localização:</strong> {location}</p>
                <p>• <strong>Pontualidade:</strong> Deverá apresentar-se <strong>15 minutos antes</strong> do início da sessão.</p>
                <p>• <strong>O que Trazer:</strong> Documento de identificação válido (BI / Passaporte), caneta azul/preta e bloco de notas.</p>
                <p>• <strong>Acesso:</strong> A autorização de entrada é feita mediante apresentação do seu BI na portaria/recepção. Não é necessário trazer código QR.</p>
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="button"
                disabled={submitting || !selectedGroupId}
                onClick={handleConfirmBooking}
                className="w-full py-3.5 px-6 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-sm tracking-wide shadow-xl shadow-sky-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <span>A registar inscrição…</span>
                ) : (
                  <>
                    <span>Confirmar Inscrição no {selectedGroup?.name || "Grupo Seleccionado"}</span>
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
              <p className="text-center text-[11px] text-slate-500 mt-2.5">
                Ao confirmar, a sua vaga será reservada no grupo escolhido e receberá uma confirmação por email.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
