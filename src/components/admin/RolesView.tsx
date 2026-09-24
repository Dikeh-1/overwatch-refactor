"use client";

import React, { useState } from "react";
import {
  Briefcase,
  CheckCircle2,
  XCircle,
  Users,
  Eye,
  SlidersHorizontal,
  Plus,
  Shield,
  Radio,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { Role, Application } from "@/lib/careers";

interface RolesViewProps {
  roles: Role[];
  applications: Application[];
  lang: "pt" | "en";
  onToggleRole: (roleId: string, open: boolean) => Promise<void>;
  onSelectRoleFilter: (roleId: string) => void;
}

export const RolesView: React.FC<RolesViewProps> = ({
  roles,
  applications,
  lang,
  onToggleRole,
  onSelectRoleFilter,
}) => {
  const t = (en: string, pt: string) => (lang === "en" ? en : pt);
  const [togglingRole, setTogglingRole] = useState<string | null>(null);

  const handleToggle = async (roleId: string, currentStatus: boolean) => {
    setTogglingRole(roleId);
    try {
      await onToggleRole(roleId, !currentStatus);
    } finally {
      setTogglingRole(null);
    }
  };

  const getRoleCounts = (roleId: string) => {
    const roleApps = applications.filter((a) => a.role === roleId || (roleId === "cctv" && !a.role));
    return {
      total: roleApps.length,
      shortlisted: roleApps.filter((a) => a.status === "shortlisted").length,
      booked: roleApps.filter((a) => Boolean(a.testSlot) && a.status !== "archived" && a.status !== "rejected").length,
    };
  };

  const getRoleIcon = (id: string) => {
    switch (id) {
      case "cctv":
        return Radio;
      case "operations":
        return Shield;
      case "technical":
        return SlidersHorizontal;
      default:
        return Briefcase;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-[#0d121f] border border-white/[0.08] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Briefcase size={18} className="text-sky-400" />
            {t("Job Openings Management", "Gestão de Vagas & Posições")}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {t(
              "Activate or deactivate recruitment listings. Open positions accept public applications on the careers portal.",
              "Ative ou desative vagas abertas. Vagas ativas aceitam candidaturas públicas no portal de carreiras."
            )}
          </p>
        </div>
      </div>

      {/* Role Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roles.map((role) => {
          const counts = getRoleCounts(role.id);
          const Icon = getRoleIcon(role.id);
          const isToggling = togglingRole === role.id;

          return (
            <div
              key={role.id}
              className={`p-5 rounded-2xl border transition-all ${
                role.open
                  ? "bg-[#0d121f] border-emerald-500/20 shadow-lg shadow-emerald-500/5"
                  : "bg-[#0d121f]/60 border-white/[0.06] opacity-75 hover:opacity-100"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                      role.open
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : "bg-white/[0.04] border-white/10 text-slate-400"
                    }`}
                  >
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {lang === "pt" ? role.pt : role.en}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.65rem] font-bold ${
                          role.open
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-slate-500/20 text-slate-400 border border-slate-500/30"
                        }`}
                      >
                        {role.open ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {t("OPEN FOR APPLICATIONS", "ABERTO A CANDIDATURAS")}
                          </>
                        ) : (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                            {t("CLOSED", "FECHADO")}
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Toggle Switch */}
                <button
                  type="button"
                  onClick={() => handleToggle(role.id, role.open)}
                  disabled={isToggling}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    role.open ? "bg-emerald-500" : "bg-slate-700"
                  } ${isToggling ? "opacity-50" : ""}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      role.open ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-black/40 border border-white/[0.05] mb-4">
                <div className="text-center">
                  <div className="text-[0.65rem] text-slate-400 uppercase font-semibold tracking-wider">
                    {t("Received", "Recebidas")}
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5 font-mono">
                    {counts.total}
                  </div>
                </div>
                <div className="text-center border-x border-white/[0.06]">
                  <div className="text-[0.65rem] text-slate-400 uppercase font-semibold tracking-wider">
                    {t("Shortlisted", "Pré-seleção")}
                  </div>
                  <div className="text-sm font-bold text-sky-400 mt-0.5 font-mono">
                    {counts.shortlisted}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[0.65rem] text-slate-400 uppercase font-semibold tracking-wider">
                    {t("Booked", "Agendados")}
                  </div>
                  <div className="text-sm font-bold text-emerald-400 mt-0.5 font-mono">
                    {counts.booked}
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onSelectRoleFilter(role.id)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white text-xs font-semibold border border-white/[0.06] transition-colors cursor-pointer"
                >
                  <Users size={14} />
                  <span>{t("View Applicants in Pipeline", "Ver Candidaturas no Funil")}</span>
                  <ArrowUpRight size={13} className="text-slate-500" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
