"use client";

import { useState } from "react";
import {
  X,
  Plus,
  Trash2,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Layers,
  Sparkles,
} from "lucide-react";
import type {
  CareerRoleDefinition,
  PipelineStageKey,
  ScreeningRule,
} from "@/lib/careers-models";
import { ALL_PIPELINE_STAGES } from "@/lib/careers-models";
import { useAdminLanguage } from "../shell/AdminLanguageContext";
import OverwatchOrbitLoader from "@/components/admin/ui/OverwatchOrbitLoader";

interface RoleConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleToEdit?: CareerRoleDefinition | null;
  onSaveRole: (role: CareerRoleDefinition) => Promise<void>;
}

export default function RoleConfigModal({
  isOpen,
  onClose,
  roleToEdit,
  onSaveRole,
}: RoleConfigModalProps) {
  const { lang, t } = useAdminLanguage();
  const isEditing = Boolean(roleToEdit);

  const [id, setId] = useState(roleToEdit?.id || "");
  const [pt, setPt] = useState(roleToEdit?.pt || "");
  const [en, setEn] = useState(roleToEdit?.en || "");
  const [department, setDepartment] = useState(
    roleToEdit?.department || (lang === "en" ? "Operations" : "Operações"),
  );
  const [descriptionPt, setDescriptionPt] = useState(roleToEdit?.descriptionPt || "");
  const [open, setOpen] = useState(roleToEdit?.open ?? true);

  const [stages, setStages] = useState<PipelineStageKey[]>(
    roleToEdit?.pipelineStages || [
      "applications",
      "screening",
      "interview",
      "hired",
    ],
  );

  const [rules, setRules] = useState<ScreeningRule[]>(
    roleToEdit?.screeningRules || [],
  );

  // New Rule form state
  const [newRuleField, setNewRuleField] = useState("");
  const [newRuleLabelPt, setNewRuleLabelPt] = useState("");
  const [newRuleLabelEn, setNewRuleLabelEn] = useState("");
  const [newRuleType, setNewRuleType] = useState<"boolean" | "number">("boolean");
  const [newRuleMandatory, setNewRuleMandatory] = useState(true);
  const [newRuleValue, setNewRuleValue] = useState("yes");

  const [activeTab, setActiveTab] = useState<"details" | "pipeline" | "screening">("details");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const toggleStage = (stageKey: PipelineStageKey) => {
    // Keep applications and hired always enabled
    if (stageKey === "applications" || stageKey === "hired") return;

    if (stages.includes(stageKey)) {
      setStages(stages.filter((s) => s !== stageKey));
    } else {
      setStages([...stages, stageKey]);
    }
  };

  const handleAddRule = () => {
    if (!newRuleField.trim() || !newRuleLabelPt.trim()) {
      setErrorMsg(
        t(
          "Please specify the form field key and rule label.",
          "Preencha o identificador do campo e o título da regra.",
        ),
      );
      return;
    }

    const newRule: ScreeningRule = {
      id: `rule_${Date.now()}`,
      field: newRuleField.trim().replace(/\s+/g, "_"),
      labelPt: newRuleLabelPt.trim(),
      labelEn: newRuleLabelEn.trim() || newRuleLabelPt.trim(),
      type: newRuleType,
      mandatory: newRuleMandatory,
      expectedValue: newRuleType === "number" ? Number(newRuleValue) || 1 : newRuleValue,
      weight: newRuleMandatory ? undefined : 1,
    };

    setRules([...rules, newRule]);
    setNewRuleField("");
    setNewRuleLabelPt("");
    setNewRuleLabelEn("");
    setNewRuleValue(newRuleType === "number" ? "1" : "yes");
    setErrorMsg("");
  };

  const handleDeleteRule = (ruleId: string) => {
    setRules(rules.filter((r) => r.id !== ruleId));
  };

  const handleSave = async () => {
    if (!pt.trim()) {
      setErrorMsg(
        t(
          "The job role title in Portuguese is required.",
          "O título da vaga em Português é obrigatório.",
        ),
      );
      return;
    }

    const slug = id.trim()
      ? id.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_")
      : pt.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");

    const payload: CareerRoleDefinition = {
      id: slug,
      pt: pt.trim(),
      en: en.trim() || pt.trim(),
      department: department.trim() || (lang === "en" ? "Operations" : "Operações"),
      descriptionPt: descriptionPt.trim(),
      open,
      activeCohortId: roleToEdit?.activeCohortId || null,
      pipelineStages: stages,
      screeningRules: rules,
      createdAt: roleToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setIsSaving(true);
    setErrorMsg("");
    try {
      await onSaveRole(payload);
      onClose();
    } catch (err: any) {
      setErrorMsg(
        err.message ||
          t("Failed to save role configuration.", "Erro ao gravar configuração da vaga."),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 border border-slate-200 text-[#0a1128]">
              <Sliders size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isEditing
                  ? `${t("Configure Role:", "Configurar Vaga:")} ${lang === "en" && en ? en : pt}`
                  : t("Create New Recruitment Role", "Criar Nova Vaga de Recrutamento")}
              </h3>
              <p className="text-xs text-slate-500">
                {t(
                  "Customize role pipeline stages and automated CV screening rules.",
                  "Personalize o pipeline de fases e as regras de triagem automática de currículos.",
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            title={t("Close", "Fechar")}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigator */}
        <div className="flex border-b border-slate-200 bg-white px-6">
          <button
            onClick={() => setActiveTab("details")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-colors ${
              activeTab === "details"
                ? "border-[#0a1128] text-[#0a1128]"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <span>{t("1. Role Details", "1. Informações da Vaga")}</span>
          </button>
          <button
            onClick={() => setActiveTab("pipeline")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-colors ${
              activeTab === "pipeline"
                ? "border-[#0a1128] text-[#0a1128]"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Layers size={14} />
            <span>
              {t("2. Pipeline Stages", "2. Pipeline & Fases")} ({stages.length})
            </span>
          </button>
          <button
            onClick={() => setActiveTab("screening")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-colors ${
              activeTab === "screening"
                ? "border-[#0a1128] text-[#0a1128]"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Sparkles size={14} />
            <span>
              {t("3. CV Screening Rules", "3. Regras de Triagem CV")} ({rules.length})
            </span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: DETAILS */}
          {activeTab === "details" && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    {t("Job Title (Portuguese) *", "Título da Vaga (Português) *")}
                  </label>
                  <input
                    type="text"
                    value={pt}
                    onChange={(e) => setPt(e.target.value)}
                    placeholder={t("e.g. CCTV Technical Operator", "Ex: Gestor de Segurança e Acessos")}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0a1128] focus:ring-1 focus:ring-[#0a1128] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    {t("Job Title (English)", "Título da Vaga (Inglês)")}
                  </label>
                  <input
                    type="text"
                    value={en}
                    onChange={(e) => setEn(e.target.value)}
                    placeholder={t("e.g. Access Control & Security Manager", "Ex: Access Control & Security Manager")}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0a1128] focus:ring-1 focus:ring-[#0a1128] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    {t("System Identifier / Slug", "Identificador / Slug do Sistema")}
                  </label>
                  <input
                    type="text"
                    value={id}
                    disabled={isEditing}
                    onChange={(e) => setId(e.target.value)}
                    placeholder="cctv_security_lead"
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 disabled:opacity-75 focus:border-[#0a1128] focus:ring-1 focus:ring-[#0a1128] focus:outline-none font-mono"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    {t("Auto-generated if left empty", "Automático se vazio")}
                  </span>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    {t("Department / Division", "Departamento / Área")}
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder={t("e.g. Technical Engineering", "Ex: Engenharia Técnica")}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0a1128] focus:ring-1 focus:ring-[#0a1128] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  {t("Role Summary & Scope", "Resumo da Vaga & Responsabilidades")}
                </label>
                <textarea
                  value={descriptionPt}
                  onChange={(e) => setDescriptionPt(e.target.value)}
                  rows={3}
                  placeholder={t(
                    "Key duties, technical skills, and scope of responsibilities...",
                    "Descrição técnica das principais atividades e escopo da posição...",
                  )}
                  className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0a1128] focus:ring-1 focus:ring-[#0a1128] focus:outline-none resize-none"
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    {t("Initial Role Status", "Estado Inicial da Vaga")}
                  </span>
                  <span className="text-xs text-slate-500">
                    {t(
                      "Defines if this role is currently open for public applications on the website.",
                      "Define se a vaga fica aberta para recepção pública de candidaturas no website.",
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(!open)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    open ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                      open ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: MODULAR PIPELINE STAGES */}
          {activeTab === "pipeline" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                {t(
                  "Not all job roles require physical aptitude testing or gate pass check-in. Select only the stages that apply to this role:",
                  "Nem todas as vagas exigem testes de aptidão ou validação de portaria. Selecione apenas as fases que fazem sentido para este cargo:",
                )}
              </p>

              <div className="grid gap-3">
                {ALL_PIPELINE_STAGES.map((stage) => {
                  const isEnabled = stages.includes(stage.key);
                  const isLocked = stage.key === "applications" || stage.key === "hired";

                  return (
                    <div
                      key={stage.key}
                      onClick={() => !isLocked && toggleStage(stage.key)}
                      className={`flex items-center justify-between rounded-xl border p-4 transition-all cursor-pointer select-none ${
                        isEnabled
                          ? "border-[#0a1128]/30 bg-slate-50/90 shadow-xs"
                          : "border-slate-200 bg-white opacity-60 hover:opacity-100"
                      } ${isLocked ? "cursor-default" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border ${
                            isEnabled
                              ? "border-[#0a1128] bg-[#0a1128] text-white"
                              : "border-slate-300 bg-white text-transparent"
                          }`}
                        >
                          <CheckCircle2 size={14} className={isEnabled ? "block" : "hidden"} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              {lang === "en" ? stage.labelEn : stage.labelPt}
                            </span>
                            {isLocked && (
                              <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-700">
                                {t("Mandatory", "Mandatório")}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {lang === "en" ? stage.descriptionEn : stage.descriptionPt}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                          isEnabled
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        {isEnabled
                          ? t("Active", "Ativa")
                          : t("Disabled", "Desativada")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: CUSTOM SCREENING RULES */}
          {activeTab === "screening" && (
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-1">
                  {t("Active CV Screening Rules", "Regras Ativas de Triagem Automática")}
                </h4>
                <p className="text-xs text-slate-500 mb-4">
                  {t(
                    "The system automatically screens incoming applications using these rules. Mandatory rules immediately flag unqualified candidates.",
                    "O sistema avalia cada candidato automaticamente com base nestes critérios. Requisitos mandatórios causam exclusão direta caso não sejam cumpridos.",
                  )}
                </p>

                {rules.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                    {t(
                      "No screening rules configured. All applicants will pass screening by default.",
                      "Nenhuma regra configurada. Todas as candidaturas serão marcadas como aptas por padrão.",
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {rules.map((rule, idx) => (
                      <div
                        key={rule.id || idx}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                              rule.mandatory
                                ? "border-rose-200 bg-rose-50 text-rose-700"
                                : "border-blue-200 bg-blue-50 text-blue-700"
                            }`}
                          >
                            {rule.mandatory
                              ? t("Mandatory (Pass/Fail)", "Obrigatório (Pass/Fail)")
                              : t("Preferred (Score)", "Preferencial (Pontuação)")}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">
                              {lang === "en" && rule.labelEn ? rule.labelEn : rule.labelPt}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {t("Field:", "Campo:")} {rule.field} = {String(rule.expectedValue)}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteRule(rule.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title={t("Delete rule", "Remover regra")}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Rule Form */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <Plus size={14} />
                  <span>{t("Add New Screening Rule", "Adicionar Nova Regra de Triagem")}</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      {t("Form Field Key *", "Identificador do Campo (Formulário) *")}
                    </label>
                    <input
                      type="text"
                      value={newRuleField}
                      onChange={(e) => setNewRuleField(e.target.value)}
                      placeholder={t("e.g. drivingLicence, ipCctv, yearsExp", "Ex: drivingLicence, ipCctv, anosExp")}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 font-mono focus:border-[#0a1128] focus:ring-1 focus:ring-[#0a1128] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      {t("Rule Title (Portuguese) *", "Título da Regra (Português) *")}
                    </label>
                    <input
                      type="text"
                      value={newRuleLabelPt}
                      onChange={(e) => setNewRuleLabelPt(e.target.value)}
                      placeholder={t("e.g. Valid Driver's License", "Ex: Possui Carta de Condução Válida")}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0a1128] focus:ring-1 focus:ring-[#0a1128] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      {t("Verification Type", "Tipo de Verificação")}
                    </label>
                    <select
                      value={newRuleType}
                      onChange={(e) => {
                        const val = e.target.value as "boolean" | "number";
                        setNewRuleType(val);
                        setNewRuleValue(val === "number" ? "1" : "yes");
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#0a1128] focus:ring-1 focus:ring-[#0a1128] focus:outline-none"
                    >
                      <option value="boolean">{t("Yes / No (Boolean)", "Sim / Não (Booleano)")}</option>
                      <option value="number">{t("Numeric Value (Minimum)", "Valor Numérico (Mínimo)")}</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      {t("Rule Classification", "Classificação da Regra")}
                    </label>
                    <select
                      value={newRuleMandatory ? "mandatory" : "preferred"}
                      onChange={(e) => setNewRuleMandatory(e.target.value === "mandatory")}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#0a1128] focus:ring-1 focus:ring-[#0a1128] focus:outline-none"
                    >
                      <option value="mandatory">{t("Mandatory (Pass / Fail)", "Obrigatório (Pass / Fail)")}</option>
                      <option value="preferred">{t("Preferred (Score Bonus)", "Preferencial (Bónus / Score)")}</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      {t("Expected Value", "Valor Esperado")}
                    </label>
                    <input
                      type="text"
                      value={newRuleValue}
                      onChange={(e) => setNewRuleValue(e.target.value)}
                      placeholder={newRuleType === "number" ? "1" : "yes"}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 font-mono focus:border-[#0a1128] focus:ring-1 focus:ring-[#0a1128] focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddRule}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 border border-slate-300 hover:bg-slate-100 transition-colors"
                >
                  <Plus size={14} />
                  <span>{t("Add Rule", "Adicionar Regra")}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 bg-slate-50/70">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {t("Cancel", "Cancelar")}
          </button>

          <div className="flex items-center gap-3">
            {isSaving ? (
              <OverwatchOrbitLoader label={t("Saving role...", "A gravar vaga...")} size="sm" />
            ) : (
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0a1128] hover:bg-[#121c3b] px-5 py-2 text-xs font-semibold text-white shadow-xs transition-all active:scale-[0.98]"
              >
                <CheckCircle2 size={15} />
                <span>
                  {isEditing
                    ? t("Save Changes", "Guardar Alterações")
                    : t("Create & Activate Role", "Criar e Ativar Vaga")}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
