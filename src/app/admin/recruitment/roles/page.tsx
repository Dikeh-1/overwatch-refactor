"use client";

import { useRecruitmentRefresh } from "@/components/admin/hooks/useRecruitmentRefresh";
import React, { useState, useEffect, useCallback } from "react";
import { JobRolesView } from "@/components/admin/recruitment/JobRolesView";
import type { CareerRoleDefinition, CareerCohort } from "@/lib/careers-models";
import { Application } from "@/lib/careers";
import { useAdminLanguage } from "@/components/admin/shell/AdminLanguageContext";
import OverwatchOrbitLoader from "@/components/admin/ui/OverwatchOrbitLoader";

export default function RolesPage() {
  const { t } = useAdminLanguage();
  const [roleDefs, setRoleDefs] = useState<CareerRoleDefinition[]>([]);
  const [cohorts, setCohorts] = useState<CareerCohort[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setError("");
    try {
      const [careersRes, managerRes] = await Promise.all([
        fetch(`/api/admin/careers?t=${Date.now()}`, { cache: "no-store" }),
        fetch(`/api/admin/careers/roles-manager?t=${Date.now()}`, { cache: "no-store" }),
      ]);

      if (!careersRes.ok || !managerRes.ok) throw new Error("Unable to load role records. Please retry.");
      if (careersRes.ok) {
        const cData = await careersRes.json();
        setApplications(cData.applications || []);
      }

      if (managerRes.ok) {
        const mData = await managerRes.json();
        if (mData.roles) setRoleDefs(mData.roles);
        if (mData.cohorts) setCohorts(mData.cohorts);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load roles");
    } finally {
      setLoading(false);
    }
  }, []);

  useRecruitmentRefresh(() => loadData());
  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveRole = async (role: CareerRoleDefinition) => {
    const res = await fetch("/api/admin/careers/roles-manager", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_or_update_role", role }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to save role");
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    const res = await fetch("/api/admin/careers/roles-manager", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_role", roleId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to delete role");
    }
  };

  const handleOpenCohort = async (roleId: string, cohortName?: string) => {
    const res = await fetch("/api/admin/careers/roles-manager", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "open_role", roleId, cohortName }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to open role cohort");
    }
  };

  const handleCloseCohort = async (roleId: string, notes?: string) => {
    const res = await fetch("/api/admin/careers/roles-manager", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "close_role", roleId, notes }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to close role cohort");
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <OverwatchOrbitLoader
          label={t("Loading job roles & pipelines...", "A carregar vagas e configurações...")}
          size="md"
        />
      </div>
    );
  }

  if (error) return <div role="alert" className="rounded-xl border border-red-200 p-6">{error} <button className="underline" onClick={() => void loadData()}>{t("Retry", "Tentar novamente")}</button></div>;

  return (
    <JobRolesView
      roleDefs={roleDefs}
      cohorts={cohorts}
      applications={applications}
      onRefresh={loadData}
      onSaveRole={handleSaveRole}
      onDeleteRole={handleDeleteRole}
      onOpenCohort={handleOpenCohort}
      onCloseCohort={handleCloseCohort}
    />
  );
}
