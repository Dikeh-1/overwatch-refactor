"use client";

import React, { useState, useRef } from "react";
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Award,
  ArrowRight,
  Info,
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
  hasCorrection?: boolean;
  correctionDetail?: string;
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
    absentCount?: number;
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
      formData.append("lang", lang);
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
      formData.append("lang", lang);
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
        absentCount: data.absentCount || 0,
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Clean, Minimal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <Upload size={18} className="text-slate-800 shrink-0" />
            <div>
              <h3 className="text-base font-semibold text-slate-900 tracking-tight">
                {t("Upload Physical Test Scores", "Carregar Notas de Testes Físicos")}
              </h3>
              <p className="text-xs text-slate-500">
                {t(
                  "Import results from Excel, CSV, or PDF with automated verification",
                  "Importe notas de Excel, CSV ou PDF com verificação automática"
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title={t("Close", "Fechar")}
          >
            <X size={17} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-slate-600" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {/* SUCCESS SCREEN */}
          {committedSuccess && (
            <div className="py-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center mx-auto shadow-2xs">
                <CheckCircle2 size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-semibold text-slate-900">
                  {t("Scores Successfully Applied", "Notas Registadas com Sucesso")}
                </h4>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  {t(
                    `Updated test scores for ${committedSuccess.count} candidates (marked Present). ${
                      committedSuccess.advancedCount > 0
                        ? `${committedSuccess.advancedCount} candidates were advanced to Next Phase. `
                        : ""
                    }${
                      committedSuccess.absentCount && committedSuccess.absentCount > 0
                        ? `${committedSuccess.absentCount} booked candidate(s) who did not attend were marked as Absent.`
                        : ""
                    }`,
                    `Foram atualizadas as notas de ${committedSuccess.count} candidatos (Presentes no Portão). ${
                      committedSuccess.advancedCount > 0
                        ? `${committedSuccess.advancedCount} candidatos foram avançados para a Próxima Fase. `
                        : ""
                    }${
                      committedSuccess.absentCount && committedSuccess.absentCount > 0
                        ? `${committedSuccess.absentCount} candidato(s) agendados ausentes foram marcados como Ausentes.`
                        : ""
                    }`
                  )}
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs transition-colors cursor-pointer"
                >
                  {t("Done & View Candidates", "Concluir e Ver Candidatos")}
                </button>
              </div>
            </div>
          )}

          {/* STEP 1: DROPZONE */}
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
                className={`border border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  dragOver
                    ? "border-slate-500 bg-slate-50"
                    : "border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50"
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
                  <div className="space-y-2.5">
                    <div className="flex justify-center text-slate-400">
                      <FileSpreadsheet size={28} className="text-slate-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">
                        {t(
                          "Click to browse or drag and drop your file here",
                          "Clique para procurar ou arraste o ficheiro para aqui"
                        )}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {t(
                          "Supports Excel (.xlsx, .xls), CSV (.csv), or PDF (.pdf)",
                          "Suporta Excel (.xlsx, .xls), CSV (.csv) ou PDF (.pdf)"
                        )}
                      </p>
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-[11px] text-slate-600">
                      <span>{t("Recognized columns (EN & PT):", "Colunas reconhecidas (PT & EN):")}</span>
                      <strong className="text-slate-800">Name / Email / Phone</strong> · <strong className="text-slate-800">Score / Grade</strong> · <strong className="text-slate-800">Decision / Next Phase</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW & VERIFICATION TABLE */}
          {!committedSuccess && previewData && (
            <div className="space-y-3.5">
              {/* Minimal Clean Stats Bar */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet size={16} className="text-slate-600 shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-900 block truncate max-w-xs">
                      {previewData.fileName}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      {previewData.totalRecords} {t("records found", "registos lidos")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                    {previewData.matched.length} {t("Matched", "Correspondidos")}
                  </span>
                  {previewData.unmatched.length > 0 && (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">
                      {previewData.unmatched.length} {t("Ineligible / Unmatched", "Não elegíveis / Não encontrados")}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-slate-500 hover:text-slate-900 text-xs underline cursor-pointer ml-1"
                  >
                    {t("Change file", "Mudar ficheiro")}
                  </button>
                </div>
              </div>

              {/* Matched candidates table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <div className="px-4 py-2 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-semibold text-xs text-slate-800">
                    {t("Matched Candidates", "Candidatos Correspondidos")}
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
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <span>{t("Select all for Next Phase", "Selecionar todos p/ Próxima Fase")}</span>
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
                          className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-slate-900 truncate">
                                {item.candidateName}
                              </span>
                              {item.documentNextPhase && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                  {t("Doc: Approved", "Doc: Aprovado")}
                                </span>
                              )}
                              {isAlreadyAdvanced && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                  {t("In Next Phase", "Na Próx. Fase")}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 truncate block">
                              {item.candidateEmail} {item.candidatePhone ? `· ${item.candidatePhone}` : ""}
                            </span>
                            {item.hasCorrection && item.correctionDetail && (
                              <span className="text-[11px] text-slate-500 block mt-0.5">
                                • {item.correctionDetail}
                              </span>
                            )}
                          </div>

                          {/* Score Pill */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-slate-400 text-[11px]">
                              {item.currentScore !== null ? `${item.currentScore}%` : "—"} →
                            </span>
                            <span className="px-2 py-0.5 rounded font-mono font-medium text-xs bg-slate-100 text-slate-900 border border-slate-200">
                              {item.newScore}%
                            </span>
                          </div>

                          {/* Next Phase Button */}
                          <div className="shrink-0 pl-1">
                            <button
                              type="button"
                              onClick={() => toggleAdvanceCandidate(item.candidateId)}
                              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border ${
                                willAdvance || isAlreadyAdvanced
                                  ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                              }`}
                            >
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

              {/* Minimal Clean Warnings / Ineligible Accordion */}
              {previewData.unmatched.length > 0 && (
                <details className="border border-slate-200 rounded-xl bg-slate-50/70 p-3 text-xs text-slate-700" open>
                  <summary className="font-medium text-slate-800 cursor-pointer flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Info size={14} className="text-slate-500" />
                      <span>
                        {previewData.unmatched.length}{" "}
                        {t(
                          "ineligible or unverified rows (duplicates, out of pipeline, or archived)",
                          "linhas não elegíveis ou não encontradas"
                        )}
                      </span>
                    </span>
                    <span className="text-[11px] text-slate-500 underline font-normal">
                      {t("Toggle details", "Ver detalhes")}
                    </span>
                  </summary>
                  <div className="mt-2.5 space-y-1.5 max-h-36 overflow-y-auto">
                    {previewData.unmatched.map((u, i) => (
                      <div key={i} className="text-[11px] bg-white p-2 rounded-lg border border-slate-200 text-slate-600">
                        <strong className="font-semibold text-slate-900">{u.name || u.email || "Item"}</strong>
                        {u.score !== undefined && ` (${u.score}%)`}: <span className="text-slate-500">{u.reason}</span>
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
          <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-between bg-slate-50/80 shrink-0">
            <button
              type="button"
              onClick={handleReset}
              disabled={busy}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium cursor-pointer"
            >
              {t("Cancel / Re-upload", "Cancelar / Voltar")}
            </button>

            <button
              type="button"
              disabled={busy || previewData.matched.length === 0}
              onClick={handleCommit}
              className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-medium transition-colors shadow-xs inline-flex items-center gap-2 cursor-pointer"
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
                    <span className="bg-slate-800 text-slate-300 text-[10px] px-1.5 py-0.5 rounded font-medium">
                      +{selectedToAdvance.size} {t("to Next Phase", "p/ Próxima Fase")}
                    </span>
                  )}
                  <ArrowRight size={13} />
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
