"use client";

import { RoleTestSlotSettings } from "./RoleTestSlotSettings";
import React, { useState, useEffect, useCallback } from "react";
import { Save, CheckCircle2, Mail, SlidersHorizontal, Users, Archive, Activity } from "lucide-react";
import { useAdminLanguage } from "../shell/AdminLanguageContext";
import type { CareerCohort, CareerRoleDefinition } from "@/lib/careers-models";
import { cycleLabel } from "@/lib/careers-cycle-label";
import { sameRole } from "@/lib/careers-workflow";

interface SettingsViewProps {
  lang?: "pt" | "en";
}

type CycleOption = {
  key: string;
  roleId: string;
  cohortId: string | null;
  label: string;
  isOpen: boolean;
  status: "active" | "closed" | "archived";
  applicationQuota: number | null;
  receivedCount: number;
};

export const SettingsView: React.FC<SettingsViewProps> = ({ lang: propLang }) => {
  const { lang: contextLang } = useAdminLanguage();
  const lang = propLang ?? contextLang;
  const t = (en: string, pt: string) => (lang === "en" ? en : pt);

  const [defaultQuota, setDefaultQuota] = useState(15);
  const [senderName, setSenderName] = useState("Overwatch Recrutamento");
  const [replyToEmail, setReplyToEmail] = useState("info@overwatchmoz.com");
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Per-role cycle / cohort Application Intake Quota & Live Tracker state
  const [cycleOptions, setCycleOptions] = useState<CycleOption[]>([]);
  const [selectedCycleKey, setSelectedCycleKey] = useState<string>("");
  const [appQuotaInput, setAppQuotaInput] = useState<string>("");
  const [quotaSaving, setQuotaSaving] = useState(false);
  const [quotaNotice, setQuotaNotice] = useState<string>("");

  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  const fetchCycleTracker = useCallback(
    async (preserveInput = false) => {
      try {
        const res = await fetch("/api/admin/careers/roles-manager", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const roles: CareerRoleDefinition[] = data.roles || [];
        const cohorts: CareerCohort[] = (data.cohorts || []).filter((c: CareerCohort) => !c.unassigned);
        const counts: Record<string, number> = data.applicationCounts || {};

        const built: CycleOption[] = [];
        for (const role of roles) {
          const roleCohorts = cohorts.filter((c) => sameRole(c.roleId, role.id));
          if (roleCohorts.length === 0) {
            built.push({
              key: `role:${role.id}`,
              roleId: role.id,
              cohortId: role.activeCohortId || null,
              label: `${lang === "en" ? role.en : role.pt} — ${
                role.open ? t("Active Cycle (Open)", "Ciclo Activo (Aberto)") : t("Closed", "Fechado")
              }`,
              isOpen: Boolean(role.open),
              status: role.open ? "active" : "closed",
              applicationQuota: role.applicationQuota ?? null,
              receivedCount: counts[`role:${role.id}`] ?? 0,
            });
          } else {
            for (const c of roleCohorts) {
              const isCurrentActive =
                c.status === "active" || Boolean(role.open && role.activeCohortId === c.id);
              built.push({
                key: `cohort:${c.id}`,
                roleId: role.id,
                cohortId: c.id,
                label: `${cycleLabel(c, role, lang)} (${
                  isCurrentActive && role.open
                    ? t("Open · Active Intake", "Aberto · Recepção Activa")
                    : t("Closed / Archived", "Fechado / Arquivado")
                })`,
                isOpen: Boolean(isCurrentActive && role.open),
                status: isCurrentActive && role.open ? "active" : "closed",
                applicationQuota: c.applicationQuota ?? (isCurrentActive ? role.applicationQuota ?? null : null),
                receivedCount: counts[c.id] ?? counts[`role:${role.id}`] ?? 0,
              });
            }
          }
        }

        // Put open cycles first
        built.sort((a, b) => Number(b.isOpen) - Number(a.isOpen));
        setCycleOptions(built);

        setSelectedCycleKey((prev) => {
          const chosenKey = prev && built.some((o) => o.key === prev) ? prev : built[0]?.key || "";
          if (!preserveInput) {
            const match = built.find((o) => o.key === chosenKey);
            if (match) {
              setAppQuotaInput(match.applicationQuota ? String(match.applicationQuota) : "");
            }
          }
          return chosenKey;
        });
      } catch {
        // Silent background refresh
      }
    },
    [lang],
  );

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch("/api/admin/settings", { cache: "no-store", signal: controller.signal }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setDefaultQuota(data.quota);
        setSenderName(data.senderName);
        setReplyToEmail(data.replyToEmail);
        setLoaded(true);
      }),
      fetchCycleTracker(false),
    ])
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });

    const interval = setInterval(() => {
      void fetchCycleTracker(true);
    }, 4000);
    const onFocus = () => void fetchCycleTracker(true);
    window.addEventListener("focus", onFocus);

    return () => {
      controller.abort();
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchCycleTracker]);

  const activeCycle = cycleOptions.find((o) => o.key === selectedCycleKey) || cycleOptions[0] || null;

  const handleSelectCycle = (newKey: string) => {
    setSelectedCycleKey(newKey);
    setQuotaNotice("");
    const match = cycleOptions.find((o) => o.key === newKey);
    setAppQuotaInput(match?.applicationQuota ? String(match.applicationQuota) : "");
  };

  const handleSaveApplicationQuota = async () => {
    if (!activeCycle) return;
    setQuotaSaving(true);
    setError("");
    setQuotaNotice("");
    try {
      const trimmed = appQuotaInput.trim();
      const parsedQuota = trimmed === "" || trimmed === "0" ? null : Number(trimmed);
      if (parsedQuota !== null && (!Number.isInteger(parsedQuota) || parsedQuota < 1 || parsedQuota > 50000)) {
        throw new Error(
          t(
            "Enter a valid application quota between 1 and 50,000 (or leave empty / 0 for no auto-close limit).",
            "Introduza uma quota válida de candidaturas entre 1 e 50.000 (ou deixe vazio / 0 para sem limite automático).",
          ),
        );
      }

      const res = await fetch("/api/admin/careers/roles-manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_application_quota",
          roleId: activeCycle.roleId,
          cohortId: activeCycle.cohortId,
          applicationQuota: parsedQuota,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save application quota");

      await fetchCycleTracker(false);
      if (data.autoClosed) {
        setQuotaNotice(
          t(
            `Quota (${parsedQuota}) reached with ${data.receivedCount} applications — Role automatically closed & archived!`,
            `Quota (${parsedQuota}) atingida com ${data.receivedCount} candidaturas — Vaga encerrada e arquivada automaticamente!`,
          ),
        );
      } else {
        setQuotaNotice(
          parsedQuota
            ? t(
                `Application quota saved (${parsedQuota} applications). Role will auto-close & archive once reached.`,
                `Quota guardada (${parsedQuota} candidaturas). A vaga encerrará e será arquivada automaticamente ao atingir o limite.`,
              )
            : t(
                "Auto-close application quota cleared for this cycle.",
                "Limite automático de candidaturas removido para este ciclo.",
              ),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save application quota");
    } finally {
      setQuotaSaving(false);
    }
  };

  const handleSave = async () => {
    setBusy(true);
    setError("");
    setSavedSuccess(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quota: defaultQuota, senderName, replyToEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (activeCycle) {
        await handleSaveApplicationQuota();
      }
      setSavedSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save settings");
    } finally {
      setBusy(false);
    }
  };

  const effectiveQuota =
    appQuotaInput.trim() !== "" && Number.isInteger(Number(appQuotaInput)) && Number(appQuotaInput) > 0
      ? Number(appQuotaInput)
      : activeCycle?.applicationQuota ?? null;
  const receivedCount = activeCycle?.receivedCount ?? 0;
  const remainingApplications =
    effectiveQuota !== null ? Math.max(0, effectiveQuota - receivedCount) : null;
  const progressPct =
    effectiveQuota && effectiveQuota > 0
      ? Math.min(100, Math.round((receivedCount / effectiveQuota) * 100))
      : 0;

  return (
    <div className="space-y-6 max-w-4xl">
      {error && (
        <p role="alert" className="rounded-lg border border-red-200 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {busy && <p role="status">{t("Loading / saving settings…", "A carregar / guardar configurações…")}</p>}

      {/* Header */}
      <div className="border-b border-slate-200 pb-3">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          {t("System Settings", "Configurações do Sistema")}
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {t(
            "Recruitment module parameters, role cycle application quotas, email defaults and operational limits",
            "Parâmetros do módulo de recrutamento, quotas de candidaturas por ciclo/vaga, definições de email e limites operacionais",
          )}
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <SlidersHorizontal size={14} className="text-slate-600" />
            <span>
              {t(
                "Recruitment Capacity Parameters · Role Cycle Application Quota",
                "Parâmetros de Capacidade de Recrutamento · Quota de Candidaturas por Ciclo",
              )}
            </span>
          </h2>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
            <Activity size={12} className="animate-pulse" />
            <span>{t("Live Auto-Close & Archive Tracker", "Rastreador em Tempo Real · Fecho e Arquivo Automático")}</span>
          </span>
        </div>

        {/* Role Cycle / Cohort Selector + Quota Input + Live Countdown Tracker */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left: Cycle Selector & Quota Input */}
          <div className="lg:col-span-7 space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {t("1. Select Role Cycle / Cohort", "1. Seleccionar Ciclo da Vaga / Lote")}
              </label>
              <select
                value={selectedCycleKey}
                onChange={(e) => handleSelectCycle(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-900 shadow-2xs"
              >
                {cycleOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label} — ({opt.receivedCount}{" "}
                    {opt.applicationQuota ? `/ ${opt.applicationQuota}` : ""}{" "}
                    {t("applications", "candidaturas")})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {t(
                  "2. Application Quota Needed for This Role Cycle / Cohort",
                  "2. Quota Total de Candidaturas para Este Ciclo / Lote",
                )}
              </label>
              <div className="flex flex-wrap items-center gap-2.5">
                <input
                  type="number"
                  min={0}
                  max={50000}
                  placeholder={t("e.g. 100 (or 0 for unlimited)", "ex: 100 (ou 0 para ilimitado)")}
                  value={appQuotaInput}
                  onChange={(e) => {
                    setAppQuotaInput(e.target.value);
                    setQuotaNotice("");
                  }}
                  className="w-36 px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-bold text-slate-900"
                />
                <span className="text-xs text-slate-600 font-medium">
                  {t("applications required", "candidaturas necessárias")}
                </span>
                <button
                  type="button"
                  disabled={quotaSaving || !activeCycle}
                  onClick={() => void handleSaveApplicationQuota()}
                  className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <Save size={12} />
                  <span>
                    {quotaSaving
                      ? t("Saving…", "A guardar…")
                      : t("Apply Cycle Quota", "Aplicar Quota ao Ciclo")}
                  </span>
                </button>
              </div>
              <p className="text-[0.7rem] text-slate-500 mt-2 leading-relaxed">
                {t(
                  "Scoped strictly to the selected role cycle/cohort above. As soon as this application quota is reached, the system automatically closes the role on the website and archives the recruitment cycle.",
                  "Aplicado exclusivamente ao ciclo/lote seleccionado acima. Assim que esta quota de candidaturas for atingida, o sistema encerra automaticamente a vaga no website e arquiva o ciclo de recrutamento.",
                )}
              </p>
              {quotaNotice && (
                <div className="mt-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                  <span>{quotaNotice}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Live Application Tracker & Countdown */}
          <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-900 to-[#0b1329] text-white p-4 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5 mb-3">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-300 font-bold flex items-center gap-1.5">
                  <Users size={12} className="text-emerald-400" />
                  {t("Live Intake Tracker", "Contador de Candidaturas ao Vivo")}
                </span>
                {activeCycle?.isOpen ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                    {t("Role Open", "Vaga Aberta")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                    <Archive size={10} />
                    {t("Closed & Archived", "Fechada e Arquivada")}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 my-2">
                <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                    {t("Received", "Recebidas")}
                  </div>
                  <div className="text-2xl font-extrabold text-white mt-0.5 tabular-nums">
                    {receivedCount}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {effectiveQuota
                      ? t(`of ${effectiveQuota} quota`, `de ${effectiveQuota} da quota`)
                      : t("total in cycle", "total no ciclo")}
                  </div>
                </div>

                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/25 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-emerald-300 font-semibold">
                    {t("Countdown Left", "Faltam p/ Fecho")}
                  </div>
                  <div className="text-2xl font-extrabold text-emerald-400 mt-0.5 tabular-nums">
                    {remainingApplications !== null ? remainingApplications : "∞"}
                  </div>
                  <div className="text-[10px] text-emerald-200/80 mt-0.5">
                    {remainingApplications === 0 && effectiveQuota
                      ? t("Quota reached!", "Quota atingida!")
                      : remainingApplications !== null
                        ? t("spots remaining", "vagas restantes")
                        : t("No limit set", "Sem limite definido")}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-white/10 space-y-1.5">
              {effectiveQuota ? (
                <>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300 font-medium">
                      {t("Quota Progress", "Progresso da Quota")}
                    </span>
                    <span className="font-mono font-bold text-emerald-400">{progressPct}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        progressPct >= 100
                          ? "bg-amber-400"
                          : progressPct >= 85
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                      }`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 leading-snug pt-0.5">
                    {remainingApplications === 0
                      ? t(
                          "✓ Quota reached — this cycle automatically closes & archives.",
                          "✓ Quota atingida — este ciclo fecha e arquiva automaticamente.",
                        )
                      : t(
                          `Auto-closes & archives after ${remainingApplications} more application${remainingApplications === 1 ? "" : "s"}.`,
                          `Fecha e arquiva automaticamente após mais ${remainingApplications} candidatura${remainingApplications === 1 ? "" : "s"}.`,
                        )}
                  </p>
                </>
              ) : (
                <p className="text-[11px] text-slate-400">
                  {t(
                    "Set an application quota on the left to enable live countdown and automatic role closure & archiving.",
                    "Defina uma quota à esquerda para activar a contagem decrescente e o fecho/arquivo automático da vaga.",
                  )}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Default Session Capacity (for Test Sessions) */}
        <div className="pt-3 border-t border-slate-100">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            {t("Default Test Session Capacity (Per Slot Fallback)", "Capacidade Padrão por Turno de Teste")}
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={200}
              value={defaultQuota}
              onChange={(e) => {
                setDefaultQuota(Number(e.target.value));
                setSavedSuccess(false);
              }}
              className="w-24 px-3 py-1.5 text-xs rounded border border-slate-300 font-bold text-slate-900"
            />
            <span className="text-xs text-slate-500">
              {t("candidates per test session", "candidatos por turno de teste")}
            </span>
          </div>
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
                onChange={(e) => {
                  setSenderName(e.target.value);
                  setSavedSuccess(false);
                }}
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
                onChange={(e) => {
                  setReplyToEmail(e.target.value);
                  setSavedSuccess(false);
                }}
                className="w-full max-w-md px-3 py-1.5 text-xs rounded border border-slate-300 text-slate-900"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            disabled={busy || !loaded}
            onClick={() => void handleSave()}
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
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
      <RoleTestSlotSettings />
    </div>
  );
};
