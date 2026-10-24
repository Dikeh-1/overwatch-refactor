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

      setPreviewData({
        fileName: data.fileName || file.name,
        totalRecords: data.totalRecords || 0,
        matched: data.matched || [],
        unmatched: data.unmatched || [],
      });

      // Default: don't force advance, let user choose
      setSelectedToAdvance(new Set());
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
        throw new Error(data.error || t("Failed to save test scores", "Falha ao guardar notas"));
      }

      const advancedCount = data.candidates ? data.candidates.filter((c: any) => c.advanced).length : 0;
      setCommittedSuccess({
        count: data.updatedCount || previewData.matched.length,
        advancedCount,
      });

      await onSuccess();
    } catch (err: any) {
      setError(err.message || t("Error saving test scores", "Erro ao gravar notas"));
    } finally {
      setBusy(false);
    }
  };

  const toggleAdvanceCandidate = (id: string) => {
    const next = new Set(selectedToAdvance);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedToAdvance(next);
  };

  const toggleSelectAllAdvance = () => {
    if (!previewData) return;
    if (selectedToAdvance.size === previewData.matched.length) {
      setSelectedToAdvance(new Set());
    } else {
      setSelectedToAdvance(new Set(previewData.matched.map((m) => m.candidateId)));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-700 shadow-2xs">
              <Upload size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {t("Upload & Ingest Test Scores", "Carregar Notas dos Testes")}
              </h2>
              <p className="text-xs text-slate-500">
                {t(
                  "Upload PDF, Excel (.xlsx/.xls), or CSV to match candidates and record physical test scores",
                  "Carregue ficheiro PDF, Excel ou CSV para validar candidatos e lançar notas"
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 admin-scrollbar">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800">
              <AlertTriangle size={15} className="text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* SUCCESS STATE */}
          {committedSuccess && (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-300 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {t("Test Scores Saved Successfully!", "Notas Registadas com Sucesso!")}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  {t(
                    `Updated test scores for ${committedSuccess.count} candidates.`,
                    `Notas actualizadas com sucesso para ${committedSuccess.count} candidatos.`
                  )}
                  {committedSuccess.advancedCount > 0 && (
                    <span className="block font-medium text-sky-700 mt-1">
                      {t(
                        `${committedSuccess.advancedCount} candidates advanced to the Next Phase!`,
                        `${committedSuccess.advancedCount} candidatos avançados para a Próxima Fase!`
                      )}
                    </span>
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
                      {t("Matching candidate names and scores…", "A verificar candidatos e notas…")}
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
                      <span>{t("Expected columns:", "Colunas esperadas:")}</span>
                      <strong className="text-slate-900">Nome / Email / WhatsApp</strong> & <strong className="text-slate-900">Nota / Score</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Format guidance box */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 text-xs text-slate-600 space-y-1.5">
                <p className="font-semibold text-slate-800">
                  {t("How candidate matching works:", "Como funciona a correspondência:")}
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  <li>
                    {t(
                      "Matches by candidate Email (exact) or Phone/WhatsApp (last 8–9 digits).",
                      "Correspondência por Email ou WhatsApp/Telefone."
                    )}
                  </li>
                  <li>
                    {t(
                      "Falls back to candidate Full Name matching if email is omitted.",
                      "Caso não haja email, procura correspondência pelo Nome do candidato."
                    )}
                  </li>
                  <li>
                    {t(
                      "Recognizes percentages (85%), fractions (17/20), or raw numbers (0–100).",
                      "Reconhece percentagens (85%), fracções (17/20) ou números inteiros (0–100)."
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
                      {previewData.totalRecords} {t("records found in file", "registos lidos no ficheiro")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold">
                    ✓ {previewData.matched.length} {t("Matched", "Correspondidos")}
                  </span>
                  {previewData.unmatched.length > 0 && (
                    <span className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 border border-amber-300 font-semibold">
                      ⚠ {previewData.unmatched.length} {t("Unmatched", "Não encontrados")}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-slate-600 hover:text-slate-900 text-xs underline cursor-pointer"
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
                      return (
                        <div
                          key={item.candidateId}
                          className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-semibold text-slate-900 block truncate">
                              {item.candidateName}
                            </span>
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
                                willAdvance
                                  ? "bg-sky-600 text-white border-sky-600 shadow-2xs"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              <Award size={12} />
                              <span>{willAdvance ? t("Selected for Next Phase", "Selecionado p/ Próx. Fase") : t("Advance", "Avançar")}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Unmatched warning accordion */}
              {previewData.unmatched.length > 0 && (
                <details className="border border-amber-200 rounded-xl bg-amber-50/50 p-3 text-xs text-amber-900">
                  <summary className="font-semibold cursor-pointer">
                    ⚠ {previewData.unmatched.length} {t("records from file could not be matched", "registos do ficheiro não foram encontrados")}
                  </summary>
                  <div className="mt-2.5 space-y-1.5 pl-2 max-h-32 overflow-y-auto">
                    {previewData.unmatched.map((u, i) => (
                      <div key={i} className="text-[11px] text-amber-800">
                        • {u.name || u.email || "Item"} ({u.score}%) — {u.reason}
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
