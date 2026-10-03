"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FormBuilderStudioView } from "@/components/admin/recruitment/FormBuilderStudioView";
import type { CareerRoleDefinition, CareerCohort } from "@/lib/careers-models";
import { Application } from "@/lib/careers";
import { useAdminLanguage } from "@/components/admin/shell/AdminLanguageContext";
import OverwatchOrbitLoader from "@/components/admin/ui/OverwatchOrbitLoader";

export default function FormBuilderPage() {
  const { t } = useAdminLanguage();
  const [roleDefs, setRoleDefs] = useState<CareerRoleDefinition[]>([]);
  const [cohorts, setCohorts] = useState<CareerCohort[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [careersRes, managerRes] = await Promise.all([
        fetch(`/api/admin/careers?t=${Date.now()}`, { cache: "no-store" }),
        fetch(`/api/admin/careers/roles-manager?t=${Date.now()}`, { cache: "no-store" }),
      ]);

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
      console.error("Failed to load form builder data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

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
      throw new Error(err.error || "Failed to save form configuration");
    }
    const data = await res.json();
    if (data.role) {
      setRoleDefs((prev) =>
        prev.map((r) => (r.id === data.role.id ? data.role : r))
      );
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <OverwatchOrbitLoader
          label={t(
            "Loading Application Form Builder Studio...",
            "A carregar Estúdio de Construtor de Formulário..."
          )}
          size="md"
        />
      </div>
    );
  }

  return (
    <FormBuilderStudioView
      initialRoles={roleDefs}
      cohorts={cohorts}
      applications={applications}
      onSaveRole={handleSaveRole}
      onRefresh={loadData}
    />
  );
}
