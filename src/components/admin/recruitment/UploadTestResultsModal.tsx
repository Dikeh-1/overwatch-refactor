"use client";

import React, { useState, useRef } from "react";
import {
  X,
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Award,
  Users,
  ArrowRight,
  Check,
  RefreshCw,
  CopyX,
} from "lucide-react";
import OverwatchOrbitLoader from "@/components/admin/ui/OverwatchOrbitLoader";

interface CandidatePreview {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  currentScore?: number | null;
  currentStatus: string;
  newScore: number;
  documentNextPhase?: boolean;
  decisionRaw?: string;
  matchType: "email" | "phone" | "name_exact" | "name_fuzzy";
}

interface UnmatchedRow {
  name?: string;
  email?: string;
  score?: number;
  reason: string;
}

interface UploadTestResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
  roleId?: string;
  cohortId?: string;
  lang?: "pt" | "en";
}

export const UploadTestResultsModal: React.FC<UploadTestResultsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  roleId,
  cohortId,
  lang = "en",
}) => {
  const t = (en: string, pt: string) => (lang === "en" ? en : pt);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preview state
  const [previewData, setPreviewData] = useState<{
    fileName: string;
    totalRecords: number;
    matched: CandidatePreview[];
    unmatched: UnmatchedRow[];
  } | null>(null);

  // Selection for Next Phase advancement
  const [selectedToAdvance, setSelectedToAdvance] = useState<Set<string>>(new Set());
  const [committedSuccess, setCommittedSuccess] = useState<{
    count: number;
    advancedCount: number;
  } | null>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewData(null);
    setSelectedToAdvance(new Set());
    setError(null);
    setCommittedSuccess(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelected = async (file: File) => {
    setSelectedFile(file);
    setError(null);
    setBusy(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (roleId) formData.append("roleId", roleId);
      if (cohortId) formData.append("cohortId", cohortId);
      formData.append("commit", "false"); // dry-run preview

      const res = await fetch("/api/admin/careers/upload-test-scores", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t("Failed to parse file", "Falha ao analisar ficheiro"));
      }

      const matchedList: CandidatePreview[] = data.matched || [];
      setPreviewData({
        fileName: data.fileName || file.name,
        totalRecords: data.totalRecords || 0,
        matched: matchedList,
        unmatched: data.unmatched || [],
      });

      // Automatically pre-select candidates who are marked as selected/Next Phase in the document
      const initialAdvance = new Set<string>();
      for (const m of matchedList) {
        if (m.documentNextPhase || m.currentStatus === "next_phase_selected") {
          initialAdvance.add(m.candidateId);
        }
      }
      setSelectedToAdvance(initialAdvance);
    } catch (err: any) {
      setError(err.message || t("Error uploading file", "Erro ao carregar ficheiro"));
    } finally {
      setBusy(false);
    }
  };

  const handleCommit = async () => {
    if (!selectedFile || !previewData) return;
    setBusy(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      if (roleId) formData.append("roleId", roleId);
      if (cohortId) formData.append("cohortId", cohortId);
      formData.append("commit", "true");
      formData.append("advanceIds", JSON.stringify(Array.from(selectedToAdvance)));

      const res = await fetch("/api/admin/careers/upload-test-scores", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t("Failed to save scores", "Falha ao gravar notas"));
      }

      setCommittedSuccess({
        count: data.updatedCount || 0,
        advancedCount: (data.candidates || []).filter((c: any) => c.advanced).length,
      });

      if (onSuccess) {
        await onSuccess();
      }
    } catch (err: any) {
      setError(err.message || t("Error saving scores", "Erro ao gravar notas"));
    } finally {
      setBusy(false);
    }
  };

  const toggleAdvanceCandidate = (id: string) => {
    setSelectedToAdvance((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllAdvance = () => {
    if (!previewData) return;
    if (selectedToAdvance.size === previewData.matched.length) {
      // Uncheck all except those already next phase
      const onlyExisting = new Set<string>();
      for (const m of previewData.matched) {
        if (m.currentStatus === "next_phase_selected" || m.documentNextPhase) {
          onlyExisting.add(m.candidateId);
        }
      }
      setSelectedToAdvance(onlyExisting);
    } else {
      setSelectedToAdvance(new Set(previewData.matched.map((m) => m.candidateId)));
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 border border-sky-200">
              <Upload size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {t("Upload Physical Test Scores", "Carregar Notas de Testes Físicos")}
              </h3>
              <p className="text-xs text-slate-500">
                {t(
                  "Import results from Excel, CSV, or PDF with automated candidate matching and Next Phase advancement",
                  "Importe notas de Excel, CSV ou PDF com correspondência automática e avanço para a Próxima Fase"
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title={t("Close", "Fechar")}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-center gap-2.5">
              <AlertTriangle size={16} className="shrink-0 text-rose-600" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {/* STEP 3: SUCCESS CONFIRMATION */}
          {committedSuccess && (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 size={32} />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-bold text-slate-900">
                  {t("Scores Successfully Applied!", "Notas Registadas com Sucesso!")}
                </h4>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  {t(
                    `Updated test scores for ${committedSuccess.count} candidates. ${
                      committedSuccess.advancedCount > 0
                        ? `${committedSuccess.advancedCount} candidates were pushed to the Next Phase.`
                        : ""
                    }`,
                    `Foram atualizadas as notas de ${committedSuccess.count} candidatos. ${
                      committedSuccess.advancedCount > 0
                        ? `${committedSuccess.advancedCount} candidatos foram avançados para a Próxima Fase.`
                        : ""
                    }`
                  )}
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  {t("Done & View Candidates", "Concluir e Ver Candidatos")}
                </button>
              </div>
            </div>
          )}

          {/* STEP 1: DROPZONE (When no preview yet) */}
          {!committedSuccess && !previewData && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileSelected(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  dragOver
                    ? "border-sky-500 bg-sky-50/50"
                    : "border-slate-300 hover:border-sky-400 bg-slate-50/50 hover:bg-sky-50/20"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelected(file);
                  }}
                  className="hidden"
                />

                {busy ? (
                  <div className="py-6 flex flex-col items-center justify-center gap-3">
                    <OverwatchOrbitLoader size="md" theme="dark" label={t("Parsing document…", "A analisar documento…")} />
                    <p className="text-xs text-slate-500">
                      {t("Matching candidate names, scores, and decisions…", "A verificar candidatos, notas e decisões…")}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-center gap-2 text-slate-400">
                      <FileSpreadsheet size={32} className="text-emerald-600" />
                      <FileText size={32} className="text-sky-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {t(
                          "Click to browse or drag and drop your file here",
                          "Clique para procurar ou arraste o ficheiro para aqui"
                        )}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {t(
                          "Supports Excel (.xlsx, .xls), CSV (.csv), or PDF (.pdf)",
                          "Suporta Excel (.xlsx, .xls), CSV (.csv) ou PDF (.pdf)"
                        )}
                      </p>
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-medium text-slate-600 shadow-2xs">
                      <span>{t("Recognized columns (EN & PT):", "Colunas reconhecidas (PT & EN):")}</span>
                      <strong className="text-slate-900">Nome / Email / WhatsApp</strong> · <strong className="text-slate-900">Nota / Score</strong> · <strong className="text-slate-900">Decisão / Próxima Fase</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Safeguards & Format guidance box */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 text-xs text-slate-600 space-y-2">
                <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>{t("Strict Anti-Error & Anti-Collision Safeguards:", "Proteções Estritas Contra Erros e Mistura de Notas:")}</span>
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  <li>
                    {t(
                      "Multi-Tier Identity Matching: Email exact match first, followed by WhatsApp/Phone, then exact and tokenized Name.",
                      "Correspondência por Níveis: Primeiro por Email exato, depois WhatsApp/Contacto, e por fim Nome completo."
                    )}
                  </li>
                  <li>
                    {t(
                      "Anti-Mixing Protection: If multiple candidates share an ambiguous name, the row is flagged so scores are never mixed up.",
                      "Proteção contra Mistura: Se houver candidatos com nomes semelhantes no ciclo, o sistema bloqueia e exige email/telefone para não trocar notas."
                    )}
                  </li>
                  <li>
                    {t(
                      "Duplicate Detection: Prevents duplicate rows or duplicate scores from overwriting candidates in the same document.",
                      "Deteção de Duplicados: Impede que linhas duplicadas no mesmo ficheiro sobrescrevam notas indevidamente."
                    )}
                  </li>
                  <li>
                    {t(
                      "Document-Driven Selection: Recognizes 'Próxima Fase', 'Aprovado', 'Pass', or 'Selected' columns in PT & EN to auto-advance candidates.",
                      "Seleção pelo Documento: Reconhece colunas de 'Próxima Fase', 'Aprovado' ou 'Selected' em PT e EN para avançar automaticamente."
                    )}
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW & VERIFICATION TABLE */}
          {!committedSuccess && previewData && (
            <div className="space-y-4">
              {/* File stats card */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet size={18} className="text-sky-600 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-900 block truncate max-w-xs">
                      {previewData.fileName}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      {previewData.totalRecords} {t("records read in document", "registos lidos no ficheiro")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold">
                    ✓ {previewData.matched.length} {t("Matched", "Correspondidos")}
                  </span>
                  {previewData.unmatched.length > 0 && (
                    <span className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 border border-amber-300 font-semibold">
                      ⚠ {previewData.unmatched.length} {t("Warnings / Unmatched", "Avisos / Não associados")}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-slate-600 hover:text-slate-900 text-xs underline cursor-pointer ml-1"
                  >
                    {t("Change file", "Mudar ficheiro")}
                  </button>
                </div>
              </div>

              {/* Matched candidates table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800">
                    {t("Matched Candidates & Scores to Apply", "Candidatos Correspondidos e Notas a Aplicar")}
                  </span>

                  {/* Bulk advance toggle */}
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={
                        previewData.matched.length > 0 &&
                        selectedToAdvance.size === previewData.matched.length
                      }
                      onChange={toggleSelectAllAdvance}
                      className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    <span>{t("Select all to advance to Next Phase", "Selecionar todos p/ Próxima Fase")}</span>
                  </label>
                </div>

                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 text-xs">
                  {previewData.matched.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">
                      {t("No candidates matched from this file.", "Nenhum candidato correspondido.")}
                    </div>
                  ) : (
                    previewData.matched.map((item) => {
                      const willAdvance = selectedToAdvance.has(item.candidateId);
                      const isAlreadyAdvanced =
                        item.currentStatus === "next_phase_selected" ||
                        item.currentStatus === "training" ||
                        item.currentStatus === "interview" ||
                        item.currentStatus === "hired";

                      return (
                        <div
                          key={item.candidateId}
                          className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 truncate">
                                {item.candidateName}
                              </span>
                              {item.documentNextPhase && (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                                  ✓ {t("Selected in Doc", "Selecionado no Doc")}
                                </span>
                              )}
                              {isAlreadyAdvanced && (
                                <span className="px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 border border-sky-300 text-[10px] font-bold">
                                  {t("In Next Phase", "Na Próx. Fase")}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 truncate block">
                              {item.candidateEmail} {item.candidatePhone ? `· ${item.candidatePhone}` : ""}
                            </span>
                          </div>

                          {/* Score Pill */}
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-slate-400 text-[11px]">
                              {item.currentScore !== null ? `${item.currentScore}%` : "—"} →
                            </span>
                            <span className="px-2.5 py-1 rounded-md font-mono font-bold text-xs bg-slate-900 text-white">
                              {item.newScore}%
                            </span>
                          </div>

                          {/* Next Phase checkbox */}
                          <div className="shrink-0 pl-2">
                            <button
                              type="button"
                              onClick={() => toggleAdvanceCandidate(item.candidateId)}
                              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all inline-flex items-center gap-1 cursor-pointer border ${
                                willAdvance || isAlreadyAdvanced
                                  ? "bg-sky-600 text-white border-sky-600 shadow-2xs"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              <Award size={12} />
                              <span>
                                {willAdvance || isAlreadyAdvanced
                                  ? t("Selected for Next Phase", "Selecionado p/ Próx. Fase")
                                  : t("Advance", "Avançar")}
                              </span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Unmatched / Safeguard warning accordion */}
              {previewData.unmatched.length > 0 && (
                <details className="border border-amber-200 rounded-xl bg-amber-50/60 p-3 text-xs text-amber-900" open>
                  <summary className="font-semibold cursor-pointer flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle size={14} className="text-amber-600" />
                      <span>
                        {previewData.unmatched.length}{" "}
                        {t(
                          "records require attention (duplicates, ambiguities, or not in this cycle)",
                          "registos requerem atenção (duplicados, ambiguidades ou fora deste ciclo)"
                        )}
                      </span>
                    </span>
                    <span className="text-[11px] text-amber-700 underline font-normal">
                      {t("View details", "Ver detalhes")}
                    </span>
                  </summary>
                  <div className="mt-2.5 space-y-1.5 pl-2 max-h-36 overflow-y-auto">
                    {previewData.unmatched.map((u, i) => (
                      <div key={i} className="text-[11px] text-amber-900 bg-amber-100/60 p-2 rounded-lg border border-amber-200/80">
                        <strong className="font-bold">{u.name || u.email || "Item"}</strong>
                        {u.score !== undefined && ` (${u.score}%)`}: {u.reason}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {!committedSuccess && previewData && (
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/80 shrink-0">
            <button
              type="button"
              onClick={handleReset}
              disabled={busy}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-medium cursor-pointer"
            >
              {t("Cancel / Re-upload", "Cancelar / Voltar")}
            </button>

            <button
              type="button"
              disabled={busy || previewData.matched.length === 0}
              onClick={handleCommit}
              className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md inline-flex items-center gap-2 cursor-pointer"
            >
              {busy ? (
                <>
                  <OverwatchOrbitLoader size="xs" theme="light" />
                  <span>{t("Saving Scores…", "A Gravar Notas…")}</span>
                </>
              ) : (
                <>
                  <span>
                    {t(
                      `Save ${previewData.matched.length} Scores`,
                      `Gravar ${previewData.matched.length} Notas`
                    )}
                  </span>
                  {selectedToAdvance.size > 0 && (
                    <span className="bg-sky-700 px-1.5 py-0.5 rounded text-[10px]">
                      +{selectedToAdvance.size} {t("to Next Phase", "p/ Próxima Fase")}
                    </span>
                  )}
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadTestResultsModal;
