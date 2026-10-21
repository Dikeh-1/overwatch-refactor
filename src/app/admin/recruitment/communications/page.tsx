"use client";

import { useSearchParams } from "next/navigation";
import RecruitmentWorkspace from "@/components/admin/recruitment/RecruitmentWorkspace";
import React, { useState, useEffect } from "react";
import { CommunicationsView } from "@/components/admin/recruitment/CommunicationsView";
import { Application } from "@/lib/careers";
import OverwatchOrbitLoader from "@/components/admin/ui/OverwatchOrbitLoader";

export default function CommunicationsPage() {
  const workspaceRole = useSearchParams().get("role");
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

  if (workspaceRole && workspaceRole !== "all") return <RecruitmentWorkspace key={workspaceRole} roleId={workspaceRole} initialTab="communications" />;

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <OverwatchOrbitLoader label="A carregar comunicações..." size="md" />
      </div>
    );
  }

  return <CommunicationsView applications={applications} />;
}
