"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Mail,
  Search,
  Send,
  CheckCircle2,
  AlertCircle,
  Eye,
  Clock,
  X,
  FileText,
  Smartphone,
  Monitor,
  Filter,
  Users,
  Check,
  RotateCcw,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
} from "lucide-react";
import { Application, formatPhoneDisplay, formatSlotDisplay, normalizeSlot } from "@/lib/careers";

interface CommunicationsViewProps {
  applications: Application[];
  lang: "pt" | "en";
}

interface CommLog {
  id: string;
  candidateName: string;
  candidateId: string;
  type: string;
  subject: string;
  recipient: string;
  sentAt: string;
  status: string;
  response?: "confirmed" | "declined" | "awaiting";
}

export const CommunicationsView: React.FC<CommunicationsViewProps> = ({
  applications,
  lang,
}) => {
  const t = (en: string, pt: string) => (lang === "en" ? en : pt);

  const [activeTab, setActiveTab] = useState<"overview" | "templates" | "compose" | "history">("overview");

  // Filter state in Delivery History
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [responseFilter, setResponseFilter] = useState("all");

  // Template Preview Modal
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  // Quick Test Dispatch State
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testSuccessMsg, setTestSuccessMsg] = useState<string | null>(null);
  const [testErrorMsg, setTestErrorMsg] = useState<string | null>(null);

  // Compose Wizard State
  const [composeStep, setComposeStep] = useState<1 | 2 | 3>(1);
  const [composeTemplate, setComposeTemplate] = useState<string>("next_phase");
  const [composeAudience, setComposeAudience] = useState<"next_phase_15" | "session_slot" | "shortlisted_unbooked" | "individual">("next_phase_15");
  const [composeSlot, setComposeSlot] = useState<string>("");
  const [composeSingleId, setComposeSingleId] = useState<string>("");
  const [composeSubject, setComposeSubject] = useState<string>("Próxima Fase – Processo de Selecção Overwatch");
  const [composeDispatching, setComposeDispatching] = useState(false);
  const [composeConfirmOpen, setComposeConfirmOpen] = useState(false);
  const [composeResult, setComposeResult] = useState<{ sentCount: number; failedCount: number } | null>(null);

  // Aggregate communication logs across all candidates
  const allCommunications: CommLog[] = useMemo(() => {
    const list: CommLog[] = [];

    applications.forEach((app) => {
      if (app.communications && Array.isArray(app.communications)) {
        app.communications.forEach((comm) => {
          let resp: "confirmed" | "declined" | "awaiting" | undefined;
          if (comm.type === "next_phase_invite") {
            if (app.nextPhaseResponse === "yes") resp = "confirmed";
            else if (app.nextPhaseResponse === "no") resp = "declined";
            else resp = "awaiting";
          }
          list.push({
            id: comm.id,
            candidateName: app.name,
            candidateId: app.id,
            type: comm.type,
            subject: comm.subject,
            recipient: comm.recipient,
            sentAt: comm.sentAt,
            status: comm.status,
            response: resp,
          });
        });
      } else if (app.invitedAt) {
        list.push({
          id: `conv_${app.id}`,
          candidateName: app.name,
          candidateId: app.id,
          type: "convocation",
          subject: "Convocatória para Teste Presencial — Overwatch",
          recipient: app.email,
          sentAt: app.invitedAt,
          status: "sent",
        });
      }
    });

    return list.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  }, [applications]);

  // Operational metrics
  const totalSent = allCommunications.filter((c) => c.status.toLowerCase() === "sent" || c.status.toLowerCase() === "delivered").length;
  const nextPhaseAwaiting = applications.filter((a) => a.nextPhaseInvitedAt && !a.nextPhaseResponse).length;
  const nextPhaseConfirmed = applications.filter((a) => a.nextPhaseResponse === "yes").length;
  const nextPhaseDeclined = applications.filter((a) => a.nextPhaseResponse === "no").length;

  // Filtered Delivery History logs
  const filteredHistory = useMemo(() => {
    return allCommunications.filter((log) => {
      if (typeFilter !== "all" && !log.type.toLowerCase().includes(typeFilter.toLowerCase())) {
        return false;
      }
      if (statusFilter !== "all" && log.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      if (responseFilter !== "all" && log.response !== responseFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          log.candidateName.toLowerCase().includes(q) ||
          log.recipient.toLowerCase().includes(q) ||
          log.subject.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allCommunications, typeFilter, statusFilter, responseFilter, searchQuery]);

  // Recipient computation for Compose
  const targetRecipients = useMemo(() => {
    if (composeAudience === "next_phase_15") {
      return applications.filter((a) => a.nextPhaseStatus === "selected" || a.nextPhaseStatus === "invited" || a.nextPhaseStatus === "confirmed");
    }
    if (composeAudience === "session_slot" && composeSlot) {
      return applications.filter((a) => a.testSlot && normalizeSlot(a.testSlot) === normalizeSlot(composeSlot) && a.status !== "archived");
    }
    if (composeAudience === "shortlisted_unbooked") {
      return applications.filter((a) => !a.testSlot && a.status !== "archived" && a.status !== "rejected");
    }
    if (composeAudience === "individual" && composeSingleId) {
      return applications.filter((a) => a.id === composeSingleId);
    }
    return [];
  }, [applications, composeAudience, composeSlot, composeSingleId]);

  // Unique session slots for slot picker
  const distinctSlots = useMemo(() => {
    const set = new Set<string>();
    applications.forEach((a) => {
      if (a.testSlot && a.status !== "archived") set.add(normalizeSlot(a.testSlot));
    });
    return Array.from(set).filter(Boolean);
  }, [applications]);

  // Handle Quick Test Send
  const handleSendTestSample = async (templateId: string) => {
    if (!testEmailAddress || !testEmailAddress.includes("@")) {
      alert(t("Please enter a valid admin email address.", "Por favor indique um email válido."));
      return;
    }

    setTestSending(true);
    setTestSuccessMsg(null);
    setTestErrorMsg(null);

    try {
      if (templateId === "next_phase") {
        const res = await fetch("/api/admin/careers/next-phase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "preview", previewEmail: testEmailAddress.trim() }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setTestSuccessMsg(t(`Sample next-phase preview sent to ${testEmailAddress}.`, `Amostra de teste enviada com sucesso para ${testEmailAddress}.`));
        } else {
          setTestErrorMsg(data.error || "Failed to send test email");
        }
      } else {
        const res = await fetch("/api/admin/careers/test-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "convocation", toEmail: testEmailAddress.trim() }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setTestSuccessMsg(t(`Test convocation preview sent to ${testEmailAddress}.`, `Amostra de convocatória enviada para ${testEmailAddress}.`));
        } else {
          setTestErrorMsg(data.error || "Failed to send test email");
        }
      }
    } catch (err: any) {
      setTestErrorMsg(err.message || "Network error sending test sample");
    } finally {
      setTestSending(false);
    }
  };

  // Handle Batch Dispatch from Compose Wizard
  const handleExecuteComposeDispatch = async () => {
    setComposeDispatching(true);
    setComposeResult(null);

    try {
      if (composeTemplate === "next_phase") {
        const res = await fetch("/api/admin/careers/next-phase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "dispatch",
            subject: composeSubject,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setComposeResult({ sentCount: data.sentCount, failedCount: data.failedCount });
          setComposeConfirmOpen(false);
        } else {
          alert(data.error || "Dispatch failed");
        }
      } else {
        // Broadcast / convocation dispatch
        const targetIds = targetRecipients.map((c) => c.id);
        const res = await fetch("/api/admin/careers/custom-broadcast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidateIds: targetIds,
            subject: composeSubject,
            template: composeTemplate,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setComposeResult({ sentCount: data.sentCount || targetIds.length, failedCount: data.failedCount || 0 });
          setComposeConfirmOpen(false);
        } else {
          alert(data.error || "Dispatch failed");
        }
      }
    } catch (err: any) {
      alert(err.message || "Network error executing dispatch");
    } finally {
      setComposeDispatching(false);
    }
  };

  const templatesList = [
    {
      id: "next_phase",
      title: t("Next Phase Conditions Notice", "Notificação de Condições – Próxima Fase"),
      code: "NEXT_PHASE_CONDITIONS",
      audience: t("Approved 15 Candidates (>80% test score)", "15 Candidatas Aprovadas (Nota >80%)"),
      subject: "Próxima Fase – Processo de Selecção Overwatch",
      description: t(
        "Official notice outlining 10-day training conditions, salary schedule, and 12h shift rotation with secure YES/NO buttons.",
        "Notificação oficial com termos da formação de 10 dias, remunerações e turnos de 12h com botões de resposta SIM/NÃO."
      ),
    },
    {
      id: "convocation",
      title: t("In-Person Test Convocation", "Convocatória para Teste Presencial"),
      code: "TEST_INVITATION",
      audience: t("Shortlisted applicants", "Candidaturas triadas para teste"),
      subject: "Convocatória para Teste Presencial — Overwatch",
      description: t(
        "Official invitation providing test venue address, date/time slot, and mandatory ID requirements.",
        "Convocatória com morada do centro de testes, turno agendado e requisitos de identificação."
      ),
    },
    {
      id: "confirmation",
      title: t("Availability Confirmation Receipt", "Confirmação de Disponibilidade"),
      code: "NEXT_PHASE_YES_RECEIPT",
      audience: t("Candidates confirming YES for training", "Candidatas que responderam SIM"),
      subject: "Confirmação – Processo de Selecção Overwatch",
      description: t(
        "Automated acknowledgment sent when a candidate accepts training terms, confirming their seat.",
        "Recibo automático enviado após confirmação da candidata para a fase de formação."
      ),
    },
    {
      id: "closure",
      title: t("Polite Application Closure", "Agradecimento e Encerramento"),
      code: "NEXT_PHASE_NO_RECEIPT",
      audience: t("Candidates declining or closing application", "Candidatas que recusaram ou encerradas"),
      subject: "Processo de Selecção Overwatch",
      description: t(
        "Polite thank-you and closure email wishing success and retaining profile for future intake.",
        "Mensagem de encerramento cortês com votos de sucesso e arquivo de perfil para futuras vagas."
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {t("Communications & Dispatch Center", "Central de Comunicações & Envios")}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t(
              "Centralized email templates, multi-step dispatch workflow, and delivery audit history",
              "Gestão de modelos oficiais, fluxo de envio e histórico de auditoria de entregas"
            )}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              activeTab === "overview" ? "bg-white text-slate-900 font-semibold shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t("Overview", "Visão Geral")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("templates")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              activeTab === "templates" ? "bg-white text-slate-900 font-semibold shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t("Template Library", "Modelos")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("compose")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              activeTab === "compose" ? "bg-white text-slate-900 font-semibold shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t("Compose & Dispatch", "Compor & Enviar")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              activeTab === "history" ? "bg-white text-slate-900 font-semibold shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t("Delivery History", "Histórico de Envios")}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Operational Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3.5 rounded-lg bg-white border border-slate-200">
              <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400 block">
                {t("Total Emails Sent", "Total de Envios")}
              </span>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">{totalSent}</div>
            </div>

            <div className="p-3.5 rounded-lg bg-white border border-slate-200">
              <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400 block">
                {t("Awaiting Response", "Aguardando Resposta")}
              </span>
              <div className="text-xl font-bold font-mono text-amber-700 mt-1">{nextPhaseAwaiting}</div>
            </div>

            <div className="p-3.5 rounded-lg bg-white border border-slate-200">
              <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400 block">
                {t("Confirmed Interest (YES)", "Confirmaram (SIM)")}
              </span>
              <div className="text-xl font-bold font-mono text-emerald-700 mt-1">{nextPhaseConfirmed}</div>
            </div>

            <div className="p-3.5 rounded-lg bg-white border border-slate-200">
              <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400 block">
                {t("Declined (NO)", "Recusaram (NÃO)")}
              </span>
              <div className="text-xl font-bold font-mono text-slate-500 mt-1">{nextPhaseDeclined}</div>
            </div>

            <div className="p-3.5 rounded-lg bg-white border border-slate-200">
              <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400 block">
                {t("Active Templates", "Modelos Activos")}
              </span>
              <div className="text-xl font-bold font-mono text-sky-700 mt-1">4</div>
            </div>
          </div>

          {/* Quick Dispatch Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Mail size={14} className="text-sky-600" />
                <span>{t("Step 1: Test Email Verification", "Validação de Email de Teste")}</span>
              </h2>
              <p className="text-xs text-slate-500">
                {t(
                  "Send an exact sample preview to your own inbox before broadcasting to candidates.",
                  "Envie uma amostra fiel para a sua caixa de correio antes de disparar para os candidatos."
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-1 max-w-md">
              <input
                type="email"
                placeholder="admin@overwatch.co.mz"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs rounded border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <button
                type="button"
                onClick={() => handleSendTestSample("next_phase")}
                disabled={testSending || !testEmailAddress}
                className="px-3 py-1.5 rounded bg-[#0a1128] hover:bg-[#101b3d] text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                {testSending ? t("Sending...", "A enviar...") : t("Send Test", "Enviar Teste")}
              </button>
            </div>
          </div>

          {testSuccessMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
              <span>{testSuccessMsg}</span>
            </div>
          )}

          {testErrorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle size={14} className="text-rose-600 shrink-0" />
              <span>{testErrorMsg}</span>
            </div>
          )}

          {/* Recent Communications Table */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
            <div className="p-3.5 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                {t("Recent Communications Activity", "Actividade Recente de Comunicações")}
              </h2>
              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className="text-xs text-sky-700 hover:text-sky-900 font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                <span>{t("View Full History", "Ver Todo o Histórico")}</span>
                <ArrowRight size={12} />
              </button>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[0.65rem] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-2.5">{t("Recipient", "Destinatário")}</th>
                  <th className="px-4 py-2.5">{t("Subject", "Assunto")}</th>
                  <th className="px-4 py-2.5">{t("Template", "Modelo")}</th>
                  <th className="px-4 py-2.5">{t("Delivery Status", "Estado de Entrega")}</th>
                  <th className="px-4 py-2.5">{t("Candidate Response", "Resposta")}</th>
                  <th className="px-4 py-2.5 text-right">{t("Sent At", "Data e Hora")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {allCommunications.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">
                      {t("No communication events recorded yet.", "Nenhum registo de comunicação registado.")}
                    </td>
                  </tr>
                ) : (
                  allCommunications.slice(0, 8).map((log, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-slate-900">{log.candidateName}</div>
                        <div className="text-[0.7rem] text-slate-400">{log.recipient}</div>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-800 truncate max-w-xs">{log.subject}</td>
                      <td className="px-4 py-2.5 text-slate-500 capitalize text-[0.75rem]">{log.type.replace(/_/g, " ")}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {log.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {log.response === "confirmed" ? (
                          <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            {t("Confirmed YES", "Confirmou SIM")}
                          </span>
                        ) : log.response === "declined" ? (
                          <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            {t("Declined NO", "Recusou NÃO")}
                          </span>
                        ) : log.response === "awaiting" ? (
                          <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            {t("Awaiting", "Aguardando")}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-[0.7rem] text-slate-500 whitespace-nowrap">
                        {new Date(log.sentAt).toLocaleString("pt-MZ")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TEMPLATE LIBRARY */}
      {/* ========================================================================= */}
      {activeTab === "templates" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templatesList.map((tpl) => (
              <div key={tpl.id} className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between space-y-4 shadow-xs">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[0.65rem] font-mono font-bold bg-slate-100 text-slate-600">
                      {tpl.code}
                    </span>
                    <span className="text-[0.7rem] text-slate-400">PT-MZ Official</span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">{tpl.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{tpl.description}</p>

                  <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                    <div>
                      <strong className="text-slate-800">{t("Target:", "Destinatárias:")}</strong> {tpl.audience}
                    </div>
                    <div>
                      <strong className="text-slate-800">{t("Subject:", "Assunto:")}</strong> {tpl.subject}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setPreviewTemplateId(tpl.id)}
                    className="flex-1 px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Eye size={13} />
                    <span>{t("Preview Letterhead", "Ver Modelo")}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setComposeTemplate(tpl.id);
                      setActiveTab("compose");
                    }}
                    className="flex-1 px-3 py-1.5 rounded-md bg-[#0a1128] hover:bg-[#101b3d] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Send size={13} />
                    <span>{t("Use in Compose", "Usar no Envio")}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: COMPOSE & DISPATCH WIZARD */}
      {/* ========================================================================= */}
      {activeTab === "compose" && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-6">
          {/* Wizard Step Indicator */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-6">
              <div className={`flex items-center gap-2 text-xs font-semibold ${composeStep === 1 ? "text-sky-700" : "text-slate-400"}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[0.65rem] ${composeStep === 1 ? "bg-sky-700 text-white" : "bg-slate-200 text-slate-700"}`}>1</span>
                <span>{t("Template & Audience", "Modelo & Destinatários")}</span>
              </div>
              <ChevronRight size={14} className="text-slate-300" />
              <div className={`flex items-center gap-2 text-xs font-semibold ${composeStep === 2 ? "text-sky-700" : "text-slate-400"}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[0.65rem] ${composeStep === 2 ? "bg-sky-700 text-white" : "bg-slate-200 text-slate-700"}`}>2</span>
                <span>{t("Review & Test", "Revisão & Amostra")}</span>
              </div>
              <ChevronRight size={14} className="text-slate-300" />
              <div className={`flex items-center gap-2 text-xs font-semibold ${composeStep === 3 ? "text-sky-700" : "text-slate-400"}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[0.65rem] ${composeStep === 3 ? "bg-sky-700 text-white" : "bg-slate-200 text-slate-700"}`}>3</span>
                <span>{t("Dispatch Confirmation", "Disparo Final")}</span>
              </div>
            </div>

            {composeResult && (
              <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
                {t(`Sent ${composeResult.sentCount} emails successfully`, `${composeResult.sentCount} emails disparados com sucesso`)}
              </span>
            )}
          </div>

          {/* Step 1: Configuration */}
          {composeStep === 1 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t("Select Email Template", "Seleccionar Modelo de Email")}
                  </label>
                  <select
                    value={composeTemplate}
                    onChange={(e) => {
                      setComposeTemplate(e.target.value);
                      if (e.target.value === "next_phase") setComposeSubject("Próxima Fase – Processo de Selecção Overwatch");
                      else if (e.target.value === "convocation") setComposeSubject("Convocatória para Teste Presencial — Overwatch");
                      else if (e.target.value === "confirmation") setComposeSubject("Confirmação – Processo de Selecção Overwatch");
                      else setComposeSubject("Processo de Selecção Overwatch");
                    }}
                    className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="next_phase">{t("Next Phase Conditions Notice", "Notificação de Condições – Próxima Fase")}</option>
                    <option value="convocation">{t("In-Person Test Convocation", "Convocatória para Teste Presencial")}</option>
                    <option value="confirmation">{t("Availability Confirmation Receipt", "Confirmação de Disponibilidade")}</option>
                    <option value="closure">{t("Polite Application Closure", "Agradecimento e Encerramento")}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t("Target Recipient Filter", "Filtro de Destinatárias")}
                  </label>
                  <select
                    value={composeAudience}
                    onChange={(e) => setComposeAudience(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="next_phase_15">{t("Approved Next Phase Cohort (15 candidates)", "Turma Aprovada da Próxima Fase (15 candidatas)")}</option>
                    <option value="session_slot">{t("Filter by In-Person Test Session Slot", "Filtrar por Turno de Teste Presencial")}</option>
                    <option value="shortlisted_unbooked">{t("Shortlisted Candidates Awaiting Booking", "Candidaturas Triadas Pendentes de Agendamento")}</option>
                    <option value="individual">{t("Single Candidate by Name / ID", "Candidatura Individual por Nome")}</option>
                  </select>
                </div>
              </div>

              {composeAudience === "session_slot" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t("Select Session Slot", "Seleccionar Turno")}
                  </label>
                  <select
                    value={composeSlot}
                    onChange={(e) => setComposeSlot(e.target.value)}
                    className="w-full max-w-md px-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 bg-white"
                  >
                    <option value="">{t("Choose a slot...", "Escolha um turno...")}</option>
                    {distinctSlots.map((s) => (
                      <option key={s} value={s}>{formatSlotDisplay(s)}</option>
                    ))}
                  </select>
                </div>
              )}

              {composeAudience === "individual" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t("Select Individual Candidate", "Seleccionar Candidata")}
                  </label>
                  <select
                    value={composeSingleId}
                    onChange={(e) => setComposeSingleId(e.target.value)}
                    className="w-full max-w-md px-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 bg-white"
                  >
                    <option value="">{t("Choose candidate...", "Escolha a candidata...")}</option>
                    {applications.slice(0, 100).map((a) => (
                      <option key={a.id} value={a.id}>{a.name} ({a.email})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t("Subject Line (Official PT-MZ)", "Linha de Assunto")}
                </label>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              {/* Matched Recipients Box */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900">
                    {t("Matched Target Recipients:", "Destinatárias Encontradas:")} <span className="font-mono text-sky-700 font-bold">{targetRecipients.length}</span>
                  </span>
                </div>
                <div className="max-h-32 overflow-y-auto admin-scrollbar divide-y divide-slate-200/60 text-[0.7rem] text-slate-600">
                  {targetRecipients.length === 0 ? (
                    <div className="py-2 text-slate-400 italic">{t("No recipients match this filter.", "Nenhuma candidata corresponde a este filtro.")}</div>
                  ) : (
                    targetRecipients.map((r, i) => (
                      <div key={r.id || i} className="py-1 flex items-center justify-between">
                        <span className="font-medium text-slate-800">{r.name}</span>
                        <span className="font-mono text-slate-500">{r.email}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setComposeStep(2)}
                  disabled={targetRecipients.length === 0}
                  className="px-4 py-2 rounded-md bg-[#0a1128] hover:bg-[#101b3d] text-white text-xs font-semibold transition-colors disabled:opacity-40 cursor-pointer"
                >
                  {t("Proceed to Review & Test →", "Avançar para Revisão & Teste →")}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Review & Send Test Sample */}
          {composeStep === 2 && (
            <div className="space-y-5">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  {t("Pre-Dispatch Verification", "Verificação Prévia")}
                </h3>
                <p className="text-xs text-slate-600">
                  {t(
                    "Send an individual preview to verify formatting before confirming batch dispatch.",
                    "Dispare uma amostra individual para verificar a formatação antes do envio em massa."
                  )}
                </p>

                <div className="flex items-center gap-2 max-w-md">
                  <input
                    type="email"
                    placeholder="admin@overwatch.co.mz"
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs rounded border border-slate-300 text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => handleSendTestSample(composeTemplate)}
                    disabled={testSending || !testEmailAddress}
                    className="px-3 py-1.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold cursor-pointer"
                  >
                    {testSending ? t("Sending...", "A enviar...") : t("Send Sample", "Enviar Amostra")}
                  </button>
                </div>

                {testSuccessMsg && (
                  <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                    <span>{testSuccessMsg}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setComposeStep(1)}
                  className="px-3.5 py-1.5 rounded-md border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  {t("← Back to Settings", "← Voltar")}
                </button>
                <button
                  type="button"
                  onClick={() => setComposeConfirmOpen(true)}
                  className="px-4 py-2 rounded-md bg-[#0a1128] hover:bg-[#101b3d] text-white text-xs font-semibold cursor-pointer"
                >
                  {t(`Confirm & Dispatch (${targetRecipients.length} Recipients)`, `Confirmar & Disparar (${targetRecipients.length} Destinatárias)`)}
                </button>
              </div>
            </div>
          )}

          {/* Modal Confirmation */}
          {composeConfirmOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
              <div className="w-full max-w-md bg-white rounded-lg p-6 shadow-xl border border-slate-200 space-y-4">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <Send size={16} className="text-sky-600" />
                  <span>{t("Confirm Communication Dispatch", "Confirmar Envio de Mensagens")}</span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {t(
                    `You are about to dispatch official emails to ${targetRecipients.length} candidates. Each email contains individual tokens and parameters.`,
                    `Está prestes a disparar emails oficiais para ${targetRecipients.length} candidatas. Cada mensagem será processada com os parâmetros individuais.`
                  )}
                </p>

                <div className="p-3 rounded-md bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>{t("Template:", "Modelo:")}</span>
                    <strong className="text-slate-900">{composeTemplate}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>{t("Recipients:", "Destinatárias:")}</span>
                    <strong className="text-sky-700 font-mono">{targetRecipients.length}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setComposeConfirmOpen(false)}
                    className="px-3 py-1.5 rounded-md border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    {t("Cancel", "Cancelar")}
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteComposeDispatch}
                    disabled={composeDispatching}
                    className="px-3.5 py-1.5 rounded-md bg-[#0a1128] hover:bg-[#101b3d] text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {composeDispatching ? t("Dispatching...", "A disparar...") : t("Execute Dispatch", "Executar Envio")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: DELIVERY HISTORY / AUDIT LOG */}
      {/* ========================================================================= */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("Search logs by candidate, email or subject...", "Pesquisar por candidata, email ou assunto...")}
                className="w-full pl-9 pr-8 py-1.5 text-xs rounded-md border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-md border border-slate-300 text-slate-700 bg-white"
              >
                <option value="all">{t("All Template Types", "Todos os Modelos")}</option>
                <option value="next_phase">{t("Next Phase Notice", "Próxima Fase")}</option>
                <option value="convocation">{t("Test Convocation", "Convocatória")}</option>
                <option value="confirmation">{t("Confirmation", "Confirmação")}</option>
                <option value="closure">{t("Closure", "Encerramento")}</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-md border border-slate-300 text-slate-700 bg-white"
              >
                <option value="all">{t("All Delivery Statuses", "Todos os Estados")}</option>
                <option value="sent">{t("Sent", "Enviado")}</option>
                <option value="failed">{t("Failed", "Falhou")}</option>
              </select>

              {/* Response Filter */}
              <select
                value={responseFilter}
                onChange={(e) => setResponseFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-md border border-slate-300 text-slate-700 bg-white"
              >
                <option value="all">{t("All Responses", "Todas as Respostas")}</option>
                <option value="confirmed">{t("Confirmed (YES)", "Confirmou (SIM)")}</option>
                <option value="declined">{t("Declined (NO)", "Recusou (NÃO)")}</option>
                <option value="awaiting">{t("Awaiting Response", "Aguardando")}</option>
              </select>
            </div>
          </div>

          {/* Audit Log Table */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[0.65rem] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-2.5">{t("Candidate", "Candidata")}</th>
                  <th className="px-4 py-2.5">{t("Subject", "Assunto")}</th>
                  <th className="px-4 py-2.5">{t("Template Type", "Tipo")}</th>
                  <th className="px-4 py-2.5">{t("Delivery Status", "Estado")}</th>
                  <th className="px-4 py-2.5">{t("Candidate Response", "Resposta")}</th>
                  <th className="px-4 py-2.5 text-right">{t("Sent At", "Data e Hora")}</th>
                  <th className="px-4 py-2.5 text-right">{t("Action", "Ação")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      {t("No communication records match the search filter.", "Nenhum registo encontrado com os filtros actuais.")}
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((log, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{log.candidateName}</div>
                        <div className="text-[0.7rem] text-slate-400 font-mono">{log.recipient}</div>
                      </td>

                      <td className="px-4 py-3 font-medium text-slate-800 truncate max-w-xs">{log.subject}</td>

                      <td className="px-4 py-3 text-slate-500 capitalize text-[0.75rem]">
                        {log.type.replace(/_/g, " ")}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {log.status.toUpperCase()}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {log.response === "confirmed" ? (
                          <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            {t("Confirmed YES", "Confirmou SIM")}
                          </span>
                        ) : log.response === "declined" ? (
                          <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            {t("Declined NO", "Recusou NÃO")}
                          </span>
                        ) : log.response === "awaiting" ? (
                          <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            {t("Awaiting Response", "Aguardando")}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-[0.7rem] text-slate-500 whitespace-nowrap">
                        {new Date(log.sentAt).toLocaleString("pt-MZ")}
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {log.candidateId ? (
                          <Link
                            href={`/admin/recruitment/candidates/${log.candidateId}`}
                            className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors"
                          >
                            {t("Profile", "Perfil")}
                          </Link>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REALISTIC LETTERHEAD PREVIEW MODAL WITH DEVICE SWITCHER */}
      {/* ========================================================================= */}
      {previewTemplateId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white rounded-lg shadow-xl border border-slate-200 space-y-0 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header & Device Switcher */}
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  {t("Letterhead Preview", "Pré-visualização do Modelo")}
                </h3>
                <p className="text-[0.7rem] text-slate-500">
                  {previewTemplateId === "next_phase"
                    ? "Próxima Fase – Condições e Disponibilidade"
                    : previewTemplateId === "convocation"
                    ? "Convocatória para Teste Presencial"
                    : previewTemplateId === "confirmation"
                    ? "Confirmação de Disponibilidade"
                    : "Agradecimento e Encerramento"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center p-0.5 bg-slate-200 rounded border border-slate-300">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("desktop")}
                    className={`p-1 rounded cursor-pointer ${previewDevice === "desktop" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"}`}
                    title="Desktop Preview"
                  >
                    <Monitor size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("mobile")}
                    className={`p-1 rounded cursor-pointer ${previewDevice === "mobile" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"}`}
                    title="Mobile Preview"
                  >
                    <Smartphone size={13} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewTemplateId(null)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Rendered Email Preview Container */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#f8fafc] admin-scrollbar flex justify-center">
              <div
                className={`bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs transition-all duration-200 ${
                  previewDevice === "mobile" ? "w-[340px]" : "w-full max-w-xl"
                }`}
              >
                {/* Brand Bar */}
                <div className="h-1 bg-[#0b1329]" />

                {/* Email Header */}
                <div className="p-5 border-b border-slate-100 bg-white">
                  <span className="text-[0.65rem] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                    Overwatch • Recrutamento CCO 2026
                  </span>
                  <h2 className="text-base font-bold text-[#0b1329] tracking-tight">
                    {previewTemplateId === "next_phase"
                      ? "Próxima Fase do Processo de Selecção"
                      : previewTemplateId === "convocation"
                      ? "Convocatória para Teste Presencial"
                      : previewTemplateId === "confirmation"
                      ? "Confirmação – Processo de Selecção Overwatch"
                      : "Processo de Selecção Overwatch"}
                  </h2>
                </div>

                {/* Email Body */}
                <div className="p-5 text-xs text-slate-700 space-y-3.5 leading-relaxed">
                  <p className="font-semibold text-slate-900">
                    Prezada Candidata <span className="text-sky-700">[Nome da Candidata]</span>,
                  </p>

                  {previewTemplateId === "next_phase" && (
                    <>
                      <p>
                        Agradecemos a sua participação no processo de selecção para a função de <strong>Operadora de CCO</strong> da Overwatch.
                      </p>
                      <p>
                        O seu resultado no teste (<strong className="text-slate-900">mais de 80%</strong>) permitiu-lhe avançar para consideração na próxima fase do processo.
                      </p>
                      <p>
                        Antes de prosseguirmos, gostaríamos de assegurar que compreende e aceita as condições previstas para esta etapa:
                      </p>
                      <div className="bg-slate-50 border-l-2 border-[#0b1329] p-3 rounded-r space-y-1.5 text-[0.72rem] text-slate-800">
                        <div>• <strong>10 dias de formação inicial</strong>, sem remuneração;</div>
                        <div>• Caso seja seleccionada após essa formação, seguirá para um período de <strong>3 meses de formação prática</strong>, com uma remuneração mensal de <strong>9.000 MZN</strong>;</div>
                        <div>• Após a conclusão satisfatória desse período, a remuneração mensal poderá chegar a <strong>12.000 MZN</strong>, de acordo com o desempenho e enquadramento na função;</div>
                        <div>• O regime de trabalho previsto é de <strong>12 horas por turno</strong>, numa rotação de: <span className="font-semibold text-slate-900">2 turnos de dia + 2 turnos de noite + 2 dias de folga</span>.</div>
                      </div>
                      <p className="font-medium text-slate-900 pt-1">
                        Neste momento, gostaríamos apenas de saber se, tendo conhecimento destas condições, continua interessada em ser considerada para a próxima fase do processo de selecção.
                      </p>
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
                    </>
                  )}

                  {previewTemplateId === "convocation" && (
                    <>
                      <p>
                        Temos o prazer de informar que a sua candidatura foi seleccionada para a fase de testes presenciais.
                      </p>
                      <div className="bg-slate-50 border-l-2 border-sky-600 p-3 rounded-r space-y-1 text-[0.72rem] text-slate-800">
                        <div><strong>Data & Turno:</strong> [Turno Agendado]</div>
                        <div><strong>Local:</strong> Instalações da Overwatch, Maputo</div>
                        <div><strong>Documentação Obrigatória:</strong> BI ou Passaporte válido e CV impresso</div>
                      </div>
                      <p>
                        Pedimos que compareça com 15 minutos de antecedência.
                      </p>
                    </>
                  )}

                  {previewTemplateId === "confirmation" && (
                    <>
                      <p>
                        Obrigada pela sua confirmação e pelo interesse em continuar no processo de selecção da Overwatch.
                      </p>
                      <p>
                        Entraremos em contacto brevemente com as próximas instruções relativas à fase seguinte da formação.
                      </p>
                    </>
                  )}

                  {previewTemplateId === "closure" && (
                    <>
                      <p>
                        Obrigada pela sua resposta e pela participação no processo de selecção da Overwatch.
                      </p>
                      <p>
                        Agradecemos o seu interesse e desejamos-lhe sucesso nas suas próximas oportunidades profissionais. Esperamos poder voltar a contar com a sua candidatura no futuro.
                      </p>
                    </>
                  )}

                  <div className="pt-4 border-t border-slate-100 text-xs">
                    <p className="text-slate-500">Com os melhores cumprimentos,</p>
                    <p className="font-bold text-[#0b1329] mt-0.5">Overwatch</p>
                  </div>
                </div>

                {/* Email Footer */}
                <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 text-center">
                  <p className="text-[0.65rem] text-slate-400">
                    © 2026 Overwatch Moçambique. Todos os direitos reservados.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between bg-white">
              <span className="text-[0.7rem] text-slate-400">
                {t("Preview is rendered in official letterhead layout", "A pré-visualização reproduz o cabeçalho e rodapé oficiais")}
              </span>
              <button
                type="button"
                onClick={() => setPreviewTemplateId(null)}
                className="px-3.5 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
              >
                {t("Close Preview", "Fechar")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
