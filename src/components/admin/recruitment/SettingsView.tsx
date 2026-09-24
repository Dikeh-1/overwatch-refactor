"use client";

import React, { useState } from "react";
import { Settings, Save, CheckCircle2, ShieldCheck, Mail, SlidersHorizontal } from "lucide-react";

interface SettingsViewProps {
  lang: "pt" | "en";
}

export const SettingsView: React.FC<SettingsViewProps> = ({ lang }) => {
  const t = (en: string, pt: string) => (lang === "en" ? en : pt);

  const [defaultQuota, setDefaultQuota] = useState(15);
  const [senderName, setSenderName] = useState("Overwatch Recrutamento");
  const [replyToEmail, setReplyToEmail] = useState("info@overwatchmoz.com");
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="border-b border-slate-200 pb-3">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          {t("System Settings", "Configurações do Sistema")}
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {t(
            "Recruitment module parameters, email defaults and operational limits",
            "Parâmetros do módulo de recrutamento, definições de email e limites operacionais"
          )}
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-5">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <SlidersHorizontal size={14} className="text-slate-600" />
          <span>{t("Recruitment Capacity Parameters", "Parâmetros de Capacidade de Teste")}</span>
        </h2>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            {t("Default Session Capacity (Quota)", "Limite Padrão por Sessão de Teste (Quota)")}
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={50}
              value={defaultQuota}
              onChange={(e) => setDefaultQuota(parseInt(e.target.value, 10) || 15)}
              className="w-24 px-3 py-1.5 text-xs rounded border border-slate-300 font-bold text-slate-900"
            />
            <span className="text-xs text-slate-500">
              {t("candidates per session", "candidatas por turno")}
            </span>
          </div>
          <p className="text-[0.7rem] text-slate-400 mt-1">
            {t(
              "Sessions exceeding this threshold will display an explicit 'Over capacity · +X' operational warning.",
              "Sessões que ultrapassem este limite apresentarão um aviso operacional 'Capacidade excedida · +X'."
            )}
          </p>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 mb-3">
            <Mail size={14} className="text-slate-600" />
            <span>{t("Email Dispatch Defaults", "Definições de Envio de Email")}</span>
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t("Default Sender Display Name", "Nome de Apresentação do Remetente")}
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="w-full max-w-md px-3 py-1.5 text-xs rounded border border-slate-300 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t("Reply-To Email Address", "Endereço para Respostas (Reply-To)")}
              </label>
              <input
                type="email"
                value={replyToEmail}
                onChange={(e) => setReplyToEmail(e.target.value)}
                className="w-full max-w-md px-3 py-1.5 text-xs rounded border border-slate-300 text-slate-900"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-md bg-[#0a1128] hover:bg-[#101b3d] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Save size={13} />
            <span>{t("Save Settings", "Guardar Configurações")}</span>
          </button>

          {savedSuccess && (
            <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 size={14} />
              <span>{t("Settings saved successfully", "Configurações guardadas com sucesso")}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
