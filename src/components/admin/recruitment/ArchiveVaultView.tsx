"use client";

import { useEffect, useState } from "react";
import {
  Archive,
  Search,
  Calendar,
  Users,
  CheckCircle2,
  ExternalLink,
  Download,
  Clock,
  ArrowLeft,
  FileText,
  Filter,
} from "lucide-react";
import OverwatchOrbitLoader from "@/components/admin/ui/OverwatchOrbitLoader";

interface ArchiveVaultViewProps {
  onBackToActive: () => void;
}

export default function ArchiveVaultView({ onBackToActive }: ArchiveVaultViewProps) {
  const [loading, setLoading] = useState(true);
  const [archivedCohorts, setArchivedCohorts] = useState<any[]>([]);
  const [selectedCohort, setSelectedCohort] = useState<any | null>(null);
  const [cohortApps, setCohortApps] = useState<any[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  const loadArchiveSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/careers/archive");
      const data = await res.json();
      if (data.success) {
        setArchivedCohorts(data.archivedCohorts || []);
      }
    } catch (err) {
      console.warn("Failed to load archive:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArchiveSummary();
  }, []);

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
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.roleTitlePt?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === "all" || c.roleId === filterRole;
    return matchesSearch && matchesRole;
  });

  const uniqueRoles = Array.from(new Set(archivedCohorts.map((c) => c.roleId)));

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <OverwatchOrbitLoader label="A aceder ao Cofre Histórico..." size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-[#0d1322] p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
            <Archive size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-white">Cofre de Arquivo de Recrutamento</h2>
              <span className="rounded-full bg-purple-500/15 px-2.5 py-0.5 text-[10px] font-bold text-purple-300 border border-purple-500/30 uppercase">
                Histórico Selado
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Lotes de recrutamento encerrados e arquivados. Todos os dados permanecem preservados e pesquisáveis sem misturar com vagas ativas.
            </p>
          </div>
        </div>

        <button
          onClick={onBackToActive}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-white/5 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/10 transition-colors shrink-0"
        >
          <ArrowLeft size={14} />
          <span>Voltar às Vagas Ativas</span>
        </button>
      </div>

      {/* Detail Dossier View (If a sealed cohort is selected) */}
      {selectedCohort ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-border/80 pb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={closeDossier}
                className="rounded-lg p-2 text-muted-foreground hover:bg-white/10 hover:text-white transition-colors"
                title="Voltar aos lotes"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h3 className="text-lg font-bold text-white">{selectedCohort.name}</h3>
                <span className="text-xs text-muted-foreground">
                  Aberto em: {new Date(selectedCohort.openedAt).toLocaleDateString("pt-MZ")} • Encerrado em:{" "}
                  {selectedCohort.closedAt ? new Date(selectedCohort.closedAt).toLocaleDateString("pt-MZ") : "N/A"}
                </span>
              </div>
            </div>
          </div>

          {appsLoading ? (
            <div className="flex h-64 items-center justify-center">
              <OverwatchOrbitLoader label="A carregar candidaturas do lote..." size="md" />
            </div>
          ) : cohortApps.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
              Nenhuma candidatura associada diretamente a este lote histórico.
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-[#0d1322] overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="border-b border-border bg-black/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Candidato</th>
                      <th className="px-4 py-3">Contacto</th>
                      <th className="px-4 py-3">Data Envio</th>
                      <th className="px-4 py-3">Estado Final</th>
                      <th className="px-4 py-3">CV Anexo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {cohortApps.map((app) => (
                      <tr key={app.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3.5">
                          <span className="font-bold text-white block">{app.name}</span>
                          <span className="text-[10px] text-muted-foreground">{app.currentLocation || "Maputo"}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="block text-white/90">{app.email}</span>
                          <span className="text-muted-foreground">{app.whatsapp}</span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[11px] text-muted-foreground">
                          {new Date(app.createdAt).toLocaleDateString("pt-MZ")}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="rounded-full bg-white/5 border border-border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                            {app.status || "Arquivado"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <a
                            href={`/api/admin/cv?id=${app.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 transition-colors"
                          >
                            <Download size={13} />
                            <span>Descarregar CV</span>
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
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar lotes arquivados por nome ou cargo..."
                className="w-full rounded-xl border border-border bg-black/40 pl-9 pr-4 py-2.5 text-xs text-white placeholder:text-muted-foreground/40 focus:border-purple-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter size={15} className="text-muted-foreground shrink-0" />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="rounded-xl border border-border bg-black/40 px-3 py-2.5 text-xs text-white focus:border-purple-400 focus:outline-none"
              >
                <option value="all">Todas as Vagas</option>
                {uniqueRoles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredCohorts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
              Nenhum lote arquivado encontrado. Quando encerrar uma vaga ativa, o seu lote e candidaturas aparecerão aqui no cofre.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCohorts.map((cohort) => (
                <div
                  key={cohort.id}
                  className="rounded-2xl border border-border bg-[#0d1322] p-5 shadow-lg hover:border-purple-500/40 transition-all flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="rounded-full bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 text-[9px] font-bold text-purple-300 uppercase">
                        {cohort.department || "Recrutamento"}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                        <Clock size={11} />
                        {cohort.closedAt ? new Date(cohort.closedAt).toLocaleDateString("pt-MZ") : "Arquivado"}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white line-clamp-1">{cohort.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{cohort.roleTitlePt}</p>

                    <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border/60 pt-3 text-center">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase block">Total CVs</span>
                        <span className="text-sm font-extrabold text-white">{cohort.totalApplications || 0}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase block">Testados</span>
                        <span className="text-sm font-extrabold text-sky-400">{cohort.totalTested || 0}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase block">Admitidos</span>
                        <span className="text-sm font-extrabold text-emerald-400">{cohort.totalHired || 0}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => openCohortDossier(cohort)}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-border px-4 py-2 text-xs font-bold text-white hover:bg-white/10 hover:border-purple-500/40 transition-colors"
                  >
                    <FileText size={13} />
                    <span>Ver Candidaturas do Lote</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
