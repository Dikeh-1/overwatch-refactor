"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { CandidateProfileView } from "@/components/admin/recruitment/CandidateProfileView";
import { Application, Role, roles as defaultRoles, ArchiveReason } from "@/lib/careers";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [candidate, setCandidate] = useState<Application | null>(null);
  const [roles, setRoles] = useState<Role[]>(defaultRoles);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCandidate = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/admin/careers?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const found = (data.applications || []).find((a: Application) => a.id === id);
        if (found) {
          setCandidate(found);
        } else {
          setError("Candidate record not found in database.");
        }
        if (data.roles) setRoles(data.roles);
      } else {
        setError("Failed to retrieve candidate information.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load candidate");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadCandidate();
  }, [loadCandidate]);

  const handleStatusChange = async (candidateId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/admin/careers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "status", id: candidateId, status: newStatus }),
      });
      if (res.ok) {
        await loadCandidate();
      }
    } catch (err) {
      console.error("Status update error:", err);
    }
  };

  const handleArchive = async (candidateId: string, reason: ArchiveReason) => {
    try {
      const res = await fetch("/api/admin/careers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "status", id: candidateId, status: "archived" }),
      });
      if (res.ok) {
        await loadCandidate();
      }
    } catch (err) {
      console.error("Archive error:", err);
    }
  };

  const handleDelete = async (candidateId: string) => {
    try {
      const res = await fetch("/api/admin/careers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [candidateId] }),
      });
      if (res.ok) {
        router.push("/admin/recruitment/candidates");
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center max-w-md mx-auto my-12 space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
          <AlertCircle size={24} />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            {error || "Candidatura não encontrada"}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            O registo solicitado pode ter sido arquivado ou o ID é inválido.
          </p>
        </div>
        <Link
          href="/admin/recruitment/candidates"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-slate-900 text-white text-xs font-semibold"
        >
          <ArrowLeft size={13} />
          <span>Voltar à Lista</span>
        </Link>
      </div>
    );
  }

  return (
    <CandidateProfileView
      candidate={candidate}
      roles={roles}
      onStatusChange={handleStatusChange}
      onArchive={handleArchive}
      onDelete={handleDelete}
    />
  );
}
