"use client";

import { useSearchParams } from "next/navigation";
import RecruitmentWorkspace from "@/components/admin/recruitment/RecruitmentWorkspace";
import React, { useState, useEffect } from "react";
import { CommunicationsView } from "@/components/admin/recruitment/CommunicationsView";
import { Application } from "@/lib/careers";
import OverwatchOrbitLoader from "@/components/admin/ui/OverwatchOrbitLoader";

export default function CommunicationsPage() {
  const params = useSearchParams();
  const workspaceRole = params.get("role"), cohortId = params.get("cohortId");
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/careers?t=${Date.now()}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setApplications(data.applications || []);
        }
      } catch (err) {
        console.error("Failed to load communications data:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (cohortId || (workspaceRole && workspaceRole !== "all")) return <RecruitmentWorkspace key={cohortId || workspaceRole} cohortId={cohortId || undefined} roleId={workspaceRole || undefined} initialTab="communications" />;

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <OverwatchOrbitLoader label="A carregar comunicações..." size="md" />
      </div>
    );
  }

  return <CommunicationsView applications={applications} roleId={workspaceRole && workspaceRole !== "all" ? workspaceRole : undefined} cohortId={cohortId || undefined} />;
}
