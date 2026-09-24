"use client";

import React, { useState, useEffect, useCallback } from "react";
import { TestingAttendanceView } from "@/components/admin/recruitment/TestingAttendanceView";
import GateCheckInModal from "@/components/admin/GateCheckInModal";
import { Application, DEFAULT_TEST_SLOTS } from "@/lib/careers";
import { Loader2 } from "lucide-react";

export default function TestingPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [broadcastSlots, setBroadcastSlots] = useState<string[]>([...DEFAULT_TEST_SLOTS]);
  const [slotQuota, setSlotQuota] = useState<number>(15);
  const [loading, setLoading] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [appsRes, slotsRes] = await Promise.all([
        fetch(`/api/admin/careers?t=${Date.now()}`, { cache: "no-store" }),
        fetch("/api/admin/careers/test-slots"),
      ]);

      if (appsRes.ok) {
        const data = await appsRes.json();
        setApplications(data.applications || []);
      }

      if (slotsRes.ok) {
        const data = await slotsRes.json();
        if (Array.isArray(data.slots) && data.slots.length > 0) setBroadcastSlots(data.slots);
        if (typeof data.quota === "number" && data.quota > 0) setSlotQuota(data.quota);
      }
    } catch (err) {
      console.error("Failed to load testing data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleAttendance = async (candidateId: string, attended: boolean) => {
    try {
      const res = await fetch("/api/careers/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: candidateId,
          action: attended ? "check_in" : "mark_absent",
          force: true,
        }),
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error("Attendance toggle error:", err);
    }
  };

  const handleDispatchGatePasses = async () => {
    const confirm = window.confirm(
      "Deseja enviar os Passes Oficiais de Acesso com código QR por email para os candidatos agendados?"
    );
    if (!confirm) return;

    try {
      const res = await fetch("/api/admin/careers/dispatch-gate-passes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Passes disparados com sucesso: ${data.count || 0} emails enviados.`);
        await loadData();
      } else {
        alert(data.error || "Erro no envio de passes");
      }
    } catch (err: any) {
      alert(err.message || "Erro de rede");
    }
  };

  const handleSaveSlots = async (slots: string[], quota: number): Promise<boolean> => {
    try {
      const res = await fetch("/api/admin/careers/test-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots, quota }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.slots)) setBroadcastSlots(data.slots);
        if (typeof data.quota === "number") setSlotQuota(data.quota);
        await loadData();
        return true;
      }
      return false;
    } catch {
      return false;
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
    <>
      <TestingAttendanceView
        applications={applications}
        lang="pt"
        slotQuota={slotQuota}
        broadcastSlots={broadcastSlots}
        onToggleAttendance={handleToggleAttendance}
        onOpenGateScanner={() => setScannerOpen(true)}
        onDispatchGatePasses={handleDispatchGatePasses}
        onSaveSlots={handleSaveSlots}
      />

      <GateCheckInModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onCheckInSuccess={() => loadData()}
        lang="pt"
      />
    </>
  );
}
