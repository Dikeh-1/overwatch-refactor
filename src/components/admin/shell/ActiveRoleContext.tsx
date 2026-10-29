"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { sameRole, isTerminal, recruitmentMetrics } from "@/lib/careers-workflow";
import type { CareerRoleDefinition } from "@/lib/careers-models";
import { Application } from "@/lib/careers";

interface RoleStats {
  total: number;
  active: number;
  testing: number;
  nextPhase: number;
}

interface ActiveRoleContextType {
  roles: CareerRoleDefinition[];
  activeRoleId: string;
  activeRole: CareerRoleDefinition | null;
  setActiveRoleId: (id: string) => void;
  roleStats: Record<string, RoleStats>;
  loading: boolean;
  refreshRoles: () => Promise<void>;
}

const ActiveRoleContext = createContext<ActiveRoleContextType>({
  roles: [],
  activeRoleId: "all",
  activeRole: null,
  setActiveRoleId: () => {},
  roleStats: {},
  loading: true,
  refreshRoles: async () => {},
});

const DEFAULT_ROLES: CareerRoleDefinition[] = [
  {
    id: "cctv_technical_manager",
    en: "CCTV Installation & Technical Manager",
    pt: "Gestor Técnico e Instalação de CCTV",
    department: "Engenharia Técnica",
    open: true,
    activeCohortId: "cctv_technical_manager_initial_cohort",
    pipelineStages: ["applications", "screening", "testing", "interview", "hired"],
    screeningRules: [],
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  },
  {
    id: "cctv",
    en: "CCTV Operator",
    pt: "Operadora de CCTV",
    department: "Operações de Segurança",
    open: true,
    activeCohortId: "cctv_cohort",
    pipelineStages: ["applications", "screening", "testing", "gate_checkin", "next_phase", "interview", "hired"],
    screeningRules: [],
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  },
  {
    id: "operations",
    en: "Security Operations Manager",
    pt: "Gestor de Operações de Segurança",
    department: "Operações de Segurança",
    open: false,
    activeCohortId: null,
    pipelineStages: ["applications", "screening", "interview", "hired"],
    screeningRules: [],
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  },
  {
    id: "technical",
    en: "Technical Support Specialist",
    pt: "Especialista de Suporte Técnico",
    department: "Engenharia Técnica",
    open: false,
    activeCohortId: null,
    pipelineStages: ["applications", "screening", "interview", "hired"],
    screeningRules: [],
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  },
  {
    id: "sales",
    en: "Sales & Business Development",
    pt: "Vendas e Desenvolvimento de Negócios",
    department: "Comercial",
    open: false,
    activeCohortId: null,
    pipelineStages: ["applications", "screening", "interview", "hired"],
    screeningRules: [],
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  },
];

export const ActiveRoleProvider: React.FC<{
  children: React.ReactNode;
  applications?: Application[];
}> = ({ children, applications = [] }) => {
  const [roles, setRoles] = useState<CareerRoleDefinition[]>(DEFAULT_ROLES);
  const [activeRoleId, setActiveRoleIdState] = useState<string>("cctv");
  const [loading, setLoading] = useState(true);

  // Load roles from API
  const refreshRoles = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/careers/roles-manager?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.roles)) {
          setRoles(data.roles);
          return;
        }
      }
    } catch {
      // fallback
    }

    // Retain the last confirmed role states on transient failures. Never invent open roles.

  }, []);

  useEffect(() => {
    refreshRoles().finally(() => setLoading(false));
    const refresh = () => { void refreshRoles(); };
    window.addEventListener("admin:careers-updated", refresh);
    return () => window.removeEventListener("admin:careers-updated", refresh);
  }, [refreshRoles]);

  // Read saved active role ID from localStorage or sync with first open role
  useEffect(() => {
    try {
      const saved = localStorage.getItem("overwatch_active_role");
      if (saved) {
        setActiveRoleIdState(saved);
      } else if (roles.length > 0) {
        const firstOpen = roles.find((r) => r.open);
        if (firstOpen) setActiveRoleIdState(firstOpen.id);
      }
    } catch {}
  }, [roles]);

  const setActiveRoleId = useCallback((id: string) => {
    setActiveRoleIdState(id);
    try {
      localStorage.setItem("overwatch_active_role", id);
    } catch {}
  }, []);

  const activeRole = useMemo(() => {
    if (!activeRoleId || activeRoleId === "all") {
      // Default to first open role or first role
      return roles.find((r) => r.open) || null;
    }
    return roles.find((r) => r.id === activeRoleId && r.open) || roles.find((r) => r.open) || null;
  }, [roles, activeRoleId]);

  // Compute stats per role
  const roleStats = useMemo(() => {
    const stats: Record<string, RoleStats> = {};

    roles.forEach((r) => {
      const roleApps = applications.filter(a => sameRole(a.role, r.id) && (!r.open || !r.activeCohortId || a.workspaceCohortId === r.activeCohortId));
      const metrics = recruitmentMetrics(roleApps);
      stats[r.id] = { total: metrics.total, active: roleApps.filter(a => !isTerminal(a)).length, testing: metrics.booked, nextPhase: metrics.nextPhase };
    });

    return stats;
  }, [roles, applications]);

  return (
    <ActiveRoleContext.Provider
      value={{
        roles,
        activeRoleId: activeRole?.id || "all",
        activeRole,
        setActiveRoleId,
        roleStats,
        loading,
        refreshRoles,
      }}
    >
      {children}
    </ActiveRoleContext.Provider>
  );
};

export const useActiveRole = () => useContext(ActiveRoleContext);

/** Give embedded open/closed cohort views the same role capabilities without changing the sidebar selection. */
export function CohortRoleProvider({ role, children }: { role: CareerRoleDefinition; children: React.ReactNode }) {
  const parent = useActiveRole();
  const rolesList = useMemo(() => [role], [role]);
  const noopSetRole = useCallback(() => {}, []);
  const value = useMemo(() => ({ ...parent, activeRoleId: role.id, activeRole: role, roles: rolesList, setActiveRoleId: noopSetRole }), [parent, role, rolesList, noopSetRole]);
  return <ActiveRoleContext.Provider value={value}>{children}</ActiveRoleContext.Provider>;
}
