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

  // Read saved active role ID from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("overwatch_active_role");
      if (saved) {
        setActiveRoleIdState(saved);
      }
    } catch {}
  }, []);

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
  return <ActiveRoleContext.Provider value={{ ...parent, activeRoleId: role.id, activeRole: role, roles: [role], setActiveRoleId: () => {} }}>{children}</ActiveRoleContext.Provider>;
}
