"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Search,
  Users,
  Eye,
  SlidersHorizontal,
  Radio,
  Shield,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  X,
} from "lucide-react";
import { Role, Application } from "@/lib/careers";

interface JobRolesViewProps {
  roles: Role[];
  applications: Application[];
  lang: "pt" | "en";
  onToggleRole: (roleId: string, open: boolean) => Promise<void>;
}

export const JobRolesView: React.FC<JobRolesViewProps> = ({
  roles,
  applications,
  lang,
  onToggleRole,
}) => {
  const t = (en: string, pt: string) => (lang === "en" ? en : pt);
  const [searchQuery, setSearchQuery] = useState("");
  const [togglingRoleId, setTogglingRoleId] = useState<string | null>(null);

  const filteredRoles = roles.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return r.en.toLowerCase().includes(q) || r.pt.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
  });

  const getRoleMetrics = (roleId: string) => {
    const roleApps = applications.filter((a) => a.role === roleId || (roleId === "cctv" && !a.role));
    return {
      total: roleApps.length,
      active: roleApps.filter((a) => a.status !== "archived" && a.status !== "rejected").length,
      booked: roleApps.filter((a) => Boolean(a.testSlot) && a.status !== "archived").length,
    };
  };

  const handleToggle = async (roleId: string, currentOpen: boolean) => {
    setTogglingRoleId(roleId);
    try {
      await onToggleRole(roleId, !currentOpen);
    } finally {
      setTogglingRoleId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {t("Job Roles & Openings", "Vagas & Funções")}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t(
              "Manage career recruitment listings and public application intake",
              "Gestão de anúncios de recrutamento e recepção pública de candidaturas"
            )}
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("Search roles...", "Pesquisar vagas...")}
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
      </div>

      {/* Roles Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/75 text-[0.65rem] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="px-4 py-2.5">{t("Role Title", "Designação da Função")}</th>
              <th className="px-4 py-2.5">{t("Status", "Estado")}</th>
              <th className="px-4 py-2.5">{t("Total Applications", "Total Recebidas")}</th>
              <th className="px-4 py-2.5">{t("Active Pipeline", "Funil Ativo")}</th>
              <th className="px-4 py-2.5">{t("Scheduled Tests", "Testes Agendados")}</th>
              <th className="px-4 py-2.5 text-right">{t("Actions", "Ações")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {filteredRoles.map((role) => {
              const metrics = getRoleMetrics(role.id);
              const isToggling = togglingRoleId === role.id;

              return (
                <tr key={role.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">
                      {lang === "pt" ? role.pt : role.en}
                    </div>
                    <div className="text-[0.7rem] text-slate-400 font-mono">
                      ID: {role.id}
                    </div>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[0.65rem] font-semibold ${
                        role.open
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${role.open ? "bg-emerald-500" : "bg-slate-400"}`} />
                      <span>{role.open ? t("OPEN", "ABERTA") : t("CLOSED", "FECHADA")}</span>
                    </span>
                  </td>

                  <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                    {metrics.total}
                  </td>

                  <td className="px-4 py-3 font-mono text-slate-700">
                    {metrics.active}
                  </td>

                  <td className="px-4 py-3 font-mono text-slate-700">
                    {metrics.booked}
                  </td>

                  <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                    <button
                      type="button"
                      disabled={isToggling}
                      onClick={() => handleToggle(role.id, role.open)}
                      className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors cursor-pointer ${
                        role.open
                          ? "border-slate-200 hover:bg-slate-100 text-slate-700"
                          : "border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {role.open ? t("Close Applications", "Encerrar Vaga") : t("Open Applications", "Abrir Vaga")}
                    </button>

                    <Link
                      href={`/admin/recruitment/candidates?role=${role.id}`}
                      className="px-2.5 py-1 rounded bg-[#0a1128] hover:bg-[#101b3d] text-white text-xs font-medium transition-colors inline-flex items-center gap-1"
                    >
                      <span>{t("View Pipeline", "Ver Funil")}</span>
                      <ArrowUpRight size={11} className="text-slate-400" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
