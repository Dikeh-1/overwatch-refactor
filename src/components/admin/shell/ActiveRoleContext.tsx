"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import type { CareerRoleDefinition, PipelineStageKey } from "@/lib/careers-models";
import { roles as defaultLegacyRoles, Application } from "@/lib/careers";

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

export const ActiveRoleProvider: React.FC<{
  children: React.ReactNode;
  applications?: Application[];
}> = ({ children, applications = [] }) => {
  const [roles, setRoles] = useState<CareerRoleDefinition[]>([]);
  const [activeRoleId, setActiveRoleIdState] = useState<string>("cctv");
  const [loading, setLoading] = useState(true);

  // Load roles from API
  const refreshRoles = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/careers/roles-manager?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.roles && Array.isArray(data.roles) && data.roles.length > 0) {
          setRoles(data.roles);
          return;
        }
      }
    } catch {
      // fallback
    }

    // Default roles fallback
    const defaults: CareerRoleDefinition[] = defaultLegacyRoles.map((r) => {
      const isTechMgr = r.id === "cctv_technical_manager";
      const stages: PipelineStageKey[] = isTechMgr
        ? ["applications", "screening", "interview", "hired"]
        : ["applications", "screening", "testing", "gate_checkin", "next_phase", "interview", "hired"];

      return {
        id: r.id,
        en: r.en,
        pt: r.pt,
        department: isTechMgr ? "Engenharia Técnica" : "Operações",
        open: r.open,
        activeCohortId: r.open ? `${r.id}_initial_cohort` : null,
        pipelineStages: stages,
        screeningRules: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });
    setRoles(defaults);
  }, []);

  useEffect(() => {
    refreshRoles().finally(() => setLoading(false));
  }, [refreshRoles]);

  // Read saved active role ID from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("overwatch_active_role");
      if (saved) {
        setActiveRoleIdState(saved);
      }
    } catch {}
  }, []);

  const setActiveRoleId = (id: string) => {
    setActiveRoleIdState(id);
    try {
      localStorage.setItem("overwatch_active_role", id);
    } catch {}
  };

  const activeRole = useMemo(() => {
    if (!activeRoleId || activeRoleId === "all") {
      // Default to first open role or first role
      return roles.find((r) => r.open) || roles[0] || null;
    }
    return roles.find((r) => r.id === activeRoleId) || null;
  }, [roles, activeRoleId]);

  // Compute stats per role
  const roleStats = useMemo(() => {
    const stats: Record<string, RoleStats> = {};

    roles.forEach((r) => {
      const roleApps = applications.filter(
        (a) => a.role === r.id || (r.id === "cctv" && !a.role),
      );
      stats[r.id] = {
        total: roleApps.length,
        active: roleApps.filter((a) => a.status !== "archived" && a.status !== "rejected").length,
        testing: roleApps.filter((a) => Boolean(a.testSlot) && a.status !== "archived").length,
        nextPhase: roleApps.filter(
          (a) =>
            a.status === "next_phase_selected" ||
            a.status === "next_phase_invited" ||
            a.status === "interest_confirmed",
        ).length,
      };
    });

    return stats;
  }, [roles, applications]);

  return (
    <ActiveRoleContext.Provider
      value={{
        roles,
        activeRoleId,
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
