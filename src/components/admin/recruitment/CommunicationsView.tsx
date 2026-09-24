"use client";

import React, { useState } from "react";
import {
  Mail,
  Search,
  Send,
  CheckCircle2,
  AlertCircle,
  Eye,
  Sparkles,
  Clock,
  X,
} from "lucide-react";
import { Application } from "@/lib/careers";

interface CommunicationsViewProps {
  applications: Application[];
  lang: "pt" | "en";
}

export const CommunicationsView: React.FC<CommunicationsViewProps> = ({
  applications,
  lang,
}) => {
  const t = (en: string, pt: string) => (lang === "en" ? en : pt);
  const [searchQuery, setSearchQuery] = useState("");
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [testEmailType, setTestEmailType] = useState<"convocation" | "next_phase">("next_phase");
  const [testSending, setTestSending] = useState(false);
  const [testSuccessMsg, setTestSuccessMsg] = useState<string | null>(null);

  // Aggregate communication logs across all candidates
  const allCommunications = React.useMemo(() => {
    const list: Array<{
      id: string;
      candidateName: string;
      candidateId: string;
      type: string;
      subject: string;
      recipient: string;
      sentAt: string;
      status: string;
    }> = [];

    applications.forEach((app) => {
      if (app.communications && Array.isArray(app.communications)) {
        app.communications.forEach((comm) => {
          list.push({
            id: comm.id,
            candidateName: app.name,
            candidateId: app.id,
            type: comm.type,
            subject: comm.subject,
            recipient: comm.recipient,
            sentAt: comm.sentAt,
            status: comm.status,
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

  const filteredLogs = allCommunications.filter((log) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return log.candidateName.toLowerCase().includes(q) || log.recipient.toLowerCase().includes(q) || log.subject.toLowerCase().includes(q);
  });

  const handleSendTest = async () => {
    if (!testEmailAddress || !testEmailAddress.includes("@")) {
      alert(t("Please enter a valid email address.", "Por favor indique um email válido."));
      return;
    }

    setTestSending(true);
    setTestSuccessMsg(null);
    try {
      if (testEmailType === "next_phase") {
        const res = await fetch("/api/admin/careers/next-phase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "preview", previewEmail: testEmailAddress.trim() }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setTestSuccessMsg(t(`Sample preview email sent to ${testEmailAddress}.`, `Email de teste enviado com sucesso para ${testEmailAddress}.`));
        } else {
          alert(data.error || "Failed to send test email");
        }
      } else {
        const res = await fetch("/api/admin/careers/test-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "convocation", toEmail: testEmailAddress.trim() }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setTestSuccessMsg(t(`Test email sent to ${testEmailAddress}.`, `Email de teste enviado para ${testEmailAddress}.`));
        } else {
          alert(data.error || "Failed to send test email");
        }
      }
    } catch (err: any) {
      alert(err.message || "Network error");
    } finally {
      setTestSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {t("Communications & Dispatch Logs", "Comunicações & Registo de Envios")}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t(
              "Central delivery audit logs, email templates and test preview testing",
              "Histórico unificado de notificações, modelos oficiais e testes de envio"
            )}
          </p>
        </div>
      </div>

      {/* Test Sender Tool */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles size={14} className="text-sky-600" />
          <span>{t("Send Test Sample Email", "Testar Envio de Notificações")}</span>
        </h2>
        <p className="text-xs text-slate-500">
          {t(
            "Send an individual preview to yourself to verify inbox formatting and visual presentation.",
            "Dispare um email de teste para a sua caixa de correio para validar a formatação visual."
          )}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={testEmailType}
            onChange={(e) => setTestEmailType(e.target.value as any)}
            className="px-3 py-1.5 text-xs rounded border border-slate-300 text-slate-700 bg-white"
          >
            <option value="next_phase">{t("Next Phase Conditions Notice", "Notificação da Próxima Fase")}</option>
            <option value="convocation">{t("Test Booking Convocation", "Convocatória para Teste Presencial")}</option>
          </select>

          <input
            type="email"
            placeholder="admin@overwatch.co.mz"
            value={testEmailAddress}
            onChange={(e) => setTestEmailAddress(e.target.value)}
            className="flex-1 min-w-[200px] max-w-sm px-3 py-1.5 text-xs rounded border border-slate-300 text-slate-900 placeholder-slate-400"
          />

          <button
            type="button"
            onClick={handleSendTest}
            disabled={testSending || !testEmailAddress}
            className="px-3.5 py-1.5 rounded bg-[#0a1128] hover:bg-[#101b3d] text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
          >
            {testSending ? t("Sending...", "A enviar...") : t("Send Test Sample", "Disparar Teste")}
          </button>
        </div>

        {testSuccessMsg && (
          <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-600" />
            <span>{testSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* Communications Audit Log Table */}
      <div className="space-y-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("Search communications by recipient or subject...", "Pesquisar por destinatário ou assunto...")}
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

          <span className="text-xs text-slate-500">
            {filteredLogs.length} {t("dispatches recorded", "envios registados")}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[0.65rem] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-2.5">{t("Recipient", "Destinatário")}</th>
                <th className="px-4 py-2.5">{t("Message Subject", "Assunto")}</th>
                <th className="px-4 py-2.5">{t("Template Type", "Tipo")}</th>
                <th className="px-4 py-2.5">{t("Status", "Estado")}</th>
                <th className="px-4 py-2.5 text-right">{t("Sent At", "Data e Hora")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400 text-xs">
                    {t("No communication events found.", "Nenhum registo de comunicação encontrado.")}
                  </td>
                </tr>
              ) : (
                filteredLogs.slice(0, 50).map((log, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{log.candidateName}</div>
                      <div className="text-[0.7rem] text-slate-400">{log.recipient}</div>
                    </td>

                    <td className="px-4 py-3 text-slate-800 font-medium truncate max-w-xs">
                      {log.subject}
                    </td>

                    <td className="px-4 py-3 text-slate-500 capitalize text-[0.75rem]">
                      {log.type.replace(/_/g, " ")}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {log.status.toUpperCase()}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right text-slate-500 font-mono text-[0.7rem] whitespace-nowrap">
                      {new Date(log.sentAt).toLocaleString("pt-MZ")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
