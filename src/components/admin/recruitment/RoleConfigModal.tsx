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
  const isEditing = Boolean(roleToEdit);

  const [id, setId] = useState(roleToEdit?.id || "");
  const [pt, setPt] = useState(roleToEdit?.pt || "");
  const [en, setEn] = useState(roleToEdit?.en || "");
  const [department, setDepartment] = useState(roleToEdit?.department || "Operações");
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
      setErrorMsg("Preencha o identificador do campo e o título da regra.");
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
      setErrorMsg("O título da vaga em Português é obrigatório.");
      return;
    }

    const slug = id.trim()
      ? id.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_")
      : pt.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");

    const payload: CareerRoleDefinition = {
      id: slug,
      pt: pt.trim(),
      en: en.trim() || pt.trim(),
      department: department.trim() || "Operações",
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
      setErrorMsg(err.message || "Erro ao gravar configuração da vaga.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070b14]/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-border bg-[#0d1322] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 px-6 py-4 bg-[#090e1a]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <Sliders size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isEditing ? `Configurar Vaga: ${pt}` : "Criar Nova Vaga de Recrutamento"}
              </h3>
              <p className="text-xs text-muted-foreground">
                Personalize o pipeline de fases e as regras de triagem automática de currículos.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigator */}
        <div className="flex border-b border-border/80 bg-[#070b14]/50 px-6">
          <button
            onClick={() => setActiveTab("details")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-colors ${
              activeTab === "details"
                ? "border-cyan-400 text-cyan-400"
                : "border-transparent text-muted-foreground hover:text-white"
            }`}
          >
            <span>1. Informações da Vaga</span>
          </button>
          <button
            onClick={() => setActiveTab("pipeline")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-colors ${
              activeTab === "pipeline"
                ? "border-cyan-400 text-cyan-400"
                : "border-transparent text-muted-foreground hover:text-white"
            }`}
          >
            <Layers size={14} />
            <span>2. Pipeline & Fases ({stages.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("screening")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-colors ${
              activeTab === "screening"
                ? "border-cyan-400 text-cyan-400"
                : "border-transparent text-muted-foreground hover:text-white"
            }`}
          >
            <Sparkles size={14} />
            <span>3. Regras de Triagem CV ({rules.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: DETAILS */}
          {activeTab === "details" && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                    Título da Vaga (Português) *
                  </label>
                  <input
                    type="text"
                    value={pt}
                    onChange={(e) => setPt(e.target.value)}
                    placeholder="Ex: Gestor de Segurança e Acessos"
                    className="w-full rounded-xl border border-border bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder:text-muted-foreground/40 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                    Título da Vaga (Inglês)
                  </label>
                  <input
                    type="text"
                    value={en}
                    onChange={(e) => setEn(e.target.value)}
                    placeholder="Ex: Access Control & Security Manager"
                    className="w-full rounded-xl border border-border bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder:text-muted-foreground/40 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                    Identificador / Slug do Sistema
                  </label>
                  <input
                    type="text"
                    value={id}
                    disabled={isEditing}
                    onChange={(e) => setId(e.target.value)}
                    placeholder="cctv_security_lead (automático se vazio)"
                    className="w-full rounded-xl border border-border bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder:text-muted-foreground/40 disabled:opacity-50 focus:border-cyan-400 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                    Departamento / Área
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Ex: Engenharia Técnica"
                    className="w-full rounded-xl border border-border bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder:text-muted-foreground/40 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Resumo da Vaga & Responsabilidades
                </label>
                <textarea
                  value={descriptionPt}
                  onChange={(e) => setDescriptionPt(e.target.value)}
                  rows={3}
                  placeholder="Descrição técnica das principais atividades e escopo da posição..."
                  className="w-full rounded-xl border border-border bg-black/40 p-3 text-sm text-white placeholder:text-muted-foreground/40 focus:border-cyan-400 focus:outline-none resize-none"
                />
              </div>

              <div className="rounded-xl border border-border bg-black/20 p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Estado Inicial da Vaga</span>
                  <span className="text-xs text-muted-foreground">
                    Define se a vaga fica aberta para recepção pública de candidaturas no website.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(!open)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    open ? "bg-emerald-500" : "bg-zinc-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
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
              <p className="text-xs text-slate-300 leading-relaxed">
                Nem todas as vagas exigem testes de aptidão ou validação de portaria. Selecione apenas as fases que fazem sentido para este cargo:
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
                          ? "border-cyan-500/40 bg-cyan-950/20"
                          : "border-border/60 bg-black/20 opacity-60 hover:opacity-100"
                      } ${isLocked ? "cursor-default" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border ${
                            isEnabled
                              ? "border-cyan-400 bg-cyan-500 text-black"
                              : "border-border bg-transparent text-transparent"
                          }`}
                        >
                          <CheckCircle2 size={14} className={isEnabled ? "block" : "hidden"} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{stage.labelPt}</span>
                            <span className="text-[10px] text-muted-foreground font-mono uppercase">
                              ({stage.labelEn})
                            </span>
                            {isLocked && (
                              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-slate-300">
                                Mandatório
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {stage.descriptionPt}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                          isEnabled
                            ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                            : "bg-white/5 text-muted-foreground"
                        }`}
                      >
                        {isEnabled ? "Ativa" : "Desativada"}
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
                <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-1">
                  Regras Ativas de Triagem Automática
                </h4>
                <p className="text-xs text-muted-foreground mb-4">
                  O sistema avalia cada candidato automaticamente com base nestes critérios. Requisitos mandatórios causam exclusão direta caso não sejam cumpridos.
                </p>

                {rules.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                    Nenhuma regra configurada. Todas as candidaturas serão marcadas como aptas por padrão.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {rules.map((rule, idx) => (
                      <div
                        key={rule.id || idx}
                        className="flex items-center justify-between rounded-xl border border-border bg-black/40 p-3.5"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                              rule.mandatory
                                ? "border border-rose-500/30 bg-rose-500/15 text-rose-300"
                                : "border border-sky-500/30 bg-sky-500/15 text-sky-300"
                            }`}
                          >
                            {rule.mandatory ? "Obrigatório (Pass/Fail)" : "Preferencial (Pontuação)"}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-white block">
                              {rule.labelPt}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              Campo: {rule.field} = {String(rule.expectedValue)}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteRule(rule.id)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-500/15 hover:text-rose-400 transition-colors"
                          title="Remover regra"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Rule Form */}
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/10 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 uppercase tracking-wider">
                  <Plus size={14} />
                  <span>Adicionar Nova Regra de Triagem</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Identificador do Campo (Formulário) *
                    </label>
                    <input
                      type="text"
                      value={newRuleField}
                      onChange={(e) => setNewRuleField(e.target.value)}
                      placeholder="Ex: drivingLicence, ipCctv, anosExp"
                      className="w-full rounded-lg border border-border bg-black/50 px-3 py-2 text-xs text-white placeholder:text-muted-foreground/40 font-mono focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Título da Regra (Português) *
                    </label>
                    <input
                      type="text"
                      value={newRuleLabelPt}
                      onChange={(e) => setNewRuleLabelPt(e.target.value)}
                      placeholder="Ex: Possui Carta de Condução Válida"
                      className="w-full rounded-lg border border-border bg-black/50 px-3 py-2 text-xs text-white placeholder:text-muted-foreground/40 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Tipo de Verificação
                    </label>
                    <select
                      value={newRuleType}
                      onChange={(e) => {
                        const val = e.target.value as "boolean" | "number";
                        setNewRuleType(val);
                        setNewRuleValue(val === "number" ? "1" : "yes");
                      }}
                      className="w-full rounded-lg border border-border bg-black/50 px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                    >
                      <option value="boolean">Sim / Não (Booleano)</option>
                      <option value="number">Valor Numérico (Mínimo)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Classificação da Regra
                    </label>
                    <select
                      value={newRuleMandatory ? "mandatory" : "preferred"}
                      onChange={(e) => setNewRuleMandatory(e.target.value === "mandatory")}
                      className="w-full rounded-lg border border-border bg-black/50 px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                    >
                      <option value="mandatory">Obrigatório (Pass / Fail)</option>
                      <option value="preferred">Preferencial (Bónus / Score)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Valor Esperado
                    </label>
                    <input
                      type="text"
                      value={newRuleValue}
                      onChange={(e) => setNewRuleValue(e.target.value)}
                      placeholder={newRuleType === "number" ? "Ex: 2" : "yes"}
                      className="w-full rounded-lg border border-border bg-black/50 px-3 py-2 text-xs text-white placeholder:text-muted-foreground/40 font-mono focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddRule}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/20 px-3.5 py-2 text-xs font-bold text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition-colors"
                >
                  <Plus size={14} />
                  <span>Adicionar Regra</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border/80 px-6 py-4 bg-[#090e1a]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border bg-white/5 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/10 transition-colors"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-3">
            {isSaving ? (
              <OverwatchOrbitLoader label="A gravar vaga..." size="sm" />
            ) : (
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-900/40 hover:from-cyan-400 hover:to-blue-500 transition-all active:scale-[0.98]"
              >
                <CheckCircle2 size={15} />
                <span>{isEditing ? "Guardar Alterações" : "Criar e Ativar Vaga"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
