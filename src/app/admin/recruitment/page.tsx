"use client";

import React, { useState, useEffect, useCallback } from "react";
import { RecruitmentOverviewView } from "@/components/admin/recruitment/RecruitmentOverviewView";
import { Application, Role, roles as defaultRoles } from "@/lib/careers";
import type { CareerRoleDefinition, CareerCohort } from "@/lib/careers-models";
import { useAdminLanguage } from "@/components/admin/shell/AdminLanguageContext";
import OverwatchOrbitLoader from "@/components/admin/ui/OverwatchOrbitLoader";

export default function RecruitmentOverviewPage() {
  const { t } = useAdminLanguage();
  const [applications, setApplications] = useState<Application[]>([]);
  const [roles, setRoles] = useState<Role[]>(defaultRoles);
  const [roleDefs, setRoleDefs] = useState<CareerRoleDefinition[]>([]);
  const [cohorts, setCohorts] = useState<CareerCohort[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [careersRes, managerRes] = await Promise.all([
        fetch(`/api/admin/careers?t=${Date.now()}`, { cache: "no-store" }),
        fetch(`/api/admin/careers/roles-manager?t=${Date.now()}`, { cache: "no-store" }),
      ]);

      if (careersRes.ok) {
        const data = await careersRes.json();
        setApplications(data.applications || []);
        if (data.roles) setRoles(data.roles);
      }

      if (managerRes.ok) {
        const mData = await managerRes.json();
        if (mData.roles) setRoleDefs(mData.roles);
        if (mData.cohorts) setCohorts(mData.cohorts);
      }
    } catch (err) {
      console.error("Failed to load recruitment overview data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <OverwatchOrbitLoader
          label={t("Loading recruitment command center...", "A carregar operações de recrutamento...")}
          size="md"
        />
      </div>
    );
  }

  return (
    <RecruitmentOverviewView
      applications={applications}
      roles={roles}
      roleDefs={roleDefs}
      cohorts={cohorts}
      onRefresh={load}
    />
  );
}
