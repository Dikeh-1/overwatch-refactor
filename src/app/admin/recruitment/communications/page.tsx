"use client";

import React, { useState, useEffect } from "react";
import { CommunicationsView } from "@/components/admin/recruitment/CommunicationsView";
import { Application } from "@/lib/careers";
import { Loader2 } from "lucide-react";

export default function CommunicationsPage() {
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

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return <CommunicationsView applications={applications} />;
}
