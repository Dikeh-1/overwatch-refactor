"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Award,
  Send,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Phone,
  Mail,
  Check,
  X,
  FileText,
} from "lucide-react";
import { formatPhoneDisplay } from "@/lib/careers";

interface NextPhaseCandidate {
  id: string;
  seedIndex: number;
  approvedName: string;
  name: string;
  score: number;
  email: string;
  phone: string;
  isMatched: boolean;
  matchedId?: string;
  nextPhaseStatus: string;
  invitationStatus: "not_sent" | "sent" | "failed";
  candidateResponse: "awaiting" | "confirmed" | "declined";
  responseDate?: string | null;
  token?: string;
}

interface NextPhaseSummary {
  totalSelected: number;
  notSent: number;
  awaiting: number;
  confirmed: number;
  declined: number;
}

interface NextPhaseViewProps {
  lang: "pt" | "en";
}

export const NextPhaseView: React.FC<NextPhaseViewProps> = ({ lang }) => {
  const t = (en: string, pt: string) => (lang === "en" ? en : pt);

  const [candidates, setCandidates] = useState<NextPhaseCandidate[]>([]);
  const [summary, setSummary] = useState<NextPhaseSummary>({
    totalSelected: 15,
    notSent: 15,
    awaiting: 0,
    confirmed: 0,
    declined: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Email template state
  const [emailSubject, setEmailSubject] = useState("Próxima Fase – Processo de Selecção Overwatch");
  const [previewEmail, setPreviewEmail] = useState("");
  const [previewSending, setPreviewSending] = useState(false);
  const [previewSuccessMsg, setPreviewSuccessMsg] = useState<string | null>(null);

  // Dispatch Confirmation Modal
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<{ sentCount: number; failedCount: number } | null>(null);

  // Template View Modal
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  const loadData = async () => {
    try {
      const res = await fetch("/api/admin/careers/next-phase");
      const data = await res.json();
      if (res.ok) {
        setCandidates(data.candidates || []);
        if (data.summary) setSummary(data.summary);
      } else {
        setError(data.error || "Failed to load next phase data");
      }
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleSendPreview = async () => {
    if (!previewEmail || !previewEmail.includes("@")) {
      alert(t("Please enter a valid preview email address.", "Por favor insira um email de pré-visualização válido."));
      return;
    }
    setPreviewSending(true);
    setPreviewSuccessMsg(null);
    try {
      const res = await fetch("/api/admin/careers/next-phase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "preview",
          previewEmail: previewEmail.trim(),
          subject: emailSubject,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPreviewSuccessMsg(
          t(
            `Sample preview email successfully sent to ${previewEmail} at ${new Date().toLocaleTimeString("pt-MZ")}.`,
            `Email de pré-visualização enviado com sucesso para ${previewEmail} às ${new Date().toLocaleTimeString("pt-MZ")}.`
          )
        );
      } else {
        alert(data.error || "Failed to send preview");
      }
    } catch (err: any) {
      alert(err.message || "Network error sending preview");
    } finally {
      setPreviewSending(false);
    }
  };

  const handleExecuteDispatch = async () => {
    setDispatching(true);
    setDispatchResult(null);
    try {
      const res = await fetch("/api/admin/careers/next-phase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "dispatch",
          subject: emailSubject,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDispatchResult({
          sentCount: data.sentCount,
          failedCount: data.failedCount,
        });
        setConfirmModalOpen(false);
        loadData();
      } else {
        alert(data.error || "Dispatch failed");
      }
    } catch (err: any) {
      alert(err.message || "Network error during dispatch");
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {t("Next Phase", "Próxima Fase")}
            </h1>
            <span className="px-2 py-0.5 rounded text-[0.65rem] font-bold bg-sky-50 text-sky-700 border border-sky-200">
              Operadora de CCO • Recruitment 2026
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {t(
              "Management approved cohort of 15 candidates moving forward to practical training consideration",
              "Turma de 15 candidatas aprovadas pela administração para consideração na fase de formação"
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setTemplateModalOpen(true)}
            className="px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Eye size={13} />
            <span>{t("View Template", "Ver Modelo")}</span>
          </button>

          <button
            type="button"
            onClick={() => setConfirmModalOpen(true)}
            disabled={summary.notSent === 0}
            className="px-3.5 py-1.5 rounded-md bg-[#0a1128] hover:bg-[#101b3d] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <Send size={13} />
            <span>
              {t(`Dispatch Invitations (${summary.notSent})`, `Disparar Convocatórias (${summary.notSent})`)}
            </span>
          </button>
        </div>
      </div>

      {/* Operational KPI Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-lg bg-white border border-slate-200">
          <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400 block">
            {t("Approved Selected", "Aprovadas")}
          </span>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">
            {summary.totalSelected}
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-white border border-slate-200">
          <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400 block">
            {t("Not Dispatched", "Não Enviadas")}
          </span>
          <div className="text-xl font-bold font-mono text-slate-700 mt-1">
            {summary.notSent}
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-white border border-slate-200">
          <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400 block">
            {t("Awaiting Response", "Aguardando Resposta")}
          </span>
          <div className="text-xl font-bold font-mono text-amber-700 mt-1">
            {summary.awaiting}
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-white border border-slate-200">
          <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400 block">
            {t("Confirmed Interest (YES)", "Confirmaram SIM")}
          </span>
          <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
            {summary.confirmed}
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-white border border-slate-200">
          <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400 block">
            {t("Declined (NO)", "Recusaram NÃO")}
          </span>
          <div className="text-xl font-bold font-mono text-slate-500 mt-1">
            {summary.declined}
          </div>
        </div>
      </div>

      {/* Two-step Preview & Testing Tool */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Mail size={14} className="text-sky-600" />
            <span>{t("Step 1: Send Sample Preview to Admin", "Passo 1: Enviar Pré-visualização de Teste")}</span>
          </h3>
          <p className="text-[0.7rem] text-slate-500">
            {t(
              "Review the exact email layout and conditions before executing candidate dispatch.",
              "Valide a apresentação do email e termos antes de enviar às candidatas."
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-1 max-w-md">
          <input
            type="email"
            placeholder="admin@overwatch.co.mz"
            value={previewEmail}
            onChange={(e) => setPreviewEmail(e.target.value)}
            className="flex-1 px-3 py-1.5 text-xs rounded border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          <button
            type="button"
            onClick={handleSendPreview}
            disabled={previewSending}
            className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
          >
            {previewSending ? t("Sending...", "A enviar...") : t("Send Sample", "Enviar Amostra")}
          </button>
        </div>
      </div>

      {previewSuccessMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
          <span>{previewSuccessMsg}</span>
        </div>
      )}

      {/* Approved 15 Candidates Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="p-3.5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            {t("Approved Candidate Roster (15)", "Lista de Candidatas Aprovadas (15)")}
          </h2>
          <span className="text-[0.7rem] text-slate-400">
            {t("Ranked by Test Score", "Ordenadas por Nota no Teste")}
          </span>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/75 text-[0.65rem] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="w-12 px-4 py-2.5">#</th>
              <th className="px-4 py-2.5">{t("Candidate", "Candidata")}</th>
              <th className="px-4 py-2.5">{t("Test Score", "Pontuação")}</th>
              <th className="px-4 py-2.5">{t("Contact", "Contacto")}</th>
              <th className="px-4 py-2.5">{t("Invitation Status", "Estado do Envio")}</th>
              <th className="px-4 py-2.5">{t("Candidate Response", "Resposta da Candidata")}</th>
              <th className="px-4 py-2.5 text-right">{t("Action", "Ação")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {candidates.map((cand) => {
              const hasSent = cand.invitationStatus === "sent";
              const isConfirmed = cand.candidateResponse === "confirmed";
              const isDeclined = cand.candidateResponse === "declined";

              return (
                <tr key={cand.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3 font-mono text-slate-400 font-semibold text-[0.75rem]">
                    {cand.seedIndex}
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <span>{cand.name}</span>
                      {cand.isMatched && (
                        <span title={t("Matched with application record", "Ligado à candidatura")}>
                          <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                        </span>
                      )}
                    </div>
                    <div className="text-[0.7rem] text-slate-400">{cand.email || t("No email on file", "Sem email")}</div>
                  </td>

                  <td className="px-4 py-3 font-mono">
                    <span className="font-semibold text-slate-900">
                      {cand.score}%
                    </span>
                  </td>

                  <td className="px-4 py-3 font-mono text-[0.75rem] text-slate-600 whitespace-nowrap">
                    {formatPhoneDisplay(cand.phone) || "—"}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    {hasSent ? (
                      <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {t("SENT", "ENVIADO")}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-slate-100 text-slate-500">
                        {t("NOT SENT", "NÃO ENVIADO")}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    {isConfirmed ? (
                      <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {t("Confirmed YES", "Confirmou SIM")}
                      </span>
                    ) : isDeclined ? (
                      <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        {t("Declined NO", "Recusou NÃO")}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        {t("Awaiting Response", "Aguardando")}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {cand.matchedId ? (
                      <Link
                        href={`/admin/recruitment/candidates/${cand.matchedId}`}
                        className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors"
                      >
                        {t("Profile", "Perfil")}
                      </Link>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Confirmation Dispatch Modal */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-lg p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Send size={16} className="text-sky-600" />
              <span>{t("Confirm Next Phase Dispatch", "Confirmar Envio das Convocatórias")}</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {t(
                `You are about to send the official Next Phase Conditions notice to ${summary.notSent} approved candidates. Each candidate will receive a secure individual token with YES and NO options.`,
                `Está prestes a enviar a notificação oficial de condições da Próxima Fase para as ${summary.notSent} candidatas aprovadas. Cada mensagem contém um token seguro de utilização única com opções SIM e NÃO.`
              )}
            </p>

            <div className="p-3 rounded-md bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>{t("Approved Recipients:", "Destinatárias Aprovadas:")}</span>
                <strong className="text-slate-900 font-mono">15</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>{t("Emails to Dispatch:", "Emails a Disparar:")}</span>
                <strong className="text-sky-700 font-mono">{summary.notSent}</strong>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="px-3 py-1.5 rounded-md border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                {t("Cancel", "Cancelar")}
              </button>
              <button
                type="button"
                onClick={handleExecuteDispatch}
                disabled={dispatching}
                className="px-3.5 py-1.5 rounded-md bg-[#0a1128] hover:bg-[#101b3d] text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                {dispatching ? t("Sending...", "A enviar...") : t(`Send ${summary.notSent} Invitations`, `Enviar ${summary.notSent} Convocatórias`)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Modal with Realistic Overwatch Letterhead & Device Switcher */}
      {templateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white rounded-lg shadow-xl border border-slate-200 space-y-0 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  {t("Email Letterhead Preview", "Pré-visualização do Modelo de Email")}
                </h3>
                <p className="text-[0.7rem] text-slate-500">
                  {t("Next Phase Conditions Notice • Mozambique Portuguese (PT-MZ)", "Notificação de Condições da Próxima Fase • Português (Moçambique)")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTemplateModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Email Letterhead Viewer */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#f8fafc] admin-scrollbar">
              <div className="max-w-xl mx-auto bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
                {/* Brand Bar */}
                <div className="h-1 bg-[#0b1329]" />

                {/* Email Header */}
                <div className="p-6 border-b border-slate-100 bg-white">
                  <span className="text-[0.65rem] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                    Overwatch • Recrutamento CCO 2026
                  </span>
                  <h2 className="text-base font-bold text-[#0b1329] tracking-tight">
                    Próxima Fase do Processo de Selecção
                  </h2>
                </div>

                {/* Email Body */}
                <div className="p-6 text-xs text-slate-700 space-y-3.5 leading-relaxed">
                  <p className="font-semibold text-slate-900">
                    Prezada Candidata <span className="text-sky-700">[Nome da Candidata]</span>,
                  </p>

                  <p>
                    Agradecemos a sua participação no processo de selecção para a função de <strong>Operadora de CCO</strong> da Overwatch.
                  </p>

                  <p>
                    O seu resultado no teste (<strong className="text-slate-900">mais de 80%</strong>) permitiu-lhe avançar para consideração na próxima fase do processo.
                  </p>

                  <p>
                    Antes de prosseguirmos, gostaríamos de assegurar que compreende e aceita as condições previstas para esta etapa:
                  </p>

                  <div className="bg-slate-50 border-l-2 border-[#0b1329] p-3.5 rounded-r space-y-2 text-[0.72rem] text-slate-800">
                    <div>• <strong>10 dias de formação inicial</strong>, sem remuneração;</div>
                    <div>• Caso seja seleccionada após essa formação, seguirá para um período de <strong>3 meses de formação prática</strong>, com uma remuneração mensal de <strong>9.000 MZN</strong>;</div>
                    <div>• Após a conclusão satisfatória desse período, a remuneração mensal poderá chegar a <strong>12.000 MZN</strong>, de acordo com o desempenho e enquadramento na função;</div>
                    <div>• O regime de trabalho previsto é de <strong>12 horas por turno</strong>, numa rotação de: <span className="font-semibold text-slate-900">2 turnos de dia + 2 turnos de noite + 2 dias de folga</span>.</div>
                  </div>

                  <p className="text-slate-500 text-[0.7rem]">
                    A progressão para cada fase dependerá do desempenho, disciplina, capacidade de aprendizagem, cumprimento dos procedimentos e adequação à função.
                  </p>

                  <p className="font-medium text-slate-900 pt-1">
                    Neste momento, gostaríamos apenas de saber se, tendo conhecimento destas condições, continua interessada em ser considerada para a próxima fase do processo de selecção.
                  </p>

                  {/* Buttons */}
                  <div className="pt-2 space-y-2">
                    <div className="w-full text-center py-2.5 px-4 rounded bg-[#0b1329] text-white font-semibold text-xs shadow-xs">
                      Sim, tenho interesse em continuar no processo de selecção e estou disponível para cumprir as condições indicadas.
                    </div>
                    <div className="text-center">
                      <span className="text-[0.7rem] text-slate-400 hover:text-slate-600 underline cursor-pointer">
                        Não tenho interesse
                      </span>
                    </div>
                  </div>

                  <p className="text-[0.68rem] text-slate-400 italic pt-2">
                    As candidatas que confirmarem o interesse receberão posteriormente informação sobre datas, horários e organização da formação.
                  </p>

                  <div className="pt-4 border-t border-slate-100 text-xs">
                    <p className="text-slate-500">Com os melhores cumprimentos,</p>
                    <p className="font-bold text-[#0b1329] mt-0.5">Overwatch</p>
                  </div>
                </div>

                {/* Email Footer */}
                <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-center">
                  <p className="text-[0.65rem] text-slate-400">
                    © 2026 Overwatch Moçambique. Todos os direitos reservados.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between bg-white">
              <span className="text-[0.7rem] text-slate-400">
                {t("Template body is official PT-MZ copy", "O corpo do modelo utiliza a redação oficial em PT-MZ")}
              </span>
              <button
                type="button"
                onClick={() => setTemplateModalOpen(false)}
                className="px-3.5 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
              >
                {t("Close", "Fechar")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
