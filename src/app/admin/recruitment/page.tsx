"use client";

import React, { useState, useEffect } from "react";
import { RecruitmentOverviewView } from "@/components/admin/recruitment/RecruitmentOverviewView";
import { Application, Role, roles as defaultRoles } from "@/lib/careers";
import { Loader2 } from "lucide-react";

export default function RecruitmentOverviewPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [roles, setRoles] = useState<Role[]>(defaultRoles);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/careers?t=${Date.now()}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setApplications(data.applications || []);
          if (data.roles) setRoles(data.roles);
        }
      } catch (err) {
        console.error("Failed to load recruitment overview data:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <RecruitmentOverviewView
      applications={applications}
      roles={roles}
      lang="pt"
    />
  );
}
