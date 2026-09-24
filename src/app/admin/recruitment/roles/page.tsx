"use client";

import React, { useState, useEffect, useCallback } from "react";
import { JobRolesView } from "@/components/admin/recruitment/JobRolesView";
import { Application, Role, roles as defaultRoles } from "@/lib/careers";
import { Loader2 } from "lucide-react";

export default function RolesPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [roles, setRoles] = useState<Role[]>(defaultRoles);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/careers?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setApplications(data.applications || []);
        if (data.roles) setRoles(data.roles);
      }
    } catch (err) {
      console.error("Failed to load roles data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleRole = async (roleId: string, open: boolean) => {
    try {
      const res = await fetch("/api/admin/careers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "role", id: roleId, open }),
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error("Toggle role error:", err);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <JobRolesView
      roles={roles}
      applications={applications}
      onToggleRole={handleToggleRole}
    />
  );
}
