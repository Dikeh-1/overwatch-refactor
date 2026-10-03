"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Archive,
  Search,
  Users,
  CheckCircle2,
  Download,
  Clock,
  ArrowLeft,
  FileText,
  Filter,
  ArrowUpRight,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useAdminLanguage } from "../shell/AdminLanguageContext";
import OverwatchOrbitLoader from "@/components/admin/ui/OverwatchOrbitLoader";

interface ArchiveVaultViewProps {
  onBackToActive: () => void;
}

export default function ArchiveVaultView({ onBackToActive }: ArchiveVaultViewProps) {
  const { lang, t } = useAdminLanguage();
  const searchParams = useSearchParams();
  const initialRoleParam = searchParams?.get("role") || "all";

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [archivedCohorts, setArchivedCohorts] = useState<any[]>([]);
  const [selectedCohort, setSelectedCohort] = useState<any | null>(null);
  const [cohortApps, setCohortApps] = useState<any[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState(initialRoleParam);

  const loadArchiveSummary = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/careers/archive");
      if (!res.ok) {
        throw new Error(`Archive API error (${res.status})`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.archivedCohorts)) {
        setArchivedCohorts(data.archivedCohorts);
      } else {
        setArchivedCohorts([]);
      }
    } catch (err: any) {
      console.warn("Failed to load archive:", err);
      setLoadError(err?.message || "Failed to load archive data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArchiveSummary();
  }, []);

  useEffect(() => {
    if (initialRoleParam && initialRoleParam !== "all") {
      setFilterRole(initialRoleParam);
    }
  }, [initialRoleParam]);

  const openCohortDossier = async (cohort: any) => {
    setSelectedCohort(cohort);
    setAppsLoading(true);
    try {
      const res = await fetch(`/api/admin/careers/archive?cohortId=${encodeURIComponent(cohort.id)}`);
      const data = await res.json();
      if (data.success) {
        setCohortApps(data.applications || []);
      }
    } catch (err) {
      console.warn("Failed to load cohort applications:", err);
    } finally {
      setAppsLoading(false);
    }
  };

  const closeDossier = () => {
    setSelectedCohort(null);
    setCohortApps([]);
  };

  const filteredCohorts = archivedCohorts.filter((c) => {
    const title = lang === "en" ? (c.roleTitleEn || c.roleTitlePt || "") : (c.roleTitlePt || c.roleTitleEn || "");
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === "all" || c.roleId === filterRole;
    return matchesSearch && matchesRole;
  });

  const uniqueRoles = Array.from(new Set(archivedCohorts.map((c) => c.roleId)));

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <OverwatchOrbitLoader
          label={t("Accessing Archive Vault...", "A aceder ao Cofre Histórico...")}
          size="md"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 border border-slate-200 text-[#0a1128]">
            <Archive size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                {t("Recruitment Archive Vault", "Cofre de Arquivo de Recrutamento")}
              </h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200 uppercase">
                {t("Sealed Archive", "Histórico Selado")}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {t(
                "Closed recruitment cohorts and past applicant records preserved cleanly without cluttering active pipelines.",
                "Lotes de recrutamento encerrados e arquivados. Todos os dados permanecem preservados e pesquisáveis sem misturar com vagas ativas.",
              )}
            </p>
          </div>
        </div>

        <button
          onClick={onBackToActive}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shrink-0 shadow-xs"
        >
          <ArrowLeft size={14} />
          <span>{t("Back to Active Roles", "Voltar às Vagas Ativas")}</span>
        </button>
      </div>

      {/* Detail Dossier View (If a sealed cohort is selected) */}
      {selectedCohort ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={closeDossier}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                title={t("Back to cohort list", "Voltar aos lotes")}
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedCohort.name}</h3>
                <span className="text-xs text-slate-500">
                  {t("Opened:", "Aberto em:")}{" "}
                  {new Date(selectedCohort.openedAt).toLocaleDateString(lang === "en" ? "en-US" : "pt-MZ")} •{" "}
                  {t("Closed:", "Encerrado em:")}{" "}
                  {selectedCohort.closedAt
                    ? new Date(selectedCohort.closedAt).toLocaleDateString(lang === "en" ? "en-US" : "pt-MZ")
                    : "N/A"}
                </span>
              </div>
            </div>
          </div>

          {appsLoading ? (
            <div className="flex h-64 items-center justify-center">
              <OverwatchOrbitLoader
                label={t("Loading cohort applications...", "A carregar candidaturas do lote...")}
                size="md"
              />
            </div>
          ) : cohortApps.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
              {t(
                "No candidate dossiers directly linked to this archived cohort.",
                "Nenhuma candidatura associada diretamente a este lote histórico.",
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                    <tr>
                      <th className="px-4 py-3">{t("Candidate", "Candidato")}</th>
                      <th className="px-4 py-3">{t("Contact", "Contacto")}</th>
                      <th className="px-4 py-3">{t("Submission Date", "Data Envio")}</th>
                      <th className="px-4 py-3">{t("Final Status", "Estado Final")}</th>
                      <th className="px-4 py-3 text-right">{t("Attached CV", "CV Anexo")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cohortApps.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3.5">
                          <span className="font-bold text-slate-900 block">{app.name}</span>
                          <span className="text-[11px] text-slate-400">{app.currentLocation || "Maputo"}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="block text-slate-800">{app.email}</span>
                          <span className="text-slate-400">{app.whatsapp}</span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500">
                          {new Date(app.createdAt).toLocaleDateString(lang === "en" ? "en-US" : "pt-MZ")}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                            {app.status || t("Archived", "Arquivado")}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <a
                            href={`/api/admin/cv?id=${app.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-sky-600 hover:text-sky-700 font-medium transition-colors"
                          >
                            <Download size={13} />
                            <span>{t("Download CV", "Descarregar CV")}</span>
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Cohort Cards Grid */
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t(
                  "Search archived cohorts by name or role...",
                  "Pesquisar lotes arquivados por nome ou cargo...",
                )}
                className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0a1128] focus:ring-1 focus:ring-[#0a1128] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter size={15} className="text-slate-400 shrink-0" />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#0a1128] focus:outline-none"
              >
                <option value="all">{t("All Roles", "Todas as Vagas")}</option>
                {uniqueRoles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredCohorts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
              {t(
                "No archived cohorts found. When an active role is closed, its cohort batch and candidate records will appear here in the vault.",
                "Nenhum lote arquivado encontrado. Quando encerrar uma vaga ativa, o seu lote e candidaturas aparecerão aqui no cofre.",
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCohorts.map((cohort) => {
                const roleTitle =
                  lang === "en"
                    ? cohort.roleTitleEn || cohort.roleTitlePt
                    : cohort.roleTitlePt || cohort.roleTitleEn;

                return (
                  <div
                    key={cohort.id}
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[9px] font-bold text-slate-700 uppercase">
                          {cohort.department || t("Recruitment", "Recrutamento")}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                          <Clock size={11} />
                          {cohort.closedAt
                            ? new Date(cohort.closedAt).toLocaleDateString(lang === "en" ? "en-US" : "pt-MZ")
                            : t("Archived", "Arquivado")}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{cohort.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{roleTitle}</p>

                      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                            {t("Total CVs", "Total CVs")}
                          </span>
                          <span className="text-sm font-extrabold text-slate-900">
                            {cohort.totalApplications || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                            {t("Tested", "Testados")}
                          </span>
                          <span className="text-sm font-extrabold text-sky-600">
                            {cohort.totalTested || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                            {t("Hired", "Admitidos")}
                          </span>
                          <span className="text-sm font-extrabold text-emerald-600">
                            {cohort.totalHired || 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => openCohortDossier(cohort)}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors"
                    >
                      <FileText size={13} />
                      <span>{t("View Cohort Applications", "Ver Candidaturas do Lote")}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
