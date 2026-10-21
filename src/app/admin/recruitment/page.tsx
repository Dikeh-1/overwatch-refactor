"use client";

import { useRecruitmentRefresh } from "@/components/admin/hooks/useRecruitmentRefresh";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Application } from "@/lib/careers";
import type { CareerCohort, CareerRoleDefinition } from "@/lib/careers-models";
import RecruitmentWorkspace from "@/components/admin/recruitment/RecruitmentWorkspace";
import { RecruitmentOverviewView } from "@/components/admin/recruitment/RecruitmentOverviewView";
import { useAdminLanguage } from "@/components/admin/shell/AdminLanguageContext";
import OverwatchOrbitLoader from "@/components/admin/ui/OverwatchOrbitLoader";

type Data = { applications: Application[]; roles: CareerRoleDefinition[]; cohorts: CareerCohort[] };
function GlobalOverview() {
  const { t } = useAdminLanguage();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const load = useCallback(async (signal?: AbortSignal) => {
    if (signal?.aborted) return;
    const request = ++generation.current;
    try {
      const response = await fetch("/api/admin/careers", { cache: "no-store", signal });
      const payload = await response.json();
      if (!response.ok || !Array.isArray(payload.applications) || !Array.isArray(payload.roles) || !Array.isArray(payload.cohorts)) throw new Error(payload.error || "Unable to load dashboard records");
      if (request === generation.current && !signal?.aborted) { setData(payload); setError(""); }
    } catch (e) {
      if (request === generation.current && !signal?.aborted) setError(e instanceof Error ? e.message : "Unable to load dashboard records");
    }
  }, []);
  useRecruitmentRefresh(load);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => load(controller.signal));
    const refresh = () => { void Promise.resolve().then(() => load(controller.signal)); };
    window.addEventListener("admin:careers-updated", refresh);
    return () => { controller.abort(); window.removeEventListener("admin:careers-updated", refresh); };
  }, [load]);
  if (error) return <div role="alert" className="rounded-xl border border-red-200 bg-white p-6">{error} <button className="underline" onClick={() => void load()}>{t("Retry", "Tentar novamente")}</button></div>;
  if (!data) return <div role="status" className="flex min-h-[60vh] items-center justify-center"><OverwatchOrbitLoader label={t("Loading recruitment overview…", "A carregar visão geral…")}/></div>;
  return <RecruitmentOverviewView applications={data.applications} roleDefs={data.roles} cohorts={data.cohorts} onRefresh={load}/>;
}
export default function RecruitmentOverviewPage() {
  const roleId = useSearchParams().get("role");
  return roleId && roleId !== "all" ? <RecruitmentWorkspace key={roleId} roleId={roleId}/> : <GlobalOverview/>;
}
