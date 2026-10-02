"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CandidatesTableView } from "@/components/admin/recruitment/CandidatesTableView";
import { Application, Role, roles as defaultRoles, ArchiveReason } from "@/lib/careers";
import OverwatchOrbitLoader from "@/components/admin/ui/OverwatchOrbitLoader";

export default function CandidatesPage() {
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
      console.error("Failed to load candidates:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBulkStatusChange = async (ids: string[], status: string) => {
    try {
      const res = await fetch("/api/admin/careers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "bulk_status", ids, status }),
      });
      if (res.ok) {
        await loadData();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("admin:careers-updated"));
        }
      }
    } catch (err) {
      console.error("Bulk status error:", err);
    }
  };

  const handleBulkArchive = async (ids: string[], reason: string) => {
    try {
      const res = await fetch("/api/admin/careers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "bulk_status", ids, status: "archived" }),
      });
      if (res.ok) {
        await loadData();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("admin:careers-updated"));
        }
      }
    } catch (err) {
      console.error("Bulk archive error:", err);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <OverwatchOrbitLoader label="A carregar candidatos..." size="md" />
      </div>
    );
  }

  return (
    <CandidatesTableView
      applications={applications}
      roles={roles}
      onBulkStatusChange={handleBulkStatusChange}
      onBulkArchive={handleBulkArchive}
    />
  );
}
